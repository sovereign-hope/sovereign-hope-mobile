---
title: "all: Add Previous Button to Read Screen"
type: feat
platform: both
date: 2026-02-26
---

# Add Previous Button to Read Screen

## Overview

Add a secondary `Previous` button to the Read screen to complement the existing primary `Next`/`Done` button. This gives users a quick way to recover if they accidentally tap `Next`, while keeping forward progress as the primary call to action.

## Problem Statement / Motivation

The current Read flow is forward-only. If a user taps `Next` by mistake, there is no in-screen way to go back to the prior passage. That creates avoidable friction and increases accidental navigation risk.

## Proposed Solution

Update the Read screen footer from a single CTA to a two-button row:

- Primary button: existing accent `Next`/`Done` action (unchanged in prominence)
- Secondary button: new lower-emphasis `Previous` action

Behavior rules:

- `Previous` is only actionable when `passageIndex > 0`
- On first passage (`passageIndex === 0`), `Previous` is hidden or disabled (implementation choice)
- Going back from last passage must switch primary label from `Done` back to `Next`
- `onComplete` only fires when pressing `Done` on the last passage

## Platform Impact

| Platform | Affected | Key Files                                                                                                                                   |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Yes      | `src/screens/ReadScreen/ReadScreen.tsx`, `src/screens/ReadScreen/ReadScreen.styles.ts`, optional `src/components/FlatButton/FlatButton.tsx` |
| Android  | Yes      | Same as iOS (shared React Native screen)                                                                                                    |
| Server   | No       | None                                                                                                                                        |

## Cross-Platform Parity Plan

This app uses one shared React Native implementation for Read. A single change in `ReadScreen` applies to both iOS and Android.

Parity checks:

- Same control visibility rules on first/middle/last passages
- Same haptic + completion behavior
- Same touch target and spacing quality on phone and tablet widths

## Permissions & Entitlements

None.

## Minimum OS Version Considerations

None beyond existing app minimums. No new native APIs or permissions.

## Technical Considerations

- Current footer is a single `FlatButton` in `ReadScrollView` (`src/screens/ReadScreen/ReadScreen.tsx:324`)
- Current progression logic is forward-only (`handleNextPassage` at `src/screens/ReadScreen/ReadScreen.tsx:431`)
- `FlatButton` currently has one visual style (accent-filled) (`src/components/FlatButton/FlatButton.styles.ts:27`)

Recommended UI approach:

1. Keep `FlatButton` as primary CTA for `Next`/`Done`
2. Add a screen-local secondary `Pressable` for `Previous` in the same row (lower risk, avoids global button API changes)

Alternative (higher scope):

- Add `variant` support to `FlatButton` for primary/secondary styles if broader reuse is desired

Data/loading considerations:

- Passage and commentary are fetched per passage transition via Redux thunks (`src/redux/esvSlice.ts`, `src/redux/commentarySlice.ts`)
- If backward navigation triggers failed network fetches, avoid silent blank content states; keep prior readable UI and show explicit failure feedback

## Acceptance Criteria

- [x] Read screen shows a secondary `Previous` action alongside primary `Next`/`Done` when multiple passages exist
- [x] On first passage, `Previous` is not actionable
- [x] On middle passages, tapping `Previous` decrements passage index by one and refreshes heading, passage text, memory state, and commentary for the prior passage
- [x] On last passage, tapping `Previous` returns to previous passage and primary label changes from `Done` to `Next`
- [x] `onComplete` is called only when tapping `Done` on the final passage
- [x] Single-passage flows (e.g., practice memory) do not regress; CTA behavior remains correct
- [x] Button layout remains usable and visually stable on narrow phone and wider tablet layouts
- [x] Accessibility roles and labels are present and clear for both buttons

## Implementation Order

1. Refactor passage transition into one helper in `ReadScreen` (single path for initial load, next, previous)
2. Add `handlePreviousPassage` with boundary guards (`passageIndex > 0`)
3. Replace single footer CTA with two-button row styles in `ReadScreen.styles.ts`
4. Implement secondary `Previous` style (screen-local `Pressable` preferred)
5. Validate completion behavior (`Done`) still triggers `onComplete` only on final step
6. Add/adjust tests for first/middle/last/single passage navigation states

## Testing Notes

Manual QA:

- Multi-passage read: first → middle → last and back
- Accidental next recovery path (tap `Next`, then immediately `Previous`)
- Last passage: ensure `Done` only completes when pressed
- Single memory passage flow from Today screen (`src/screens/TodayScreen/TodayScreen.tsx:326`)
- Reading plan row entry flow (`src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx:298`)
- Light/dark themes, small and large devices

Regression checks:

- Audio/font-size header actions still work in Read
- No layout overlap with bottom safe area / mini player height
- No flicker or stale heading when quickly tapping nav controls

## Dependencies & Risks

Dependencies:

- Existing Read screen Redux fetch flow and state updates

Risks:

- Incorrect boundary handling can cause negative index or stale UI
- Global `FlatButton` changes could unintentionally affect other screens (if variant path is chosen)
- Network failures during navigation can expose existing blank-state behavior if not handled explicitly

Mitigations:

- Keep scope local to `ReadScreen` unless reusable variants are required
- Centralize passage transition logic in one helper
- Add explicit error handling and state guardrails for fetch failures

## References & Research

Internal references:

- `src/screens/ReadScreen/ReadScreen.tsx:51`
- `src/screens/ReadScreen/ReadScreen.tsx:324`
- `src/screens/ReadScreen/ReadScreen.tsx:431`
- `src/screens/ReadScreen/ReadScreen.styles.ts:53`
- `src/components/FlatButton/FlatButton.tsx:9`
- `src/components/FlatButton/FlatButton.styles.ts:27`
- `src/screens/SettingsScreen/SettingsScreen.tsx:470`
- `src/screens/SettingsScreen/SettingsScreen.styles.ts:100`
- `src/screens/TodayScreen/TodayScreen.tsx:309`
- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx:298`
- `src/redux/esvSlice.ts:39`
- `src/redux/commentarySlice.ts:55`

Institutional learnings considered:

- Mirror cross-platform behavior for paired nav actions
- Guard boundary states (`index 0` / last index) to prevent accidental regressions
- Avoid stale UI state when transitioning rapidly between items
