import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ApiError, registerDeviceToken, removeDeviceToken } from '@spot/shared';
import { authClient } from '@/api/client';
import { onSessionCleared } from '@/api/session-events';

// The id the API gave this device's token, so logout can remove it.
const DEVICE_TOKEN_ID_KEY = 'spot_device_token_id';

// Home remounts on every navigation back (the root renders a Slot), so register once per session.
// Any session end resets it, not only the logout button: the next account must claim the token.
let registeredThisSession = false;
onSessionCleared(() => {
  registeredThisSession = false;
});

/**
 * Registers this device's native push token (FCM on Android) for the signed-in user. Best effort:
 * on web, in Expo Go (no remote push since SDK 53), with the permission denied or with a failed
 * call, the user just doesn't get pushes. The backend reassigns a token another account had.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
  if (registeredThisSession) return;
  registeredThisSession = true;

  let step = 'permission';
  try {
    // Android 13+ only shows the permission prompt once a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return;

    step = 'native token';
    const { data } = await Notifications.getDevicePushTokenAsync();
    step = 'API registration';
    const registered = await registerDeviceToken(authClient, {
      token: String(data),
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
    step = 'saving the token id';
    await AsyncStorage.setItem(DEVICE_TOKEN_ID_KEY, registered.id);
  } catch (error) {
    console.warn(`Push registration failed at: ${step}.`, error);
  }
}

/**
 * Removes this device's token before logging out, so it stops getting the account's pushes. Must run
 * while the session is still valid. Best effort: the id is only forgotten once the token is gone (or
 * was already gone, 404, or belongs to another account, 403), so a failed removal is retried on the next logout from this device.
 */
export async function unregisterPush(): Promise<void> {
  try {
    const deviceTokenId = await AsyncStorage.getItem(DEVICE_TOKEN_ID_KEY);
    if (!deviceTokenId) return;
    try {
      await removeDeviceToken(authClient, deviceTokenId);
    } catch (error) {
      // 404: already gone. 403: another account claimed the token since, so it's no longer ours to remove.
      if (!(error instanceof ApiError && (error.status === 404 || error.status === 403))) throw error;
    }
    await AsyncStorage.removeItem(DEVICE_TOKEN_ID_KEY);
  } catch (error) {
    console.warn('Push token removal failed; it will be retried on the next logout.', error);
  }
}
