import type { ConfigContext, ExpoConfig } from 'expo/config';

// Push on Android needs the Firebase app config (google-services.json). It's kept out of the repo:
// set GOOGLE_SERVICES_JSON to its path when building a development build. Without it the app still
// builds and runs, it just can't get a push token.
export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    plugins: [...(config.plugins ?? []), 'expo-font', 'expo-status-bar'],
    android: { ...config.android, googleServicesFile: process.env.GOOGLE_SERVICES_JSON },
  }) as ExpoConfig;