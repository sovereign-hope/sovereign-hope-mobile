---
title: "all: feat: Directory family grouping with last name sort"
type: feat
status: active
date: 2026-03-14
platform: cross-platform
origin: docs/brainstorms/2026-03-13-directory-family-grouping-brainstorm.md
---

# all: feat: Directory family grouping with last name sort

## Overview

Reorganize the member directory from a flat alphabetical list into family-grouped sections sorted by last name. Each Planning Center household becomes a collapsible section with individual members listed underneath. Single individuals render as standalone rows without redundant headers. An A-Z sidebar enables quick navigation. Search filters individual members by name and families by household name.

## Problem Statement / Motivation

The current directory is a flat list sorted by `displayName`. For a church community, families are the natural unit — members look for "the Smiths" not individual entries. The flat list makes it harder to find related people and doesn't reflect how the community thinks about its membership. Sorting by last name (instead of first-name-biased `displayName`) is the expected convention for directories.

## Platform Impact

| Platform | Affected | Key Files |
|----------|----------|-----------|
| iOS      | Yes      | `src/screens/MemberDirectoryScreen/`, `src/components/AlphabetSidebar/` |
| Android  | Yes      | Same files — single RN codebase |
| Server   | Yes      | `functions/scripts/bulk-sync-members-from-planning-center.cjs` |

## Proposed Solution

Three-phase approach: enrich data at sync time, update the data layer, then rebuild the UI.

### Phase 1: Sync Script — Enrich Firestore with Household Data

Update `functions/scripts/bulk-sync-members-from-planning-center.cjs` to pull additional fields from the Planning Center People API during member sync.

**New fields written to each member document:**

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `firstName` | `string` | PC `first_name` | Display within family sections |
| `lastName` | `string` | PC `last_name` | Sort key fallback, search |
| `householdId` | `string \| null` | PC household resource ID | Group members into families |
| `householdName` | `string \| null` | PC household `name` attribute | Section header text |
| `householdLastName` | `string \| null` | Primary member's `last_name` from PC household | Sort key for sections |
| `isHeadOfHousehold` | `boolean` | PC household primary contact flag | Order within family (head first) |

All fields are **optional** on the Firestore document for backward compatibility. The `displayName` field is retained unchanged.

**PC API calls needed:**
- `GET /people/v2/people?include=households` — fetch people with household includes
- Household primary contact is available via the household membership's `primary_contact` attribute

After script update, run a full sync to backfill all existing member documents.

### Phase 2: Data Layer — Type + Selector Changes

**2a. Extend `MemberProfile` type** (`src/services/members.ts` and `shared/types.ts`):

```typescript
export interface MemberProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: number;
  // New optional fields (see brainstorm: docs/brainstorms/2026-03-13-directory-family-grouping-brainstorm.md)
  firstName?: string;
  lastName?: string;
  householdId?: string;
  householdName?: string;
  householdLastName?: string;
  isHeadOfHousehold?: boolean;
}
```

**2b. Add grouped directory selector** (`src/redux/memberSlice.ts`):

Create a memoized selector using `createSelector` that transforms `Array<MemberProfile>` into `SectionListData`:

```typescript
type DirectorySection = {
  title: string;           // householdName or displayName for singles
  sortKey: string;         // householdLastName or lastName, uppercased
  isSingleMember: boolean; // true = render as combined row, no header
  data: Array<MemberProfile>;
};
```

**Grouping logic:**
1. Members WITH `householdId` → group by `householdId`
2. Members WITHOUT `householdId` → each becomes their own section with `isSingleMember: true`
3. Within each household: head of household first (`isHeadOfHousehold === true`), then alphabetical by `firstName` or `displayName`
4. Sections sorted alphabetically by `sortKey` (derived from `householdLastName`, falling back to `lastName`, falling back to `displayName`)
5. Members without household data sort alphabetically by `lastName` (or `displayName`) alongside family sections — no separate "Other" group

**2c. Add filtered directory selector:**

A second selector that accepts a search query and filters:
- Match `householdName` → include all members in that household
- Match individual `firstName`, `lastName`, or `displayName` → include only matching members (not the full family)
- Empty query → return all sections

### Phase 3: UI Layer

**3a. Replace `FlatList` with `SectionList`** in `MemberDirectoryScreen.tsx`:

- `renderSectionHeader` — renders household name for multi-member families; skipped for `isSingleMember` sections
- `renderItem` — renders member row (avatar + name). For `isSingleMember` sections, renders a combined row styled like a section entry
- `stickySectionHeadersEnabled` on both platforms
- `keyExtractor` using `member.uid`

**3b. Create `AlphabetSidebar` component** (`src/components/AlphabetSidebar/`):

