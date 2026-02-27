---
title: Android Edge-to-Edge + iOS Liquid Glass Support
type: feat
status: active
date: 2026-02-26
---

# Android Edge-to-Edge + iOS Liquid Glass Support

## Overview

Upgrade to Expo SDK 54 with Xcode 26 to enable Android edge-to-edge display and iOS 26 liquid glass in a single release. SDK 54 makes edge-to-edge mandatory (built into RN 0.81) and unlocks `expo-glass-effect` + native bottom tabs for liquid glass.

## Problem Statement / Motivation

- **Android 15 enforcement**: Apps targeting API 35+ render edge-to-edge by default. Android 16 removes the opt-out entirely. The app currently sets `androidStatusBar.translucent: false`, explicitly opting out.
- **iOS 26 liquid glass**: Apple's new design language applies translucent glass material to navigation bars, tab bars, and toolbars. React Navigation 6's JS-rendered tab bar cannot adopt this -- native bottom tabs are required.
- **SDK 54 makes edge-to-edge mandatory** for all Expo projects. No opt-out.

## Current State

| Item | Value |
|---|---|
| Expo SDK | 53.0.22 |
| React Native | 0.79.5 |
| React Navigation | 6.x |
| react-native-screens | ~4.11.1 |
| react-native-safe-area-context | 5.4.0 |
| `androidStatusBar.translucent` | `false` (opaque, NOT edge-to-edge) |
| `edgeToEdgeEnabled` | not set |
| expo-status-bar | installed, never imported |
| useStatusBarHeight hook | dead code (never imported) |

### Safe Area Handling by Screen

| Screen | Top | Bottom | Left/Right | Notes |
|---|---|---|---|---|
| RootScreen | `edges={["top"]}` | none | none | Gate for all screens |
| TodayScreen | inherited | none | SafeAreaView | FlatList, no bottom inset |
| ReadingPlanScreen | inherited | none | SafeAreaView | |
| ReadScreen | inherited | `edges={["bottom"]}` | SafeAreaView | Already handles bottom |
| SettingsScreen | inherited | none | SafeAreaView | KeyboardAvoidingView |
| AccountSignInScreen | inherited | none | SafeAreaView | KeyboardAvoidingView |
| PodcastScreen | inherited | none | SafeAreaView | |
| FontSizePickerScreen | inherited | none | SafeAreaView | |
| SelectPlanScreen | `edges={["top"]}` OWN | none | SafeAreaView | Double top risk |
| ChurchScreen | NONE | NONE | NONE | headerShown:false, WebView |
| ScheduleScreen | inherited (header) | NONE | NONE | WebView |
| SundaysScreen | inherited (header) | NONE | NONE | WebView |
| MediaPlayer (mini) | n/a | manual offset | n/a | Fragile layout calc |
| MediaPlayer (modal) | manual insets.top | n/a | n/a | statusBarTranslucent=false |
| MiniPlayer | n/a | `edges={["bottom"]}` | n/a | May be dead code |

### Hardcoded Navigation Colors

Six occurrences of `#2A2A2A`/`#F8F8F8` in `RootScreen.tsx` instead of using the existing `navigation.dark`/`navigation.light` from `src/style/colors.ts` (lines 21-24).

---

## Step 1: Prerequisites / Cleanup

- [x] **Refactor hardcoded colors** -- Replace all 6 hardcoded `#2A2A2A`/`#F8F8F8` in `src/screens/RootScreen/RootScreen.tsx` with `colors.navigation.dark`/`colors.navigation.light` from `src/style/colors.ts`
- [x] **Remove dead code** -- Delete `src/hooks/useStatusBarHeight.ts` (never imported, uses deprecated `StatusBar.currentHeight`)
- [x] **Remove unused dependency** -- Remove `expo-status-bar` from package.json (installed but never imported)
- [x] **Verify MiniPlayer status** -- Check if `src/components/MiniPlayer/MiniPlayer.tsx` is still referenced. If dead, remove it.

## Step 2: SDK 54 Upgrade

- [x] Upgrade Expo SDK from 53 to 54 (`npx expo install expo@^54`)
- [x] Upgrade React Native to 0.81+
- [ ] Update `react-native-screens` to >= 4.20.0
- [x] Update `react-native-safe-area-context` to latest SDK 54 compatible version
- [x] Run `npx expo install --fix` to align all Expo-managed dependencies
- [x] Remove `"androidStatusBar": { "translucent": false }` from `app.json` (edge-to-edge is always on in SDK 54, this setting is ignored)
- [x] Remove any `edgeToEdgeEnabled` flag if present (not needed -- always on)
- [x] Install `expo-system-ui` for root view background color control:
  ```bash
  npx expo install expo-system-ui
  ```
