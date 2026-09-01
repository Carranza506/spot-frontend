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

Run this once, from the repo root (not from inside `apps/web` or `apps/mobile`). This installs dependencies for `web`, `mobile`, and `shared` together, since they're all part of the same pnpm workspace:

```bash
pnpm install
```

## Project structure

```
apps/
  web/       -> React + Vite web app (business dashboard)
  mobile/    -> React Native app (consumer app)
packages/
  shared/    -> Shared TypeScript types/DTOs matching the backend API contract
pnpm-workspace.yaml
package.json
```

## Running the web app

```bash
pnpm dev:web
```

This starts the Vite dev server. The terminal will print the local URL (usually `http://localhost:5173`).

## Running the mobile app

Start the Metro bundler first:

```bash
pnpm start:mobile
```

Then, in a separate terminal, run the app on an emulator/device:

```bash
cd apps/mobile
pnpm android   # for Android
pnpm ios       # for iOS (Mac only)
```

## Environment variables / API configuration

The API base URL (pointing at the local Gateway from `spot-backend`, or a deployed environment) should be configured per app — details to be added once the shared API client is implemented (see the "Set up typed API client" issues in the project board).

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