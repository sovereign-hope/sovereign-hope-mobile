---
title: "both: Add General-Purpose Bible Navigation and Reading"
type: feat
platform: both
date: 2026-03-10
status: approved
---

# Add General-Purpose Bible Navigation and Reading

## Overview

Add a proper Bible-browsing experience to the app so users can navigate by book, chapter, and reference the way they expect from a normal Bible app, while reusing the existing Scripture reader, audio, commentary, and typography settings.

The core move is to separate **reading-plan sequence flow** from **general Bible browsing flow** without duplicating the actual reading UI.

## Problem Statement / Motivation

The app can currently render Scripture well, but only when another feature hands `ReadScreen` a precomputed list of passages. That works for the reading plan, but it is not a general Bible experience.

Current limitations:

- There is no dedicated Bible browsing entry point
- Users cannot navigate by book/chapter from within the app
- `ReadScreen` assumes an array of passages + completion callback, which is plan-oriented, not browse-oriented
- Passage parsing in `src/app/utils.ts` is too loose for general navigation and has correctness issues with numbered books (`1John`, `2Timothy`, etc.)
- The app already receives useful ESV metadata (`prev_chapter`, `next_chapter`) but does not use it for Bible-style navigation

Net result: the app has a reader, but not really a Bible.

## Product Goals

1. Let a user open the Bible and move around by book/chapter naturally
2. Preserve the current reading-plan experience without regression
3. Reuse the current reading surface instead of building a second reader
4. Establish a structured Bible reference model that supports future features like direct jump, bookmarks, recents, and verse selection

## Decisions (from brainstorm session 2026-03-10)

### Tab Architecture — "Reading" becomes "Bible", "Resources" removed

- The current **Reading** tab is renamed to **Bible** and becomes the primary Bible experience
- The **Resources** tab is removed from the tab bar; a link to Resources is added on the This Week screen
- Reading Plan is accessible as a nested route inside the Bible stack
- Final tab bar: **This Week** | **Bible** | **Church** | [Members]

### Bible Tab UX — Reader-first, not picker-first

- Tapping the **Bible** tab immediately shows the reader at the user's last-read location
- Default location (no saved state): **Genesis 1**
- Users always land on text, never on an empty picker screen
- A tappable header control opens a **bottom sheet picker** for book/chapter navigation

### Bottom Sheet Picker — Book and chapter selection in a single sheet

- Tapping the header title/location in the reader opens a bottom sheet
- The sheet shows all 66 books grouped by testament (Old Testament / New Testament)
- Tapping a book transitions the sheet content to a chapter number grid for that book
- Tapping a chapter number dismisses the sheet and navigates to that chapter
- A back control within the sheet returns from chapter grid to book list

### Reader Refactor — Shared presentation with thin containers

- Extract a shared **`PassageReader`** component from the current `ReadScreen` that handles: passage text rendering, audio playback controls, commentary display, font size settings, scroll behavior, memory-mode behavior
- **Bible tab root** (`BibleScreen`) uses `PassageReader` + browse state + picker sheet
- **Plan read screen** (`PlanReadScreen`) uses `PassageReader` + passage sequence + completion logic
- The two containers are separate components, not a single component with a mode param

### Browse Granularity — Whole chapters only for V1

- Browse mode always loads and displays whole chapters
- Previous/next navigation uses ESV API's `prev_chapter` / `next_chapter` metadata
- No verse-range browsing in V1 (verse ranges remain plan-mode only)
- "Open in Bible" from plan mode snaps to the chapter containing the current passage

### V1 Scope

**Included:**

- Canonical Bible book metadata (66 books with names, abbreviations, testament, chapter counts)
- Typed Bible reference/location models
- Parsing/formatting/query utility functions
- Bottom sheet book/chapter picker
- Bible tab as reader-first root screen with browse state
- Previous/next chapter navigation via ESV metadata
- Last-read location persistence (AsyncStorage)
- `bibleSlice` Redux state
- "Open in Bible" affordance from plan mode
- Resources tab removal + Resources link on This Week screen
- Reading-plan regression coverage

**Deferred to V2+:**

- Direct typed reference entry (jump box: "John 3:16")
- Bookmarks
- Verse selection / copy
- Search
- Recents UI (data persisted in V1, no UI)

## Platform Impact

