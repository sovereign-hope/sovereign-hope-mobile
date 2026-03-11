---
title: "all: Add Bible Verse Highlights"
type: feat
status: completed
date: 2026-03-10
platform: cross-platform
---

# all: Add Bible Verse Highlights

## Overview

Add verse-level highlighting to the Bible reading experience, allowing users to tap verses to highlight them with preset colors, select verse ranges, and manage highlights across sessions. Highlights sync to Firebase and appear in both Bible browse and reading plan modes since both share the `PassageReader` component.

## Problem Statement / Motivation

Users currently read Bible passages with no way to mark or annotate meaningful verses. Highlighting is a fundamental feature in Bible apps that supports study, reflection, and recall. The existing `PassageReader` component renders ESV HTML with rich styling but has no interactivity beyond scrolling and footnote expansion.

## Proposed Solution

### Interaction Model

1. **Tap a verse** → highlights it in the default color (yellow)
2. **Tap a second verse** (while first is selected) → highlights the full range between both verses
3. **Long-press an existing highlight** → opens color picker with option to change color or remove
4. **Highlights list screen** → dedicated view showing all highlights grouped by book, with navigation to source passage

### Color Palette

5 preset colors, no custom colors:

| Name   | Light Mode | Dark Mode |
| ------ | ---------- | --------- |
| Yellow | `#FFE08A`  | `#78680A` |
| Green  | `#B7F5C8`  | `#1A5C2D` |
| Blue   | `#BFDBFE`  | `#1E3A5F` |
| Pink   | `#FBCFE8`  | `#7C2D5C` |
| Orange | `#FED7AA`  | `#7C3A0A` |

### Data Model

```typescript
// src/types/highlights.ts

export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export type Highlight = {
  /** Firestore document ID */
  id: string;
  /** ESV book ID, e.g. "JHN" */
  bookId: string;
  /** Chapter number */
  chapter: number;
  /** First verse in the highlighted range */
  startVerse: number;
  /** Last verse in the highlighted range (same as startVerse for single verse) */
  endVerse: number;
  /** Highlight color name */
  color: HighlightColor;
  /** Unix timestamp (ms) */
  createdAt: number;
  /** Unix timestamp (ms) */
  updatedAt: number;
};

/**
 * Lookup map for fast rendering: "JHN:3:16" → HighlightColor
 * Built from the highlights array for O(1) verse lookups during render.
 */
export type HighlightLookup = Record<string, HighlightColor>;
```

## Platform Impact

| Platform | Affected | Key Files                             |
| -------- | -------- | ------------------------------------- |
| iOS      | Yes      | PassageReader, new screens/components |
| Android  | Yes      | Same — shared React Native codebase   |
| Server   | No       | Firebase Firestore (client SDK only)  |

## Technical Considerations

### ESV HTML Verse Identification

The ESV API returns structured HTML where each verse paragraph has a predictable ID:

```html
<p id="p43003016_01-1" class="virtual">
  <b class="verse-num" id="v43003016-1">16 </b>
  For God so loved the world...
</p>
```

- **Paragraph ID pattern**: `p{BBCCCVVV}_{segment}-{part}` where BB=book, CCC=chapter, VVV=verse
- **Verse number ID pattern**: `v{BBCCCVVV}-{part}`
- A single verse can span multiple `<p>` elements (poetry, prose wrapping) — all share the same verse number prefix
- The `class="virtual"` identifies verse-content paragraphs vs. headings/footnotes

### Custom Renderer Approach

Use RNRH's custom block renderer system to intercept `<p class="virtual">` elements:

```typescript
// Pseudocode for PassageReader integration
const PRenderer: CustomBlockRenderer = ({
  TDefaultRenderer,
  tnode,
  ...props
}) => {
  if (!tnode.hasClass("virtual")) {
    return <TDefaultRenderer tnode={tnode} {...props} />;
  }

  // Extract verse ID: "p43003016_01-1" → "43003016" → book=43, ch=3, v=16
  const match = tnode.id?.match(/^p(\d{2})(\d{3})(\d{3})/);
  if (!match) return <TDefaultRenderer tnode={tnode} {...props} />;

  const verseKey = buildVerseKey(match); // "JHN:3:16"
  const highlightColor = highlightLookup[verseKey];

  return (
    <Pressable
      onPress={() => handleVerseTap(verseKey)}
      onLongPress={() => handleVerseLongPress(verseKey)}
      delayLongPress={400}
    >
      <TDefaultRenderer
        tnode={tnode}
        {...props}
        style={[
          props.style,
          highlightColor && {
            backgroundColor: HIGHLIGHT_COLORS[highlightColor],
            borderRadius: 4,
          },
        ]}
      />
    </Pressable>
  );
};
```

**Key constraint**: The `renderers` object must be memoized to prevent `TRenderEngine` rebuilds. The highlight lookup map should be a stable reference that updates only when highlights for the current chapter change.

### Multi-Paragraph Verses

Some verses span multiple `<p>` elements (especially poetry). Since all paragraphs for the same verse share the `p{BBCCCVVV}` prefix, they will all receive the same highlight color automatically.

### Firebase Data Model

```
users/{uid}/highlights/{highlightId}
  bookId: string
  chapter: number
  startVerse: number
  endVerse: number
  color: string
  createdAt: Timestamp
  updatedAt: Timestamp
```

**Querying**:

- By book: `where("bookId", "==", bookId)` — for highlights list grouping
- By chapter: `where("bookId", "==", bookId).where("chapter", "==", chapter)` — for rendering
- Composite index on `(bookId, chapter)` for efficient chapter-level queries

**Sync strategy**: Fetch all user highlights on app launch into Redux, then listen for real-time updates with `onSnapshot`. Writes go to Firestore immediately (optimistic updates in Redux).

### Offline Behavior

Firebase Firestore's built-in offline persistence handles this automatically. Highlights created offline queue and sync when connectivity returns. Redux state is the source of truth for rendering.

### Performance

- The `HighlightLookup` map is rebuilt only when highlights for the visible chapter change
- Custom renderer adds minimal overhead (one map lookup per `<p>` element)
- Avoid using `idsStyles` (causes full `TRenderEngine` rebuild on every change)

## System-Wide Impact

- **Interaction graph**: Verse tap → Redux dispatch → Firestore write → `onSnapshot` listener → Redux update → PassageReader re-render (via selector). The `PassageReader` already re-renders on ESV data changes, so highlight updates follow the same path.
- **Error propagation**: Firestore write failures are handled by Firebase's retry mechanism. Redux optimistic update means UI stays responsive even if the write is pending.
- **State lifecycle risks**: Minimal — highlights are additive. Deleting a highlight that was already synced removes it from Firestore. No orphan risk since highlights are self-contained documents.
- **API surface parity**: Both `BibleScreen` and `ReadScreen` use `PassageReader`, so highlights appear consistently. The `passageData` prop override path in `ReadScreen` needs the same renderer.
- **Integration test scenarios**:
  1. Highlight a verse in Bible browse → navigate to reading plan with same chapter → verify highlight appears
  2. Highlight a range (tap verse 3, tap verse 7) → verify verses 3–7 all highlighted
  3. Create highlight offline → reconnect → verify synced to Firestore
  4. Long-press highlight → change color → verify update persists

## Acceptance Criteria

### Functional

- [x] User can tap a verse paragraph to highlight it with the default color (yellow)
- [x] User can tap a second verse to create a range highlight (all verses between first and second tap)
- [x] User can long-press an existing highlight to open a color picker (5 colors)
- [x] User can change highlight color via the picker
- [x] User can remove a highlight via the picker (delete option)
- [x] Highlights persist across app sessions via Firebase
- [x] Highlights appear in both Bible browse mode and reading plan mode
- [x] Highlights render correctly in light mode, dark mode, and e-ink mode
- [x] Multi-paragraph verses (poetry) are fully highlighted
- [x] Highlights list screen shows all highlights grouped by book
- [x] Tapping a highlight in the list navigates to the highlighted passage
- [ ] User can delete highlights from the list screen (deferred — delete via color picker only)

### Non-Functional

