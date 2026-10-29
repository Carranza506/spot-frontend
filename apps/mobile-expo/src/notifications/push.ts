import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDeviceToken, removeDeviceToken } from '@spot/shared';
import { authClient } from '@/api/client';

// The id the API gave this device's token, so logout can remove it.
const DEVICE_TOKEN_ID_KEY = 'spot_device_token_id';

/**
 * Registers this device's native push token (FCM on Android) for the signed-in user. Best effort:
 * on web, in Expo Go (no remote push since SDK 53), with the permission denied or with a failed
 * call, the user just doesn't get pushes. The backend reassigns a token another account had.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
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

    const { data } = await Notifications.getDevicePushTokenAsync();
    const registered = await registerDeviceToken(authClient, {
      token: String(data),
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
    await AsyncStorage.setItem(DEVICE_TOKEN_ID_KEY, registered.id);
  } catch (error) {
    console.warn('Push registration failed.', error);
  }
}

/**
 * Removes this device's token before logging out, so it stops getting the account's pushes. Must run
 * while the session is still valid. Best effort: if it fails, the next login on this device claims
 * the token for the new account anyway.
 */
export async function unregisterPush(): Promise<void> {
  const deviceTokenId = await AsyncStorage.getItem(DEVICE_TOKEN_ID_KEY);
  if (!deviceTokenId) return;
  try {
    await removeDeviceToken(authClient, deviceTokenId);
  } catch (error) {
    console.warn('Push token removal failed.', error);
  }
  await AsyncStorage.removeItem(DEVICE_TOKEN_ID_KEY);
}