| Platform | Affected | Key Files                                                                                                                                                                         |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | Yes      | `src/navigation/RootNavigator.ts`, `src/screens/RootScreen/RootScreen.tsx`, `src/screens/ReadScreen/ReadScreen.tsx`, new Bible screens, new Redux slice, Bible metadata/constants |
| Android  | Yes      | Same shared React Native implementation                                                                                                                                           |
| Server   | No       | None                                                                                                                                                                              |

## Cross-Platform Parity Plan

This should remain a shared React Native feature with identical navigation behavior on iOS and Android.

Parity checks:

- Same book/chapter browsing flow on both platforms
- Same previous/next chapter behavior
- Same reading typography settings in plan mode and browse mode
- Same persistence of last-read location
- Same error handling when a passage fails to load
- Same bottom sheet picker behavior

Platform-specific differences should be limited to existing header APIs (`unstable_headerRightItems` vs `headerRight`) and not product behavior.

## Permissions & Entitlements

None.

## Minimum OS Version Considerations

None beyond existing app minimums. No new native permissions or capabilities are required.

## Technical Design

### A. Introduce Bible metadata and typed references

**New files**

- `src/constants/bibleBooks.ts`
- `src/types/bible.ts`

**Bible book metadata shape**

```ts
export type BibleBook = {
  id: string;
  name: string;
  shortName: string;
  abbreviations: string[];
  testament: "old" | "new";
  chapterCount: number;
  isSingleChapter: boolean;
};
```

**Reference and location types**

```ts
export type BibleReference = {
  bookId: string;
  chapter: number;
  verse?: number;
};

export type BibleRange = {
  start: BibleReference;
  end?: BibleReference;
};

export type BibleLocation = {
  bookId: string;
  chapter: number;
};
```

This becomes the durable model for browse state and future enhancements.

### B. Harden reference parsing and formatting

**Primary file**

- `src/app/utils.ts`

Current `parsePassageString()` is good enough for plan ingestion but not for robust Bible navigation. It should be replaced or supplemented with utilities that:

- preserve proper book names for numbered books
- support single-chapter books correctly
- separate parsing from display formatting
- generate consistent ESV query strings from structured references
- reject or safely handle malformed references

**Recommended utility set**

- `parsePassageStringToRange()`
- `formatBibleRange()`
- `formatBibleLocation()`
- `buildEsvQueryFromRange()`
- `getBookByNameOrAbbreviation()`

### C. Tab bar restructure and Bible navigation stack

**Modified files**

- `src/navigation/RootNavigator.ts`
- `src/screens/RootScreen/RootScreen.tsx`
- `src/screens/TodayScreen/TodayScreen.tsx` (add Resources link)

**Changes**

1. Rename "Reading Plan" tab to "Bible" with the book icon
2. Remove "Resources" tab from the tab navigator
3. Add a "Resources" navigation link on the This Week / Today screen
4. The Bible tab's root screen is `BibleScreen` (the reader-first browse screen)
5. Reading Plan is a pushed screen within the Bible stack

**New screens**

- `src/screens/BibleScreen/BibleScreen.tsx` — reader-first Bible tab root
- `src/screens/BibleScreen/BibleScreen.styles.ts`
- `src/components/BiblePicker/BiblePicker.tsx` — bottom sheet book/chapter picker
- `src/components/BiblePicker/BiblePicker.styles.ts`

### D. Extract shared reader presentation (`PassageReader`)

**Primary file**

- `src/screens/ReadScreen/ReadScreen.tsx` (refactor source)

**New files**

- `src/components/PassageReader/PassageReader.tsx`
- `src/components/PassageReader/PassageReader.styles.ts`

**What moves into `PassageReader`:**

- Scripture HTML/text rendering
- Audio playback button and track-player integration
- Commentary display
- Font size settings integration
- Scroll behavior and `ReadScrollView` usage
- Memory-mode button
- Safe-area and mini-player layout handling
- Light/dark theme rendering

**What stays in container screens:**

- `BibleScreen`: browse state, location management, prev/next chapter, picker sheet, header with tappable location
- `PlanReadScreen` (refactored `ReadScreen`): passage array, passage index, sequence navigation, onComplete callback, "Open in Bible" affordance

### E. Add a dedicated Bible Redux slice

**New file**

- `src/redux/bibleSlice.ts`

**State shape**