- [ ] Highlight rendering adds < 16ms overhead per chapter (no visible jank)
- [x] Works offline — highlights created offline sync when connection returns
- [x] No regression in existing PassageReader behavior (footnotes, commentary, scrolling)
- [x] Cross-platform parity verified (iOS and Android) — shared React Native codebase

## Success Metrics

- Feature adoption: % of active users who create at least one highlight within 30 days
- Engagement: average number of highlights per user per week
- Retention signal: users with highlights return more frequently than those without

## Dependencies & Risks

| Risk                                                  | Likelihood | Impact | Mitigation                                                               |
| ----------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------ |
| RNRH custom renderer performance with many highlights | Low        | Medium | Use memoized lookup map, not `idsStyles`                                 |
| ESV HTML structure changes breaking verse ID parsing  | Low        | High   | Pin ESV API version, add fallback for unrecognized IDs                   |
| Multi-paragraph verse ID ambiguity                    | Low        | Medium | Parse all `p.virtual` IDs, group by verse number prefix                  |
| Firestore cost with many highlights                   | Low        | Low    | Highlights are small documents; reads cached offline                     |
| Tap gesture conflicts with existing text selection    | Medium     | Medium | Use `onPress`/`onLongPress` on `Pressable` wrapper, not RNRH's `onPress` |

## Implementation Order

### 1. Foundation (Types + Redux + Firebase)

Create the data model, Redux slice, and Firebase service:

- `src/types/highlights.ts` — `Highlight`, `HighlightColor`, `HighlightLookup` types
- `src/redux/highlightsSlice.ts` — state, selectors (`selectHighlightsForChapter`, `selectHighlightLookup`), actions (`addHighlight`, `removeHighlight`, `updateHighlightColor`)
- `src/services/highlights.ts` — Firestore CRUD + `onSnapshot` listener
- `src/app/store.ts` — register `highlights` reducer
- `src/constants/highlights.ts` — color palette constants (light/dark values)

### 2. Inline Rendering (PassageReader Integration)

Add highlight display and tap interaction to the existing reading experience:

- `src/components/PassageReader/PassageReader.tsx` — custom `p` renderer with `Pressable` wrapper
- `src/components/PassageReader/useHighlightRenderer.ts` — hook encapsulating renderer logic + verse tap state machine (idle → first-verse-selected → range-committed)
- `src/components/PassageReader/highlightUtils.ts` — verse ID parsing from ESV HTML (`parseVerseId`, `buildVerseKey`, `bookNumberToId`)

### 3. Color Picker UI

- `src/components/HighlightColorPicker/HighlightColorPicker.tsx` — bottom sheet with 5 color circles + delete button
- `src/components/HighlightColorPicker/HighlightColorPicker.styles.ts` — colocated styles

### 4. Highlights List Screen

- `src/screens/HighlightsScreen/HighlightsScreen.tsx` — SectionList grouped by book, shows verse reference + color indicator + preview text
- `src/screens/HighlightsScreen/HighlightsScreen.styles.ts` — colocated styles
- Navigation registration in `RootScreen.tsx` — accessible from Bible tab header or settings

### 5. Polish & Testing

- Dark mode / e-ink color validation
- Haptic feedback on highlight creation (match existing app patterns)
- Empty state for highlights list
- Jest tests for `highlightsSlice` reducers and selectors
- Jest tests for `highlightUtils` verse ID parsing
- Integration testing across both reading modes

## Sources & References

### Internal References

- PassageReader component: `src/components/PassageReader/PassageReader.tsx`
- Bible types: `src/types/bible.ts`
- ESV slice (API integration): `src/redux/esvSlice.ts`
- Bible slice (browse state): `src/redux/bibleSlice.ts`
- Firebase config: `src/config/firebase.ts`
- Sync service (pattern reference): `src/services/sync.ts`
- Store config: `src/app/store.ts`

### External References

- ESV API HTML endpoint: `https://api.esv.org/docs/passage-html/`
- react-native-render-html v6 custom renderers: `https://meliorence.github.io/react-native-render-html/docs/guides/custom-renderers`
- Firebase Firestore offline persistence: `https://firebase.google.com/docs/firestore/manage-data/enable-offline`