- [x] Initialize root background color with `expo-system-ui` in `App.tsx` so system-area transitions don't flash:
  ```tsx
  import * as SystemUI from "expo-system-ui";

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.navigation[colorScheme]);
  }, [colorScheme]);
  ```
- [x] Add `softwareKeyboardLayoutMode` to `app.json`:
  ```json
  {
    "expo": {
      "android": {
        "softwareKeyboardLayoutMode": "resize"
      }
    }
  }
  ```

## Step 3: React Navigation 7 + Native Bottom Tabs (Locked Path)

- [x] Upgrade `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs` to latest v7.x (do not adopt v8 alpha in this release)
- [ ] Address breaking changes in `src/style/themes.ts`:
  - New `fonts` property required in theme type
  - Color semantics may change
- [x] Switch from JS tabs to native tabs using the `unstable` React Navigation v7 API:
  ```tsx
  // Before
  import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
  // After
  import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
  ```
  This uses `UITabBarController` on iOS (liquid glass) and `BottomNavigationView` on Android.
- [x] Address native-tab option differences in `src/screens/RootScreen/RootScreen.tsx`:
  - Keep `tabBarLabel` as a string
  - Use `tabBarLabelVisibilityMode` only where supported by the native tab API
  - Remove unsupported `tabBarButton` customization
  - Migrate icons from React elements to native-tab-compatible icon config (image/SF Symbol/system item)
- [x] **Migrate ChurchTabButton deep link** -- Native bottom tabs may not support custom `tabBarButton` components. Reimplement as a `tabPress` event listener:
  ```tsx
  // Instead of custom tabBarButton, use listeners:
  listeners={({ navigation }) => ({
    tabPress: (e) => {
      // Check if Church Center app is installed, open deep link
      // Otherwise, let default navigation happen
    },
  })}
  ```
- [x] **Redesign TabBarHeightContext** -- The custom `BottomTabBar` wrapper with `onLayout` measurement won't work with native tabs.
  - Preferred: use `useBottomTabBarHeight()` if it works with the chosen native tab navigator
  - Fallback: derive offset from `useSafeAreaInsets().bottom + platform tab-bar constant`, then verify on devices in Step 10

## Step 4: Replace Opaque StatusBar Behavior

- [x] **Remove** the Android `<RNStatusBar>` component in `App.tsx` (lines 265-275). It sets `translucent={false}` and opaque background -- incompatible with edge-to-edge.
- [x] **Do not add `react-native-edge-to-edge`** just for this migration. Use Expo/RN 0.81 edge-to-edge behavior plus React Navigation status bar options.
- [x] Keep React Navigation's `statusBarStyle` screen option (already set in `RootScreen.tsx` line 416).
- [x] Keep `statusBarTranslucent: true` explicitly set on the root stack (line 415). In native stack, default is `false`; do not rely on defaults.

## Step 5: Update Safe Area Handling

**Screens needing bottom inset added** (content now goes behind transparent nav bar on Android):

For scrollable screens, add bottom padding that combines mini-player offset and system inset:

`paddingBottom = miniPlayerHeight + insets.bottom`

If a screen has no mini-player overlap, use `paddingBottom = insets.bottom`. For non-scrollable screens, add `"bottom"` to SafeAreaView edges.

- [x] `TodayScreen` -- FlatList: ensure `contentContainerStyle.paddingBottom` includes both `miniPlayerHeight` and `insets.bottom`
- [x] `ReadingPlanScreen` -- Same as TodayScreen; do not replace existing `miniPlayerHeight` padding with inset-only padding
- [x] `PodcastScreen` -- Add inset-aware bottom padding; include mini-player height if this screen can show mini-player overlay
- [x] `FontSizePickerScreen` -- Add `"bottom"` to edges: `edges={["left", "right", "bottom"]}`
- [x] `SettingsScreen` -- Add `"bottom"` to edges: `edges={["left", "right", "bottom"]}`
- [x] `AccountSignInScreen` -- Add `"bottom"` to edges: `edges={["left", "right", "bottom"]}`
- [x] `NoNetworkComponent` -- Add `"bottom"` to edges if it's a full-screen overlay

**SelectPlanScreen double-top fix:**

- [x] Remove `"top"` from `SelectPlanScreen`'s SafeAreaView edges (line 77). The navigation header already provides top inset. `edges={["top", "left", "right"]}` -> `edges={["left", "right"]}`