```ts
export interface BibleState {
  currentLocation: BibleLocation;
  lastReadLocation: BibleLocation;
  recentLocations: BibleLocation[];
  isLoading: boolean;
  hasError: boolean;
}
```

**Initial state default:** `{ bookId: "GEN", chapter: 1 }` (Genesis 1)

**Persistence:** Store `lastReadLocation` and `recentLocations` in AsyncStorage. Restore on app launch.

**Thunks:**

- `navigateToChapter(location)` — set current location, trigger ESV fetch, persist
- `navigateToNextChapter()` — use ESV `next_chapter` metadata
- `navigateToPreviousChapter()` — use ESV `prev_chapter` metadata
- `restoreLastReadLocation()` — load from AsyncStorage on app init

### F. Reuse `esvSlice` more effectively

**Primary file**

- `src/redux/esvSlice.ts`

The ESV response already includes chapter adjacency metadata (`prev_chapter`, `next_chapter`). Browse mode should use this directly for chapter navigation.

Changes:

- Expose `prev_chapter` and `next_chapter` from ESV response in the slice state or selector
- Make the ESV thunk accept a `BibleLocation` in addition to the current `Passage` type
- Centralize ESV query construction via `buildEsvQueryFromRange()`
- Preserve current content until replacement content is confirmed loaded (avoid blank flash)

### G. Keep reading plan integration thin and safe

**Primary file**

- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx`

Reading plan continues to:

- parse its configured strings
- build a daily sequence
- navigate into the shared reader via `PlanReadScreen`
- mark the day complete on final done action

**New in V1:**

- "Open in Bible" button/affordance in `PlanReadScreen` header or footer
- Tapping it navigates to the Bible tab at the chapter containing the current plan passage
- Implementation: dispatch `navigateToChapter()` with the chapter extracted from the current passage, then switch to the Bible tab

## Data Model / Route Changes

### Navigation updates

```ts
export type RootStackParamList = {
  Home: undefined;
  "Reading Plan": undefined;
  "Available Plans": undefined;
  "This Week": undefined;
  Church: undefined;
  Members: undefined;
  "Member Directory": undefined;
  "Daily Prayer": undefined;
  Read: {
    passages: Array<Passage>;
    onComplete: () => void;
  };
  Settings: undefined;
  "Account Sign In": undefined;
  SettingsView: undefined;
  "Font Size": undefined;
  "Ambient Sounds": undefined;
  Schedule: undefined;
  Signups: undefined;
  Sundays: undefined;
};
```

Key changes to the above:

- `Read` route params may be updated to reflect `PlanReadScreen` specifically
- Bible browsing does not use a pushed route — `BibleScreen` is the Bible tab root
- Resources route removed from tab navigator (remains accessible via push from This Week)

### Tab structure

```
Tabs:
  This Week → WeekStack (includes Resources link)
  Bible → BibleStack
    BibleScreen (root — reader + picker sheet)
    Reading Plan
    Available Plans
    Read (plan mode)
    Font Size
  Church → ChurchStack
  Members → MemberStack (conditional)
