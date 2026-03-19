# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Start Expo dev server
npm start  # or npx expo start

# Run on specific platform
npm run ios       # expo run:ios
npm run android   # expo run:android

# Linting
npm run lint

# Testing
npm test                    # Run all tests
npm run testChanged         # Watch mode for changed files since main
npm run testDebugCurrent    # Watch mode for modified files only
npm run updateSnapshots     # Update Jest snapshots

# Local Builds (default for development — see ~/Developer/local-builds/ for full docs)
build sovhope ios                    # physical device (ad-hoc)
build sovhope android                # Android APK
build sovhope both                   # iOS + Android in parallel
build sovhope ios --profile staging  # override profile
# Install page: https://oathgate.chimp-yo.ts.net
# If `build` not found: ~/Developer/local-builds/build setup

# EAS Cloud Builds (production/store submissions only)
npm run buildProduction:ios
npm run buildProduction:android
npm run submitProduction
```

## Architecture Overview

### App Structure

- **Expo SDK 54** with React Native 0.81, using local builds for development and EAS for production/OTA updates
- **Redux Toolkit** for state management with typed hooks (`useAppSelector`, `useAppDispatch` from `src/hooks/store.ts`)
- **React Navigation 7** with bottom tabs + native stack navigators
- Dark mode support via `useColorScheme` hook and themes in `src/style/themes.ts`

### Directory Layout

```
src/
├── app/           # Redux store config (store.ts) and utilities (utils.ts)
├── components/    # Reusable UI components with barrel export (index.ts)
├── hooks/         # Custom hooks (store.ts for Redux, useColorScheme.ts)
├── navigation/    # Type definitions (RootNavigator.ts) and contexts
├── redux/         # Feature slices: esv, readingPlan, settings, podcast, memory, notifications, commentary
├── screens/       # Screen components organized in folders with styles
└── style/         # colors.ts, themes.ts, typography.ts, layout.ts
```

### Navigation Structure

`RootScreen.tsx` defines:

- **Root Stack**: Home, Read, Available Plans, Font Size, Schedule, Sundays
- **Tab Navigator** (inside Home): This Week, Reading Plan, Church, Resources
- Each tab has its own stack navigator for nested screens

### State Management

Redux slices handle domain-specific state:

- `esvSlice` - ESV Bible API data
- `readingPlanSlice` - Reading plan progress and data
- `settingsSlice` - App preferences (largest slice)
- `podcastSlice` - Podcast/resources content
- `memorySlice` - Scripture memory features
- `commentarySlice` - Bible commentary data

### Key Patterns

- Path aliases configured: `src/*` and `assets/*` (tsconfig.json)
- Named exports preferred over defaults (`import/no-default-export` ESLint rule)
- Component styles colocated in `*.styles.ts` files
- `Passage` type (in `src/app/utils.ts`) is the core data structure for Bible references

### External Services

- Firebase (Firestore)
- Sentry for error tracking
- ESV API for Bible text
- react-native-track-player for audio playback

## Code Style

- ESLint with TypeScript, React, accessibility (react-native-a11y), and Unicorn plugins
- Prettier for formatting (runs via lint-staged on commit)
- PascalCase or camelCase for filenames (enforced by unicorn/filename-case)
- Husky pre-commit hooks enabled