**WebView screens (highest risk):**

- [x] `ChurchScreen` -- Wrap WebView in SafeAreaView with `edges={["top", "bottom", "left", "right"]}` since `headerShown: false`. The third-party churchcenter.com content needs native inset protection.
- [x] `ScheduleScreen` -- Wrap WebView in SafeAreaView with `edges={["bottom"]}` (header handles top)
- [x] `SundaysScreen` -- Same as ScheduleScreen

## Step 6: Fix MediaPlayer Positioning

The `MediaPlayer` component has the most fragile layout in the app.

- [ ] **Audit `getBottomOffset()`** in `MediaPlayer.tsx` (lines 60-88). With edge-to-edge, `insets.bottom` will be non-zero on Android (was previously 0 with opaque nav bar). The `tabBarHeight` measurement from `TabBarHeightContext` likely already includes the bottom inset. Verify no double-counting of `insets.bottom` when tab bar is visible.
- [x] **Change modal `statusBarTranslucent`** from `false` to `true` (line 633). The modal already applies `paddingTop: insets.top`, so content is protected.
- [x] **Add `navigationBarTranslucent={true}`** to the Modal component for consistent edge-to-edge in the modal.
- [ ] **Update MediaPlayer for native tab bar height** -- With the TabBarHeightContext redesign from Step 3, verify the mini player still positions correctly above the tab bar on both platforms.

## Step 7: Header Transparency for Liquid Glass (iOS 26)

- [x] Conditionalize header background colors for iOS 26+:
  ```tsx
  headerStyle: {
    backgroundColor: Platform.OS === "ios" && parseInt(Platform.Version, 10) >= 26
      ? undefined  // Let liquid glass take over
      : colors.navigation[colorScheme],
  }
  ```
- [x] Apply this to all stack navigators in `RootScreen.tsx` (WeekStack, PodcastStack, ReadingPlanStack, Root Stack)
- [ ] Test `headerLargeTitle: true` interaction with liquid glass
- [ ] Verify `headerShadowVisible: false` behavior with glass material

## Step 8: Optional Custom Glass Effects

- [ ] Evaluate `expo-glass-effect` for custom components:
  ```bash
  npx expo install expo-glass-effect
  ```
- [ ] Candidates: MediaPlayer modal background, mini player overlay
- [ ] Use `isGlassEffectAPIAvailable()` for runtime feature detection and graceful fallback

## Step 9: Build Configuration + Versioning

- [x] Update EAS build config to use Xcode 26 image
- [x] **Bump `runtimeVersion`** in `app.json` (currently `"8.0.0"`). This is a native configuration change that requires a new build.
- [ ] Ship native build + JS changes simultaneously. Do NOT ship OTA JS changes ahead of the native build.
- [ ] Verify splash screen transition doesn't flash (splash has `backgroundColor: "#FFFFFF"` which may clash with edge-to-edge + dark mode)

## Step 10: Testing

- [ ] Test on Android 13 (API 33) with gesture and 3-button nav
- [ ] Test on Android 14 (API 34) with gesture nav
- [ ] Test on Android 15 (API 35) with gesture and 3-button nav -- **Critical**
- [ ] Test on iOS 17/18 -- verify no regressions, no liquid glass (expected)
- [ ] Test on iOS 26 -- verify liquid glass on headers and tab bar -- **Critical**
- [ ] Test dark mode and light mode on all platforms
- [ ] Test with media player visible (mini and modal)
- [ ] Test keyboard on SettingsScreen and AccountSignInScreen (Android)
- [ ] Test ChurchScreen WebView renders correctly (no content behind bars)
- [ ] Test Church tab deep link still works with native tabs

---

## Technical Considerations

### Architecture Impacts

- **Safe area strategy shifts from "top at root, sides per-screen" to "all edges per-screen"** -- each screen must own its complete safe area handling.
- **Navigation color system centralizes** -- The 6 hardcoded color occurrences become 1 source, then conditionally transparent for iOS 26.
- **Tab bar abstraction layer breaks** -- The custom BottomTabBar wrapper and TabBarHeightContext pattern must be redesigned for native tabs.
- **React Navigation major version upgrade (v7)** -- Theme types, tab APIs, and screen option names change. This is the largest single risk.

### Performance Implications

- Edge-to-edge itself has no performance impact (layout mode change).
- Liquid glass uses GPU-accelerated blur -- minimal overhead since UIKit handles it natively.
- Native bottom tabs are actually faster than JS-rendered tabs.

