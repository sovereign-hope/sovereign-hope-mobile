---
title: "all: Cross-Device Sync with User Accounts"
type: feat
platform: both
date: 2026-02-24
---

# Cross-Device Sync with User Accounts

## Overview

Add optional user accounts (Apple Sign In + email/password) via Firebase Auth, accessible from the Settings screen. When signed in, sync all user-generated data to Firestore for cross-device access. Auth is fully optional -- the app continues to work without an account, using the existing AsyncStorage-only flow. Deployable via EAS Update (no new native dependencies).

## Problem Statement / Motivation

All user data (reading plan progress, settings, notification preferences) is stored locally in AsyncStorage. If a user switches phones, reinstalls the app, or uses multiple devices, all their progress is lost. Reading plan progress -- representing months of daily engagement -- is the most valuable and irreplaceable data. Users have no way to recover it.

## Proposed Solution

Layer Firebase Auth + Firestore sync on top of the existing AsyncStorage persistence. AsyncStorage remains the local source of truth (offline-first), with Firestore as the remote backup and cross-device sync layer. This avoids a risky rewrite of the persistence layer while adding cloud sync capabilities.

**Auth providers (v1):** Apple Sign In (iOS), email/password (both platforms)
**Auth providers (fast-follow):** Google Sign In (requires native dep `@react-native-google-signin/google-signin` + app store build)
**Sync scope:** Reading plan progress, settings, subscribed plans, dismissed notification IDs
**NOT synced:** Memory verse cache (ESV API text, re-fetchable), podcast/commentary/ESV caches (transient)
**Conflict resolution:** Union merge for boolean progress, per-field last-write-wins for settings
**Deployment:** EAS Update only -- no new native dependencies in v1

## Platform Impact

| Platform | Affected | Key Files                                                                                                                                              |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| iOS      | Yes      | `App.tsx`, `src/screens/SettingsScreen/`, `src/redux/settingsSlice.ts`, `src/redux/readingPlanSlice.ts`, `src/redux/notificationsSlice.ts`, `app.json` |
| Android  | Yes      | Same as iOS                                                                                                                                            |
| Server   | Yes      | Firestore security rules, Cloud Function for account deletion cleanup                                                                                  |

## Cross-Platform Parity Plan

Both platforms get identical sync functionality simultaneously. Platform differences:

| Aspect                       | iOS                                    | Android                        |
| ---------------------------- | -------------------------------------- | ------------------------------ |
| Apple Sign In                | Native via `expo-apple-authentication` | Not available (hidden)         |
| Email/Password               | Identical                              | Identical                      |
| `enableChurchCenterDeepLink` | Synced and applied                     | Synced but ignored at UI level |

Apple Sign In button is conditionally rendered (iOS only). Email/password is available on both platforms. **Note:** Android users can only use email/password until Google Sign In ships in the fast-follow (requires native dep + app store build).

## Permissions & Entitlements

**iOS:**

- `usesAppleSignIn: true` -- already configured in `app.json:36`

- No new entitlements needed

**Android:**

- No new permissions or entitlements needed (v1 uses email/password only)

- `google-services.json` needed in fast-follow when Google Sign In is added

## Minimum OS Version Considerations

