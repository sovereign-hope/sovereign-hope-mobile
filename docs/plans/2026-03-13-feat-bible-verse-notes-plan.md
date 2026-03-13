---
title: "feat: Add Bible Verse Notes"
type: feat
status: active
date: 2026-03-13
platform: cross-platform
---

# feat: Add Bible Verse Notes

## Overview

Add personal note-taking functionality attached to Bible verse ranges. Users can write free-text notes on any verse or verse range while reading Scripture. Notes sync across devices using the same local-first Firestore pattern established by the highlights feature.

## Problem Statement / Motivation

The app supports highlighting verses but lacks a way for users to capture personal reflections, study notes, or sermon insights tied to specific passages. Notes are a natural companion to highlights and complete the Bible study workflow.

## Proposed Solution

Mirror the highlights architecture exactly:

| Layer             | Highlights (existing)                                 | Notes (new)                   |
| ----------------- | ----------------------------------------------------- | ----------------------------- |
| Type              | `src/types/highlights.ts`                             | `src/types/notes.ts`          |
| Redux slice       | `src/redux/highlightsSlice.ts`                        | `src/redux/notesSlice.ts`     |
| Firestore service | `src/services/highlights.ts`                          | `src/services/notes.ts`       |
| Local storage     | `src/services/highlightsLocal.ts`                     | `src/services/notesLocal.ts`  |
| Sync hook         | `src/hooks/useHighlightsSync.ts`                      | `src/hooks/useNotesSync.ts`   |
| Actions hook      | `src/components/PassageReader/useHighlightActions.ts` | `src/hooks/useNoteActions.ts` |
| List screen       | `src/screens/HighlightsScreen/`                       | `src/screens/NotesScreen/`    |

## Technical Considerations

- **Data model**: A `Note` is structurally similar to a `Highlight` but replaces `color` with `text` (string). Same verse-range anchoring (bookId, chapter, startVerse, endVerse).
- **Firestore**: New `users/{uid}/notes` subcollection, following the same `onSnapshot` real-time pattern.
- **Local-first**: AsyncStorage persistence with debounced write-through, same as highlights.
- **Entry point**: Add a "Notes" button to the BibleScreen toolbar. Tapping opens the NotesScreen. A verse-level entry point (e.g., from the highlight color picker or a separate gesture) can create a note for a specific verse range.
- **Note editing**: A simple modal or screen with a TextInput for the note body, showing the verse reference as a header.
- **Redux store**: Add `notesReducer` to the store configuration.
- **Cleanup**: Update `deleteRemoteUserData` and `clearLocalSyncedData` in `src/services/sync.ts` to include notes.

## System-Wide Impact

- **Interaction graph**: Note CRUD dispatches Redux actions + fire-and-forget Firestore writes (same as highlights). useNotesSync subscribes to Firestore `onSnapshot` when authenticated.
- **Error propagation**: Firestore write failures are logged but don't block the UI (fire-and-forget pattern). AsyncStorage failures are caught and warned.
- **State lifecycle risks**: Sign-out clears local notes (same as highlights) to prevent data leakage on shared devices.
- **API surface parity**: Notes follow the same patterns as highlights, so no divergence risk.
- **Integration test scenarios**: Sign-in merge (local notes pushed to Firestore), sign-out clearing, real-time sync from another device.

## Acceptance Criteria

- [x] `Note` type defined in `src/types/notes.ts`
- [x] `notesSlice` with CRUD reducers and selectors in `src/redux/notesSlice.ts`
- [x] Firestore service for notes CRUD in `src/services/notes.ts`
- [x] AsyncStorage persistence in `src/services/notesLocal.ts`
- [x] Local-first sync hook in `src/hooks/useNotesSync.ts`
- [x] Note actions hook in `src/hooks/useNoteActions.ts`
- [x] NotesScreen listing all notes grouped by Bible book in `src/screens/NotesScreen/`
- [x] "Notes" route added to navigation
- [x] "Notes" toolbar action added to BibleScreen
- [x] Note editor UI (modal or screen) for creating/editing note text
- [x] Notes reducer registered in store
- [x] `deleteRemoteUserData` and `clearLocalSyncedData` updated for notes
- [x] useNotesSync called from app root (same location as useHighlightsSync)
- [x] Tapping a note in NotesScreen navigates to the passage
- [x] Empty state shown when no notes exist
- [x] Tests pass, build succeeds, lint passes

## Success Metrics

- Users can create, edit, and delete notes on Bible verses
- Notes persist locally and sync across devices when signed in
- Notes survive app restart (AsyncStorage) and sign-out/sign-in cycle (Firestore)

## Dependencies & Risks

- **No new dependencies** -- uses existing Firebase, AsyncStorage, Redux Toolkit
- **Risk: Note text length** -- TextInput should have a reasonable max length to avoid Firestore document size issues (16KB is safe)
- **Risk: Migration** -- No migration needed; this is purely additive (new subcollection, new AsyncStorage key)

## Sources & References

- Highlights implementation: `src/redux/highlightsSlice.ts`, `src/services/highlights.ts`, `src/hooks/useHighlightsSync.ts`
- Highlights type: `src/types/highlights.ts`
- BibleScreen toolbar: `src/screens/BibleScreen/BibleScreen.tsx:307-365`
- Sync cleanup: `src/services/sync.ts:295-343`