### Security Considerations

- No security impact. These are purely visual/layout changes.

## System-Wide Impact

- **Interaction graph**: Enabling edge-to-edge triggers inset recalculation across every mounted screen. SafeAreaProvider -> SafeAreaView -> content layout. MediaPlayer -> TabBarHeightContext -> getBottomOffset is the most sensitive path.
- **Error propagation**: Layout errors (wrong insets) are visual-only -- no crashes or data loss. Worst case is content behind system bars.
- **State lifecycle risks**: None. No persistent state changes.
- **API surface parity**: Both platforms affected simultaneously. `react-native-safe-area-context` provides cross-platform inset parity.

## Acceptance Criteria

- [ ] App content renders behind transparent status bar and navigation bar on Android
- [ ] All 12 screens display correctly with no content obscured by system bars
- [ ] WebView screens (Church, Schedule, Sundays) have proper safe area insets
- [ ] MediaPlayer mini bar and modal position correctly on both platforms
- [ ] Keyboard doesn't overlap inputs on SettingsScreen and AccountSignInScreen
- [ ] Tab bar renders with liquid glass material on iOS 26+
- [ ] Navigation headers render with liquid glass on iOS 26+
- [ ] Falls back to standard opaque bars on iOS 17/18
- [ ] Church tab deep link behavior preserved with native tabs
- [ ] Splash screen transition is smooth (no flash)
- [ ] Dark mode and light mode both work correctly
- [ ] Tested on Android 13, 14, 15 and iOS 17, 18, 26

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| React Navigation v7 + native tabs migration breaks | High | High | Keep scope to v7 stable, migrate tab options incrementally, test Church deep-link flow early |
| MediaPlayer positioning breaks | High | High | Audit getBottomOffset() first, test on device |
| Native tabs lack custom tabBarButton | High | Medium | Reimplement Church deep link as event listener |
| WebView content behind system bars | High | Medium | Wrap in SafeAreaView; test churchcenter.com |
| SDK 54 dependency conflicts | Medium | High | Run `npx expo install --fix`, resolve one by one |
| Keyboard overlap on Android | Medium | Medium | Test with softwareKeyboardLayoutMode: resize |
| OTA/native build mismatch | Medium | Critical | Bump runtimeVersion, ship simultaneously |
| TabBarHeightContext redesign | Medium | Medium | Prefer `useBottomTabBarHeight()` if compatible; fallback to `insets.bottom + tab-bar constant` with device validation |
| SelectPlanScreen double top inset | Medium | Low | Remove "top" from edges |

## Success Metrics

- Zero layout regressions on existing devices
- App passes visual QA on Android 15 emulator with gesture navigation
- No increase in Sentry layout-related errors post-release
- iOS 26 users see native liquid glass material on tab bar and headers

## Sources & References

### External References
- [Expo SDK 53 Changelog](https://expo.dev/changelog/sdk-53)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)
- [Edge-to-Edge Display, Now Streamlined for Android -- Expo Blog](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android)
- [react-native-edge-to-edge GitHub](https://github.com/zoontek/react-native-edge-to-edge)
- [How To Use Liquid Glass in React Native -- Callstack](https://www.callstack.com/blog/how-to-use-liquid-glass-in-react-native)
- [Integrating iOS 26 Liquid Glass with Expo UI -- Expo Blog](https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui)
- [Native Bottom Tab Navigator](https://reactnavigation.org/docs/native-bottom-tab-navigator/)
- [Upgrading from React Navigation 6.x](https://reactnavigation.org/docs/upgrading-from-6.x/)
- [Expo Safe Areas Guide](https://docs.expo.dev/develop/user-interface/safe-areas/)
- [Expo System Bars Guide](https://docs.expo.dev/develop/user-interface/system-bars/)
- [expo-glass-effect Docs](https://docs.expo.dev/versions/latest/sdk/glass-effect/)

### Internal References
- Safe area handling: `src/screens/RootScreen/RootScreen.tsx:379-385`
- StatusBar config: `App.tsx:265-275`
- Navigation colors: `src/style/colors.ts:21-24`
- MediaPlayer positioning: `src/components/MediaPlayer/MediaPlayer.tsx:60-88`
- Dead hook: `src/hooks/useStatusBarHeight.ts`
- Tab bar wrapper: `src/screens/RootScreen/RootScreen.tsx:258-272`
- Church deep link: `src/screens/RootScreen/RootScreen.tsx:167-210`
- app.json config: `app.json:60` (androidStatusBar)