Custom cross-platform A-Z letter strip (React Native `SectionList`'s native section index is iOS-only):
- Positioned absolutely on the right edge
- Shows all 26 letters; grays out letters with no matching sections
- Touch/pan gesture scrolls the list to the corresponding section via `SectionList.scrollToLocation()`
- Hidden when search query is non-empty
- Accessible with VoiceOver/TalkBack labels

**3c. Update search behavior:**

- Search input filters via the filtered directory selector
- When query matches a household name → show all members in that section
- When query matches an individual → show only that member (their section renders with just them)
- A-Z sidebar hides during active search

**3d. Section header design:**

- Use PC's `householdName` directly as header text
- Letter group headers (A, B, C...) as section separators above family sections sharing the same initial
- Theme-aware styling consistent with existing app patterns

## Technical Considerations

- **Firestore query unchanged:** Current `orderBy("displayName", "asc")` fetch stays the same. Grouping and re-sorting happens client-side. Church directories are small enough (under 500 members) that this is fine.
- **No Firestore index changes needed:** All new fields are written by the sync script, not queried by the app.
- **Offline behavior:** Firestore's built-in offline persistence means the directory works offline after first load. No special handling needed.
- **Performance:** `createSelector` memoization ensures grouping only recomputes when the member array changes, not on every render. Search filtering uses `useMemo` keyed on the query string.
- **Backward compatibility:** All new fields are optional. Members missing household data render as individual entries sorted alphabetically — the directory is always usable.
- **Prayer feature unaffected:** `PrayerMember` type is a subset of `MemberProfile` and doesn't reference any new fields.
- **Admin dashboard:** `shared/types.ts` gets the optional fields — admin app continues to work with no changes.

## System-Wide Impact

- **Interaction graph:** Sync script writes to Firestore → app reads on mount/refresh → selector transforms → SectionList renders. No new callbacks or middleware.
- **Error propagation:** Fetch errors handled identically to today (error state + retry). Grouping logic handles missing fields gracefully via optional chaining.
- **State lifecycle risks:** None — the member array in Redux is replaced atomically on each fetch. No partial state possible.
- **API surface parity:** The admin dashboard (`admin/src/pages/MemberListPage.tsx`) also uses `MemberProfile` from `shared/types.ts`. New fields are optional, so no breaking change.
- **Integration test scenarios:** (1) Directory renders correctly with zero household data (pre-migration). (2) Directory renders with mixed data (some members have households, some don't). (3) Search finds a member by first name within a family. (4) A-Z sidebar scrolls to correct section after grouping.

## Acceptance Criteria

- [x] Sync script pulls `firstName`, `lastName`, `householdId`, `householdName`, `householdLastName`, `isHeadOfHousehold` from PC API
- [ ] Running sync backfills all existing member documents with new fields
- [x] `MemberProfile` type extended with optional new fields in both `src/services/members.ts` and `shared/types.ts`
- [x] Directory displays family sections sorted by `householdLastName`
- [x] Section headers show PC household name
- [x] Head of household listed first within each family section
- [x] Single individuals render as combined rows (no redundant header)
- [x] Members without household data sort alphabetically by last name alongside families
- [x] A-Z sidebar enables quick jumping by letter on both iOS and Android
- [x] A-Z sidebar grays out letters with no sections; hides during search
- [x] Search by family name shows all family members
- [x] Search by individual name shows only matching members
- [x] Pull-to-refresh works with new grouped layout
- [x] Loading and error states unchanged
- [x] Dark mode styling works for new section headers and sidebar
- [x] Existing prayer feature and admin dashboard unaffected
- [ ] Cross-platform parity verified (iOS and Android)

## Success Metrics

- Directory is browsable by family — members can find a family in under 3 seconds using A-Z index
- Search works for both family and individual lookups
- No performance regression on directory load or scroll

## Dependencies & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| PC API doesn't expose household data as expected | Low | PC People API documents household includes; verify with a test API call first |
| Large families (10+ members) cause long sections | Low | Sticky headers keep context; no collapse needed for typical church sizes |
| A-Z sidebar gesture conflicts with scroll on Android | Medium | Test on multiple Android devices; use `PanResponder` with proper gesture priority |
| Sync script takes too long with household includes | Low | Paginated fetching already in place; household data is included in the same response |

## Cross-Platform Parity Plan

Single React Native codebase — one implementation serves both iOS and Android. The only platform divergence is the `AlphabetSidebar`, which must be custom on both platforms (no native SectionList index on Android). Test on both platforms to verify gesture handling and sticky header behavior.

## Implementation Order

1. **Sync script update** — Add PC household data to sync payload. Run backfill. Verify Firestore documents.
2. **Type changes** — Extend `MemberProfile` in `src/services/members.ts` and `shared/types.ts`.
3. **Selector** — Add `selectGroupedDirectory` and `selectFilteredDirectory` selectors to `memberSlice.ts`.
4. **AlphabetSidebar component** — Build and test in isolation.
5. **MemberDirectoryScreen rewrite** — Replace FlatList with SectionList, wire up selectors and sidebar.
6. **Search update** — Update search to use filtered selector with family/individual matching.
7. **Polish** — Dark mode, accessibility labels, edge cases (empty directory, no household data).
8. **Cross-platform testing** — Verify on iOS and Android devices.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-13-directory-family-grouping-brainstorm.md](docs/brainstorms/2026-03-13-directory-family-grouping-brainstorm.md) — Key decisions: enrich at sync time (not separate collection), use PC households, head of household first, PC household name for headers.
- Existing SectionList pattern: `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx`
- Current directory: `src/screens/MemberDirectoryScreen/MemberDirectoryScreen.tsx`
- Sync script: `functions/scripts/bulk-sync-members-from-planning-center.cjs`
- Member service: `src/services/members.ts`
- Redux slice: `src/redux/memberSlice.ts`
