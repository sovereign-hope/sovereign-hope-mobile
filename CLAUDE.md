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
npm run testChanged         # Watch mode for changed files since origin/main
npm run testDebugCurrent    # Watch mode for modified files only
npm run updateSnapshots     # Update Jest snapshots

# EAS Builds (requires eas-cli)
npm run buildProduction:ios
npm run buildProduction:android
npm run buildDevelopment:ios
npm run buildDevelopment:android
```

## Architecture Overview

### App Structure

- **Expo SDK 54** with React Native **0.81** and React **19**
- **Redux Toolkit** for state management with typed hooks (`useAppSelector`, `useAppDispatch` from `src/hooks/store.ts`)
- **React Navigation 7** with bottom tabs + native stack navigators
- Dark mode support via `useColorScheme` hook and themes in `src/style/themes.ts`

### Directory Layout

```
src/
├── app/           # Redux store config (store.ts) and utilities (utils.ts)
├── components/    # Reusable UI components with barrel export (index.ts)
├── hooks/         # Custom hooks (store.ts for Redux, useColorScheme.ts)
├── navigation/    # Navigation context and route typing
├── redux/         # Feature slices and route constants
├── screens/       # Screen components organized in folders with styles
└── style/         # colors.ts, themes.ts, typography.ts, layout.ts
```

### State Management

Redux slices currently wired in `src/app/store.ts`:

- `authSlice` - authentication/session state
- `esvSlice` - ESV Bible API data
- `readingPlanSlice` - reading plan progress and data
- `settingsSlice` - app preferences
- `podcastSlice` - podcast/resources content
- `memorySlice` - scripture memory features
- `notificationsSlice` - local notification state
- `commentarySlice` - commentary content
- `memberSlice` - membership and access state

### Key Patterns

- Path aliases configured: `src/*` and `assets/*` (tsconfig.json)
- Named exports preferred over defaults (`import/no-default-export` ESLint rule)
- Component styles colocated in `*.styles.ts` files
- `Passage` type (in `src/app/utils.ts`) is a core data structure for Bible references

### External Services

- Firebase (Firestore/Auth/functions integrations)
- Sentry for error tracking
- ESV API for Bible text
- react-native-track-player for audio playback

## Code Style

- ESLint with TypeScript, React, accessibility (react-native-a11y), and Unicorn plugins
- Prettier for formatting (runs via lint-staged on commit)
- PascalCase or camelCase for filenames (enforced by unicorn/filename-case)
- Husky pre-commit hooks enabled