```

## Acceptance Criteria

### V1 core

- [ ] Bible tab shows reader at last-read location immediately on tap
- [ ] Default location is Genesis 1 when no saved state exists
- [ ] Tapping the header opens a bottom sheet with all 66 books grouped by testament
- [ ] Tapping a book in the sheet shows a chapter number grid
- [ ] Tapping a chapter navigates to that chapter and dismisses the sheet
- [ ] Previous/next chapter controls work from the reader
- [ ] Last-read Bible location persists across app restarts
- [ ] Existing reading-plan flow works without regression using shared `PassageReader`
- [ ] "Open in Bible" from plan mode navigates to the Bible tab at the relevant chapter
- [ ] Resources tab is removed; Resources accessible from This Week screen
- [ ] Numbered books and single-chapter books parse and display correctly
- [ ] Audio, commentary, and font-size features work in both plan and browse modes

### Quality / UX

- [ ] Loading transitions between adjacent chapters are stable (no blank flash on failure)
- [ ] Browse mode does not show plan-only completion UI
- [ ] Plan mode still shows plan sequence controls and completion behavior
- [ ] Bottom sheet picker is accessible (labels, focus management)
- [ ] Accessibility labels are present for chapter navigation controls

## Implementation Order

### Milestone 1 — Bible model foundation

1. Add canonical Bible book metadata in `src/constants/bibleBooks.ts`
2. Add typed Bible reference/location models in `src/types/bible.ts`
3. Add parsing/formatting/query helpers
4. Expand parser tests

### Milestone 2 — Shared reader extraction

5. Extract `PassageReader` from current `ReadScreen`
6. Refactor `ReadScreen` into `PlanReadScreen` using `PassageReader`
7. Verify reading-plan flow works identically with refactored reader

### Milestone 3 — Bible tab and browse mode

8. Add `bibleSlice` with initial state, thunks, and AsyncStorage persistence
9. Build `BibleScreen` (reader-first tab root using `PassageReader` + browse state)
10. Build `BiblePicker` bottom sheet (book list + chapter grid)
11. Wire prev/next chapter navigation using ESV metadata
12. Restore last-read location on app launch

### Milestone 4 — Tab restructure and integration

13. Rename Reading tab to Bible, restructure Bible stack
14. Remove Resources tab, add Resources link to This Week screen
15. Add "Open in Bible" affordance in `PlanReadScreen`
16. Run regression QA across plan and browse flows

## Testing Notes

### Unit tests

Add/expand tests for parsing and formatting:

- `John 3`
- `John 3:16`
- `John 3:16-17`
- `Genesis 1:1-2:3`
- `1 John 1`
- `1 Corinthians 13`
- `Jude 5-7`
- `Philemon 1-7`
- malformed references / unknown books

### Manual QA

Core browse flow:

- open Bible tab — should show Genesis 1 (first use) or last-read chapter
- tap header — bottom sheet opens with book list
- select a book — chapter grid appears
- select a chapter — reader shows that chapter
- tap next chapter several times
- tap previous chapter back
- switch to a numbered NT book like 1 John
- close and reopen app — verify last-read location restores

Reading-plan regression:

- open a plan day with multiple readings
- move next/previous within plan mode
- complete a day
- verify browse-only controls do not leak into plan mode
- verify "Open in Bible" navigates to correct chapter in Bible tab

Tab restructure regression:

- verify Resources is no longer in tab bar
- verify Resources link on This Week screen navigates correctly
- verify Bible tab appears with book icon and "Bible" label

Reader regression:

- audio still plays in both modes
- commentary still loads when available
- font-size picker still works
- safe-area / mini-player layout remains intact
- light/dark themes still render correctly
- e-ink mode renders correctly

## Dependencies & Risks

### Dependencies

- Existing ESV fetch pipeline in `src/redux/esvSlice.ts`
- Existing commentary pipeline in `src/redux/commentarySlice.ts`
- Existing reader rendering and typography settings
- A bottom sheet library (evaluate `@gorhom/bottom-sheet` or existing project dependencies)

### Risks

1. **Reader refactor causes reading-plan regressions**

   - The current reader is tightly coupled to plan-style passage sequences
   - Mitigation: extract `PassageReader` first, verify plan mode works identically before building browse mode

2. **Reference parsing remains partially stringly-typed**

   - Can create subtle bugs around numbered and single-chapter books
   - Mitigation: add parser test coverage before wiring browse mode

3. **Adjacent chapter fetch failures create blank-state transitions**

   - Especially if current content is cleared too early
   - Mitigation: preserve current content until replacement content is confirmed loaded

4. **Bottom sheet behavior differences across platforms**
   - iOS and Android may handle sheet gestures differently
   - Mitigation: use a well-maintained library, test on both platforms

## References & Research

Internal references:

- `src/screens/ReadScreen/ReadScreen.tsx`
- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx`
- `src/navigation/RootNavigator.ts`
- `src/screens/RootScreen/RootScreen.tsx`
- `src/screens/TodayScreen/TodayScreen.tsx`
- `src/redux/esvSlice.ts`
- `src/redux/commentarySlice.ts`
- `src/app/utils.ts`
- `src/app/__tests__/utils.test.ts`

Repo observations incorporated:

- `ReadScreen` already provides the right presentation layer to reuse
- `esvSlice` already exposes chapter adjacency metadata worth leveraging
- current parsing utilities are the weakest seam and should be fixed before browse flow expands
- reading-plan completion logic should stay isolated from Bible browsing state
- current tab bar has 4-5 tabs; removing Resources keeps it clean at 3-4
