import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'spot_access_token';
const REFRESH_TOKEN_KEY = 'spot_refresh_token';

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function getTokens(): Promise<AuthTokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(ACCESS_TOKEN_KEY),
    AsyncStorage.getItem(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setTokens(tokens: AuthTokenPair): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken),
    AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
  ]);
}