No concerns. Firebase Auth JS SDK v12 and all Expo auth packages support iOS 16+ and Android API 24+ (the app's current minimum targets).

## Technical Considerations

### Architecture: Hybrid AsyncStorage + Firestore

```
User Action
    |
    v
Redux Dispatch --> AsyncStorage (immediate, offline-capable)
    |
    v
Sync Service --> Firestore (best-effort, queued if offline)
    |
    v
onSnapshot Listener <-- Firestore (remote changes from other devices)
    |
    v
Merge Logic --> Redux + AsyncStorage (reconcile)
```

**Key architectural constraint:** The Firebase JS SDK has NO disk-based offline persistence on React Native (requires IndexedDB, which RN doesn't provide). AsyncStorage must remain the local source of truth. Firestore serves as the remote sync layer only.

### Firebase Initialization Changes

Current initialization in `App.tsx` must be updated:

1. Use `initializeAuth` (not `getAuth`) with `getReactNativePersistence(AsyncStorage)` for token persistence
2. Use `initializeFirestore` (not `getFirestore`) with `persistentLocalCache` for in-memory caching
3. Extract Firebase config to `src/config/firebase.ts` (singleton pattern)
4. **Metro config fix required:** Set `unstable_enablePackageExports = false` in `metro.config.js` to fix Expo SDK 53 + Firebase module resolution issue

### New Dependencies

**None for v1.** All required packages are already installed (`firebase`, `expo-apple-authentication`, `expo-secure-store`). This means v1 can ship via EAS Update without an app store build.

**Fast-follow (Google Sign In):** `@react-native-google-signin/google-signin` -- native dependency, requires new app store build.

### Firestore Schema

```
users/{uid}
  ├── createdAt: Timestamp
  ├── displayName: string | null
  ├── email: string | null
  ├── lastSyncTimestamp: Timestamp
  ├── settings: {
  │     enableNotifications: { value: boolean, updatedAt: number }
  │     notificationTime: { value: string, updatedAt: number }
  │     readingFontSize: { value: number, updatedAt: number }
  │     readingBackgroundColor: { value: string | null, updatedAt: number }
  │     showChildrensPlan: { value: boolean, updatedAt: number }
  │     enableChurchCenterDeepLink: { value: boolean, updatedAt: number }
  │     subscribedPlans: { value: string[], updatedAt: number }
  │   }
  ├── dismissedNotifications: { ids: string[], updatedAt: number }
  └── progress/ (subcollection)
        └── {planId}
              ├── weeks: Array<{ days: Array<{ isCompleted: boolean }> }>
              └── lastUpdated: Timestamp
```

**Rationale:** Settings in one document (\~1KB). Progress in a subcollection per plan year (\~8KB each) -- mirrors the existing AsyncStorage key pattern (`@readingPlanState{planId}`). All well within Firestore's 1MB document limit.

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Church content: public read, admin-only write
    match /readingPlans/{planId} {
      allow read: if true;
      allow write: if false;
    }
    match /notifications/{notifId} {
      allow read: if true;
      allow write: if false;
    }
    // User data: owner-only access
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /progress/{planId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Conflict Resolution

**Reading plan progress (union merge):** `isCompleted` is OR-merged -- if completed on ANY device, it stays completed everywhere. This is a grow-only CRDT. Note: the current app allows toggling completion off (`handleCompleteDay` accepts a boolean). Under union merge, un-completing on one device may be re-completed by sync from another device. This is an acceptable trade-off -- progress is more important than undo.

**Settings (per-field last-write-wins):** Each setting field has an `updatedAt` client timestamp. When merging, the field with the newer timestamp wins. Using client `Date.now()` (not `serverTimestamp()`) for comparison since the client needs the value before the server confirms.

**Dismissed notification IDs (union merge):** Once dismissed, stays dismissed. Array union of both sets.

### Sync Triggers

- **On write:** Each `store*` thunk writes to AsyncStorage first, then Firestore (fire-and-forget if offline)

- **On app foreground:** Compare local vs remote, merge, apply

- **On sign-in:** Full migration/merge

- **On network reconnect:** Push pending local changes, pull remote updates (via `@react-native-community/netinfo`, already installed)

No real-time `onSnapshot` listeners in v1 -- periodic sync is sufficient for a reading plan app. Reduces battery impact and complexity.

### Sign-Out Behavior

Prompt the user: "Keep data on this device?" with options:

- **Keep:** Local data stays in AsyncStorage. Good for personal devices.

- **Remove:** Clear all user-specific AsyncStorage keys. Good for shared devices.

Firebase Auth signs out regardless. Sync listener torn down.

### Account Deletion

Apple requires apps offering account creation to also offer in-app account deletion. The deletion flow:

1. User taps "Delete Account" in Settings
2. Confirmation dialog with warning about data loss
3. Re-authenticate if needed (Firebase requires recent auth for `deleteUser()`)
4. Client deletes Firestore user document + progress subcollection
5. Client calls `deleteUser()` on the Firebase Auth account
6. **Backup:** Cloud Function on `auth.user().onDelete()` trigger ensures Firestore cleanup even if client-side deletion fails
7. Clear local data, return to anonymous state

### Data Migration (Anonymous to Authenticated)

When a user signs in for the first time:

1. Check if Firestore already has data for this `uid`
2. **No remote data (new account):** Push all local AsyncStorage data to Firestore
3. **Has remote data (existing account, new device):** Merge local + remote using conflict resolution rules
4. Set `migrationVersion` field in Firestore for future schema evolution
5. Log success/failure to Sentry

### Settings That Trigger Side Effects

Some settings aren't just data -- they trigger platform APIs:

- `enableNotifications` / `notificationTime` → `expo-notifications` scheduling

- When synced to a new device, the sync handler must execute the side effect (schedule/cancel notification), which may trigger an OS permission prompt

### Existing Scaffolding to Leverage

| Asset                             | Location                                     | Status                                               |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| `EmailInput` component            | `src/components/EmailInput/EmailInput.tsx`   | Built, unused                                        |
| `SecureInput` component           | `src/components/SecureInput/SecureInput.tsx` | Built, unused                                        |
| `expo-apple-authentication`       | `package.json`                               | Installed, configured in `app.json`                  |
| `expo-auth-session`               | `package.json`                               | Installed (not needed for v1; deprecated for Google) |
| `expo-secure-store`               | `package.json` + `app.json` plugin           | Installed, unused                                    |
| `isSignout` fields                | All slice interfaces                         | Declared, never used                                 |
| `@react-native-community/netinfo` | `package.json`                               | Installed, unused                                    |

## Acceptance Criteria

### Authentication

- [x] Users can sign in with Apple (iOS only)

- [x] Users can sign in with email/password (both platforms)

- [x] Users can sign out with prompt to keep/clear local data

- [x] Users can delete their account with full data cleanup

- [x] Auth state persists across app restarts

- [x] Auth is fully optional -- app works without an account

### Sync

- [x] Reading plan progress syncs across devices (union merge)

- [x] Settings sync across devices (per-field LWW)

- [x] Subscribed plans sync across devices

- [x] Dismissed notification IDs sync across devices

- [x] Existing local data migrates to Firestore on first sign-in

- [x] Sign-in on new device hydrates local state from cloud

- [x] Offline changes are pushed when connectivity returns

- [x] App foreground triggers sync check

### Security

- [x] Firestore rules enforce user-scoped access (owner-only)

- [ ] No credentials hardcoded in client code

- [x] Auth tokens stored via Firebase's built-in persistence

- [x] Cloud Function backs up account deletion cleanup

### UI

- [x] New "Account" section in Settings screen

- [x] Signed-out state: shows sign-in options

- [x] Signed-in state: shows email/name, sign-out, delete account

- [x] Loading states during auth and sync operations

- [x] Error messages for auth failures (cancelled, wrong password, network error)

### Edge Cases

- [ ] Year transition: multi-year plan ID upgrade syncs correctly

- [x] Notification settings sync triggers scheduling side effect on new device

- [x] `enableChurchCenterDeepLink` syncs but is hidden on Android

- [x] Plan picker does not flash on synced device (subscribedPlans hydrated before navigation check)

## Implementation Order

### Phase 1: Firebase Infrastructure

1. Extract Firebase config to `src/config/firebase.ts`
2. Add `initializeAuth` with React Native persistence
3. Fix Metro config for Expo 53 compatibility
4. Deploy Firestore security rules

### Phase 2: Auth Service

1. Create `src/services/auth.ts` -- Apple + email/password sign-in
2. Create `authSlice` in Redux for auth state
3. Add `onAuthStateChanged` listener in App.tsx
4. Wire up `expo-apple-authentication` credential flow
5. Implement email/password (create, sign-in, password reset)

### Phase 3: Sync Service

1. Create `src/services/sync.ts` -- Firestore read/write/merge logic
2. Implement union merge for progress
3. Implement per-field LWW for settings
4. Add Firestore write-through to existing `store*` thunks
5. Add foreground sync check (piggyback on existing `AppState` listener)
6. Add network reconnect sync (via NetInfo)

### Phase 4: Data Migration

1. Implement anonymous-to-authenticated migration
2. Handle existing-account-on-new-device merge
3. Add `migrationVersion` for future schema evolution

### Phase 5: Settings UI

1. Add "Account" section to SettingsScreen
2. Build sign-in screen (Apple button on iOS, email form using existing `EmailInput`/`SecureInput`)
3. Implement sign-out with keep/clear prompt
4. Implement account deletion with confirmation
5. Add loading and error states

### Phase 6: Account Deletion Backend

1. Create Cloud Function for `auth.user().onDelete()` trigger
2. Function deletes `users/{uid}` document and `progress` subcollection

### Phase 7: Testing & Polish

1. Test all auth flows on both platforms (development builds, not Expo Go)
2. Test sync scenarios: new device, offline, conflict, migration
3. Test account deletion end-to-end
4. Test year transition with synced multi-year plans
5. Verify notification scheduling side effects on synced devices

## Testing Notes

- **Apple Sign In does NOT work in Expo Go** -- must use EAS development builds (`npx expo run:ios`)

- **Apple only returns name/email on first sign-in** -- store immediately in Firestore

- **Test the anonymous-to-auth migration** with realistic data (52+ weeks of progress)

- **Test sign-in on a fresh device** with an existing cloud account

- **Test offline scenarios**: mark readings complete while offline, then go online

- **Test shared device flow**: sign out with "Remove data", sign in as different user

- **Test account deletion**: verify Firestore data is fully removed, local state is cleared

Key test scenarios from SpecFlow analysis:

- Two devices offline, both mark different days complete, come online simultaneously → union merge

- Sign in on new device while plan picker `useEffect` runs → no flash of plan picker

- Delete account when Firestore delete succeeds but auth delete fails → Cloud Function backup

- Sync notification settings to new device → triggers `scheduleNotificationAsync` + permission prompt

## Dependencies & Risks

**Dependencies:**

- Firebase Console: Enable Apple and Email/Password sign-in providers

- Firebase Console: Deploy security rules

- Cloud Functions: Deploy account deletion cleanup function

- Apple Developer Account: Verify Sign in with Apple is configured for the app's bundle ID

**Risks:**

| Risk                                                 | Likelihood | Impact            | Mitigation                                                       |
| ---------------------------------------------------- | ---------- | ----------------- | ---------------------------------------------------------------- |
| Expo 53 Metro config breaks Firebase auth            | High       | Blocks all auth   | Set `unstable_enablePackageExports = false` in metro.config.js   |
| `getReactNativePersistence` TypeScript types missing | High       | Dev friction      | Use `@ts-ignore`; monitor firebase-js-sdk#9316                   |
| Apple Sign In fails in Expo Go during development    | Certain    | Dev workflow      | Use EAS development builds exclusively                           |
| Android users limited to email/password in v1        | Medium     | Adoption friction | Fast-follow with Google Sign In after initial release            |
| Firestore writes fail silently offline               | Medium     | Data not synced   | AsyncStorage is source of truth; retry on foreground/reconnect   |
| Year transition orphans progress data                | Low        | Data loss         | Sync all plan IDs, not just current; document migration strategy |

## References & Research

### Internal References

- Settings screen: `src/screens/SettingsScreen/SettingsScreen.tsx`

- Redux slices: `src/redux/settingsSlice.ts`, `readingPlanSlice.ts`, `notificationsSlice.ts`, `memorySlice.ts`

- Existing auth components: `src/components/EmailInput/`, `src/components/SecureInput/`

- Store config: `src/app/store.ts`

- Firebase init: `App.tsx:43-55`

- Metro config: `metro.config.js`

- Known issue (service account key exposure): `todos/001-pending-p1-service-account-key-exposure.md`

- Known issue (year transition data loss): `todos/005-pending-p2-year-transition-data-loss.md`

### External References

- Firebase Auth JS SDK for React Native: <https://firebase.google.com/docs/auth/web/start>

- Expo Apple Authentication: <https://docs.expo.dev/versions/latest/sdk/apple-authentication/>

- Expo 53 + Firebase fix: <https://github.com/expo/expo/issues/36588>

- `getReactNativePersistence` types issue: <https://github.com/firebase/firebase-js-sdk/issues/9316>

- Firestore offline limitations on RN: <https://github.com/firebase/firebase-js-sdk/issues/7947>

## Fast-Follow: Google Sign In

**Why deferred:** Requires `@react-native-google-signin/google-signin` (native dependency) which needs a new app store build. V1 ships via EAS Update only.

**Scope:**

- Install `@react-native-google-signin/google-signin` + config plugin

- Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from Firebase Console

- Enable Google sign-in provider in Firebase Console

- Add Google Sign In button to auth screen (both platforms)

- Wire up `GoogleSignin.signIn()` → `GoogleAuthProvider.credential()` → `signInWithCredential()`

- Requires EAS Build + app store submission

**Reference:** <https://react-native-google-signin.github.io/docs/setting-up/expo>
