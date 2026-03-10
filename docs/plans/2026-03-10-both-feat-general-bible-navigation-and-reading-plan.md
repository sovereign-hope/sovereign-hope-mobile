---
title: "both: Add General-Purpose Bible Navigation and Reading"
type: feat
platform: both
date: 2026-03-10
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

## Proposed Solution

Implement a new **Bible navigation stack** that feeds a shared reader in **browse mode**, while the existing reading-plan flow continues to use the same reader in **plan mode**.

### User-facing flow

New primary flow:

- Tap **Bible** (or rename the existing Reading tab to Bible, depending on final product choice)
- Pick a book
- Pick a chapter
- Read the chapter/passage
- Use previous/next chapter controls
- Jump back to book/chapter selection from the reader header

Existing reading-plan flow remains:

- Open the reading plan
- Tap a day
- Read through the sequence of assigned passages
- Complete the day

### Architectural approach

#### 1. Create a canonical Bible metadata layer
Add a source of truth for book order, names, abbreviations, testament grouping, and chapter counts.

#### 2. Create a structured Bible reference model
Represent Bible navigation as typed objects instead of loosely parsed strings.

#### 3. Refactor the reader into two modes
Keep one shared reader UI, but allow two container behaviors:

- **Plan mode**: next/previous passage in a defined reading sequence, optional `onComplete`
- **Browse mode**: previous/next chapter, chapter picker, book picker, persistent location

#### 4. Add Bible-specific state
Track current browse location, recent references, and last-read location separately from reading-plan progress.

#### 5. Route reading-plan reads through the shared reader
The plan feature should benefit from the reader cleanup without inheriting browse-only complexity.

## Platform Impact

| Platform | Affected | Key Files |
| -------- | -------- | --------- |
| iOS | Yes | `src/navigation/RootNavigator.ts`, `src/screens/RootScreen/RootScreen.tsx`, `src/screens/ReadScreen/ReadScreen.tsx`, new Bible screens, new Redux slice, Bible metadata/constants |
| Android | Yes | Same shared React Native implementation |
| Server | No | None |

## Cross-Platform Parity Plan

This should remain a shared React Native feature with identical navigation behavior on iOS and Android.

Parity checks:

- Same book/chapter browsing flow on both platforms
- Same previous/next chapter behavior
- Same reading typography settings in plan mode and browse mode
- Same persistence of last-read location
- Same error handling when a passage fails to load

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

**Suggested metadata shape**

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

**Suggested reference shapes**

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

### C. Add a dedicated Bible navigation stack

**Primary files**

- `src/navigation/RootNavigator.ts`
- `src/screens/RootScreen/RootScreen.tsx`

**New screens**

- `src/screens/BibleHomeScreen/BibleHomeScreen.tsx`
- `src/screens/BibleBookPickerScreen/BibleBookPickerScreen.tsx`
- `src/screens/BibleChapterPickerScreen/BibleChapterPickerScreen.tsx`

**Decision to make early**

Choose one of these product shapes:

1. **Rename existing Reading tab to Bible** and place reading-plan access inside that stack
2. **Keep Reading Plan tab and add a new Bible route elsewhere**

**Recommendation:** rename the tab to **Bible** and expose Reading Plan as a nested screen/action inside that section. That matches user expectation better and makes the Bible the first-class concept.

### D. Refactor `ReadScreen` into shared reader + mode-specific containers

**Primary file**

- `src/screens/ReadScreen/ReadScreen.tsx`

Current assumptions baked into `ReadScreen`:

- receives `passages: Array<Passage>`
- owns sequence navigation within that array
- always finishes with `onComplete`

That model is wrong for open-ended Bible use.

**Recommended refactor**

Split responsibilities into:

- **Shared presentation**: passage rendering, audio action, font size, commentary, memory-mode behavior, scroll behavior
- **Plan-mode container**: current multi-passage sequence logic
- **Browse-mode container**: current location, chapter navigation, pickers, no completion requirement

This can be done either in one file with an explicit `mode` route param or by extracting a shared reader component and keeping thin container screens.

**Recommendation:** extract shared reader presentation and keep thin plan/browse containers. Cleaner seam, less future pain.

### E. Add a dedicated Bible Redux slice

**New file**

- `src/redux/bibleSlice.ts`

**Suggested state**

```ts
export interface BibleState {
  currentLocation?: BibleLocation;
  lastReadLocation?: BibleLocation;
  recentLocations: BibleLocation[];
  isLoading: boolean;
  hasError: boolean;
}
```

**Persistence**

Store `lastReadLocation` and optionally `recentLocations` in AsyncStorage.

This gives the app an obvious “open where I left off” behavior and removes browse state from ad hoc screen-local state.

### F. Reuse `esvSlice` more effectively

**Primary file**

- `src/redux/esvSlice.ts`

The ESV response already includes chapter adjacency metadata:

- `prev_chapter`
- `next_chapter`

This should drive previous/next chapter navigation in browse mode instead of recreating edge behavior manually.

Potential follow-up cleanup:

- make the ESV thunk accept structured range input rather than only the current `Passage` type
- centralize ESV query construction in one utility
- better preserve current content if a fetch for adjacent chapter fails

### G. Keep reading plan integration thin and safe

**Primary file**

- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx`

Reading plan should continue to:

- parse its configured strings
- build a daily sequence
- navigate into the shared reader in plan mode
- mark the day complete on final done action

Possible small enhancement after parity is stable:

- add “Open in Bible” affordance from plan reading to jump into browse mode at the current passage

## Data Model / Route Changes

### Navigation updates

Add routes for:

- `Bible Home`
- `Bible Book Picker`
- `Bible Chapter Picker`
- `Read` (extended to support browse mode) or separate `Bible Read`

### Route param recommendation

If keeping one reader route, make params explicit:

```ts
Read:
  | {
      mode: "plan";
      passages: Array<Passage>;
      onComplete?: () => void;
    }
  | {
      mode: "browse";
      location: BibleLocation;
    };
```

That explicit union is better than optional loose params.

## Acceptance Criteria

### V1 core

- [ ] Users can open a Bible browsing flow from the app UI
- [ ] Users can choose a book from a canonical ordered list of all Bible books
- [ ] Users can choose a chapter valid for the selected book
- [ ] Users can read the selected chapter/passage in the existing app reading surface
- [ ] Users can move to previous and next chapters from the reader
- [ ] Users can reopen book/chapter selection from the reader
- [ ] Last-read Bible location persists across app restarts
- [ ] Existing reading-plan flow still works and uses the shared reader without regression
- [ ] Numbered books and single-chapter books parse and display correctly
- [ ] Audio, commentary, and font-size features still work in the shared reader

### Quality / UX

- [ ] Loading transitions between adjacent chapters are stable and do not leave the reader blank on failure
- [ ] Browse mode does not show plan-only completion UI
- [ ] Plan mode still shows plan sequence controls and completion behavior
- [ ] Accessibility labels are present for book/chapter picker actions and chapter navigation controls

## Implementation Order

### Milestone 1 — Bible model foundation
1. Add canonical Bible book metadata/constants
2. Add typed Bible reference/location models
3. Add parsing/formatting/query helpers
4. Expand parser tests

### Milestone 2 — Bible navigation surfaces
5. Add Bible routes and stack structure
6. Build book picker screen
7. Build chapter picker screen
8. Add initial Bible home/entry screen

### Milestone 3 — Shared reader refactor
9. Extract shared reader presentation from `ReadScreen`
10. Implement plan-mode container using current flow
11. Implement browse-mode container using location-based flow
12. Hook browse-mode to ESV metadata for previous/next chapter

### Milestone 4 — Persistence and integration
13. Add `bibleSlice` with AsyncStorage persistence
14. Restore last-read location on app open / Bible entry
15. Wire Reading Plan into refactored plan-mode container
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

- open Bible
- select Genesis 1
- move next chapter several times
- move previous chapter back
- switch to a numbered NT book like 1 John
- reopen app and verify last-read location restores

Reading-plan regression:

- open a plan day with multiple readings
- move next/previous within plan mode
- complete a day
- verify browse-only controls do not leak into plan mode

Reader regression:

- audio still plays
- commentary still loads when available
- font-size picker still works
- safe-area / mini-player layout remains intact
- light/dark themes still render correctly

## Dependencies & Risks

### Dependencies

- Existing ESV fetch pipeline in `src/redux/esvSlice.ts`
- Existing commentary pipeline in `src/redux/commentarySlice.ts`
- Existing reader rendering and typography settings

### Risks

1. **Reader refactor causes reading-plan regressions**
   - The current reader is tightly coupled to plan-style passage sequences
2. **Reference parsing remains partially stringly-typed**
   - Can create subtle bugs around numbered and single-chapter books
3. **Tab architecture becomes confusing**
   - If both Bible and Reading Plan remain top-level without a clear hierarchy
4. **Adjacent chapter fetch failures create blank-state transitions**
   - Especially if current content is cleared too early

### Mitigations

- Keep the shared reader presentational and make mode-specific logic explicit
- Add parser coverage before wiring browse mode deeply
- Make the product IA decision early (Bible as first-class section)
- Preserve current content until replacement content is confirmed loaded

## Open Questions

1. Should the current **Reading** tab become **Bible**, with Reading Plan nested inside it?
2. In browse mode, should the reader always open at whole-chapter granularity for V1, or support direct verse-range jumps immediately?
3. Should recents/history ship in V1 or wait until after core navigation is stable?
4. Should “Open in Bible” from plan mode be part of initial scope or follow immediately after?

## Recommended Scope Cut for First Ship

If schedule pressure matters, ship this as the smallest credible V1:

- canonical Bible book metadata
- robust parsing/formatting
- book picker
- chapter picker
- shared reader browse mode
- previous/next chapter
- last-read persistence
- reading-plan regression coverage

Defer:

- direct typed reference entry (`John 3:16` jump box)
- bookmarks
- verse selection/copy
- search
- history/recents UI beyond basic persistence

## References & Research

Internal references:

- `src/screens/ReadScreen/ReadScreen.tsx`
- `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx`
- `src/navigation/RootNavigator.ts`
- `src/screens/RootScreen/RootScreen.tsx`
- `src/redux/esvSlice.ts`
- `src/redux/commentarySlice.ts`
- `src/app/utils.ts`
- `src/app/__tests__/utils.test.ts`

Repo observations incorporated:

- `ReadScreen` already provides the right presentation layer to reuse
- `esvSlice` already exposes chapter adjacency metadata worth leveraging
- current parsing utilities are the weakest seam and should be fixed before browse flow expands
- reading-plan completion logic should stay isolated from Bible browsing state
