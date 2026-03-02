<p align="center">
  <img src="assets/icon.png" width="250" alt="Sovereign Hope Logo" />
</p>
<h1 align="center">Sovereign Hope Mobile</h1>
<h2 align="center">iOS and Android application for Sovereign Hope</h2>
<p align="center">
  <img src="https://github.com/sovereign-hope/sovereign-hope-mobile/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI Badge" />
</p>

## Overview

Sovereign Hope Mobile is a React Native app built with Expo.

- Runtime: Expo SDK 54, React Native 0.81, React 19
- Platforms: iOS and Android
- State: Redux Toolkit slices in `src/redux`
- Backend integrations: Firebase, ESV API, podcast/resource content feeds

If you need member-access operations (seed, link, grant/revoke), use [`docs/member-access-runbook.md`](docs/member-access-runbook.md).

## Quick Start

### Prerequisites

- macOS for iOS builds/simulator
- Node.js `20.10.0` (see `.nvmrc`)
- npm (bundled with Node)
- Xcode (for iOS simulator/device builds)
- Android Studio (for Android emulator/device builds)
- Expo Go app (optional, for quick device testing)

### Install and run

```bash
nvm install
nvm use
npm install
npm start
```

Then use the Expo terminal controls to launch on iOS (`i`) or Android (`a`), or scan the QR code in Expo Go.

## Common Commands

```bash
# Start Expo dev server
npm start

# Run native app builds locally
npm run ios
npm run android

# Lint and tests
npm run lint
npm test
npm run testChanged
npm run testDebugCurrent
npm run updateSnapshots

# Member access/admin scripts
npm run member:bulk-seed -- --dry-run
npm run member:link-by-email -- --dry-run
npm run member:set -- --firebase-email "user@example.com" --dry-run
```

## EAS Build and Submit Commands

```bash
npm run buildDevelopment:ios
npm run buildDevelopment:android
npm run buildDevelopment:all

npm run buildProduction:ios
npm run buildProduction:android
npm run buildProduction:all

npm run submitProduction
```

## Development Workflow

- Branch from `main` for all feature and bug-fix work.
- Open pull requests into `main`.
- CI and build workflows are defined in `.github/workflows`:
  - `ci.yml`
  - `dev-build.yml`
  - `development.yml`
  - `release.yml`

## Documentation Index

See [`docs/README.md`](docs/README.md) for docs navigation.

## Helpful References

- [Expo docs](https://docs.expo.dev/)
- [React Native docs](https://reactnative.dev/docs/environment-setup)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://m3.material.io/)
