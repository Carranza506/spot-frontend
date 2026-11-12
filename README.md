# Spot — Frontend

Spot's frontend: a pnpm workspace monorepo containing the web dashboard (for businesses) and the mobile app (for consumers), plus a shared package for types/DTOs used by both.

## Quick start (end to end)

This is part 2 of 2. **First start the backend** with the
[spot-backend quick start](https://github.com/Carranza506/spot-backend#quick-start-from-a-clean-machine):
the API must be answering at `http://localhost:5195`, with its demo accounts seeded.

**You need:** [Node.js](https://nodejs.org/) 22 or newer, and pnpm, enabled once with
`corepack enable` (it comes with Node). For the mobile app on a phone, the
[Expo Go](https://expo.dev/go) app, for the same Expo SDK as `apps/mobile-expo` (57).

**1. Clone and install** (from the repo root, once)

```bash
git clone https://github.com/Carranza506/spot-frontend.git
cd spot-frontend
pnpm install
```

**2. Web panel (businesses)**

```bash
cp apps/web/.env.example apps/web/.env   # VITE_API_BASE_URL=/api/v1: Vite proxies it to localhost:5195
pnpm dev:web
```

Open **http://localhost:5173** and sign in with **`negocio@spot.test`** / **`Spot1234!`**
(Barbería La U: bookings, a review, services, hours and location already set up).

**3. Mobile app (clients)**

```bash
cp apps/mobile-expo/.env.example apps/mobile-expo/.env
```

Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile-expo/.env`, depending on where the app will run:

| Where | `EXPO_PUBLIC_API_BASE_URL` | Then |
| --- | --- | --- |
| A phone with Expo Go | `http://<this machine's LAN IPv4>:5195/api/v1` (`ipconfig` on Windows) | Scan the QR code. Phone and computer on the same Wi-Fi, and Windows Firewall allowing ports 8081 and 5195 on private networks |
| The browser on this machine | `http://localhost:5195/api/v1` | Press `w`; it opens at http://localhost:8081, the origin the Gateway's CORS allows |

Then start it:

```bash
pnpm --filter mobile-expo start
```

Sign in with **`cliente@spot.test`** / **`Spot1234!`** (María Rodríguez: bookings in every state
at Barbería La U). "Cerca de mí" finds the demo businesses near the UNA campus in Heredia.

The sections below are the detailed reference: project structure, shared types and team workflow.

## Prerequisites

- [Node.js 24 LTS](https://nodejs.org/) — verify with `node --version`
- pnpm, enabled via Corepack (bundled with Node.js):
```bash
  corepack enable
  corepack prepare pnpm@latest --activate
```
  Verify with `pnpm --version`
- Optional, to run `apps/mobile-expo` in an Android emulator: [Android Studio](https://developer.android.com/studio) (Android SDK)
- Optional, to run `apps/mobile-expo` in an iOS simulator: Xcode (Mac only)
- [GitHub CLI](https://cli.github.com/) (`gh`) if you'll be creating issues/PRs from the terminal
- Editor: VS Code (or your preferred editor)

## Clone the repo

```bash
git clone https://github.com/Carranza506/spot-frontend.git
cd spot-frontend
```

## Install dependencies

Run this once, from the repo root (not from inside an app's folder). This installs dependencies for every workspace package — `web`, `mobile-expo` and `shared` — together:

```bash
pnpm install
```

## Project structure

```
apps/
  web/          -> React + Vite web app (business dashboard)
  mobile-expo/  -> Expo + expo-router app (consumer app) — the mobile app
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

The consumer app is `apps/mobile-expo` (Expo + expo-router).

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

Types and DTOs that mirror `contracts/spot-api.yaml` from `spot-backend` should live here, so both `web` and `mobile-expo` consume the exact same shapes instead of duplicating type definitions. Import it in either app as `@spot/shared`.

## Team workflow

This repo follows a `feature branch -> develop -> main` flow, enforced by branch protection:

- Create your work in a branch off `develop`: `feature/short-description` or `fix/short-description`
- Open a PR into `develop` — **requires 2 approving reviews** before it can be merged
- Once `develop` is stable, a PR from `develop` into `main` also **requires 2 approving reviews**
- No direct pushes are allowed to either `main` or `develop`

## Team conventions

- Commits: short, descriptive messages in English
- Cross-cutting changes to `packages/shared` should be flagged to the team before merging, since they affect both `web` and `mobile-expo`
- Check the GitHub Project board for assigned issues and their acceptance criteria before starting work