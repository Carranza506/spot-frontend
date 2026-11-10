# Spot — Frontend

Spot's frontend: a pnpm workspace monorepo containing the web dashboard (for businesses) and the mobile app (for consumers), plus a shared package for types/DTOs used by both.

## Prerequisites

- [Node.js 24 LTS](https://nodejs.org/) — verify with `node --version`
- pnpm, enabled via Corepack (bundled with Node.js):
```bash
  corepack enable
  corepack prepare pnpm@latest --activate
```
  Verify with `pnpm --version`
- For Android development: [Android Studio](https://developer.android.com/studio) (Android SDK)
- For iOS development: Xcode (Mac only)
- [GitHub CLI](https://cli.github.com/) (`gh`) if you'll be creating issues/PRs from the terminal
- Editor: VS Code (or your preferred editor)

## Clone the repo

```bash
git clone https://github.com/Carranza506/spot-frontend.git
cd spot-frontend
```

## Install dependencies

Run this once, from the repo root (not from inside an app's folder). This installs dependencies for every workspace package — `web`, `mobile-expo`, `mobile` and `shared` — together:

```bash
pnpm install
```

## Project structure

```
apps/
  web/          -> React + Vite web app (business dashboard)
  mobile-expo/  -> Expo + expo-router app (consumer app) — the official mobile app
  mobile/       -> bare React Native template from the initial setup; not used
packages/
  shared/       -> Shared TypeScript types/DTOs matching the backend API contract
pnpm-workspace.yaml
package.json
```

## Running the web app

```bash
pnpm dev:web
```

This starts the Vite dev server. The terminal will print the local URL (usually `http://localhost:5173`).

## Running the mobile app

The official consumer app is `apps/mobile-expo` (Expo + expo-router). `apps/mobile` is the bare
React Native template from the initial setup and isn't used.

Create its env file once, from the template:

```bash
cp apps/mobile-expo/.env.example apps/mobile-expo/.env
```

Then set `EXPO_PUBLIC_API_BASE_URL` to this machine's LAN IPv4 address, so a phone on the same
Wi-Fi reaches the Gateway from `spot-backend`. Run `ipconfig` on Windows (or `ifconfig` on
macOS/Linux) and look for the IPv4 address:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:5195/api/v1
```

`localhost` only works when the app runs on this same machine, as it does in the browser. `.env`
is git-ignored: never commit it.

Then start Expo from the repo root:

```bash
pnpm start:mobile
```

Expo prints a QR code to open the app in Expo Go. In that same terminal, press `a` for an Android
emulator, `i` for an iOS simulator (Mac only), or `w` to open it in the browser.

## Environment variables / API configuration

The API base URL points at the local Gateway from `spot-backend` (or a deployed environment) and is
set per app in a git-ignored `.env`, copied from that app's `.env.example`:

- `apps/web/.env` — `VITE_API_BASE_URL`; the default `/api/v1` goes through Vite's dev proxy to `localhost:5195`
- `apps/mobile-expo/.env` — `EXPO_PUBLIC_API_BASE_URL`; see "Running the mobile app" above

## Shared types (`packages/shared`)

Types and DTOs that mirror `contracts/spot-api.yaml` from `spot-backend` should live here, so both `web` and `mobile` consume the exact same shapes instead of duplicating type definitions. Import it in either app as `@spot/shared`.

## Team workflow

This repo follows a `feature branch -> develop -> main` flow, enforced by branch protection:

- Create your work in a branch off `develop`: `feature/short-description` or `fix/short-description`
- Open a PR into `develop` — **requires 2 approving reviews** before it can be merged
- Once `develop` is stable, a PR from `develop` into `main` also **requires 2 approving reviews**
- No direct pushes are allowed to either `main` or `develop`

## Team conventions

- Commits: short, descriptive messages in English
- Cross-cutting changes to `packages/shared` should be flagged to the team before merging, since they affect both `web` and `mobile`
- Check the GitHub Project board for assigned issues and their acceptance criteria before starting work