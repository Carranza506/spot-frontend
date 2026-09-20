# mobile-expo (spike)

Spike app verifying that Expo works inside this pnpm monorepo and can consume
`@spot/shared`. Created with `create-expo-app` (default TypeScript template),
trimmed to a single login screen.

## Get started

From the repo root:

```bash
pnpm install
pnpm --filter mobile-expo start
```

Copy `.env.example` to `.env` first and set `EXPO_PUBLIC_API_BASE_URL`.
