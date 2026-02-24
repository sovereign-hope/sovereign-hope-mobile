# Array.fill() Shared Reference Bug in blankState

---

status: completed
priority: P1-critical
issue_id: DATA-001
tags:

- data-integrity
- redux
- javascript-gotcha

---

## Problem Statement

`Array.fill()` with objects creates shared references, meaning marking one day complete could mark multiple days complete due to object mutation.

## Findings

**File**: `src/redux/readingPlanSlice.ts` (lines 188-197)

```typescript
const blankState = {
  // 53 weeks to handle years with 53 weeks
  weeks: Array(53).fill({
    // BUG: All 53 weeks share SAME object
    days: Array(7).fill({
      // BUG: All 7 days share SAME object
      isCompleted: false,
    }),
  }),
};
```

### How It Fails

```typescript
// This mutation affects ALL weeks and ALL days:
blankState.weeks[0].days[0].isCompleted = true;
// Now EVERY day in EVERY week shows as completed
```

### Why It Hasn't Crashed Yet

The deep clone in `storeReadingPlanProgressState` creates separate objects:

```typescript
JSON.parse(JSON.stringify(readingPlanProgress)) as ReadingPlanProgressState;
```

But relying on this is fragile - any direct reference manipulation will cause data corruption.

## Proposed Solution

Use `Array.from()` with factory function to create unique objects:

```typescript
const blankState: ReadingPlanProgressState = {
  weeks: Array.from({ length: 53 }, () => ({
    days: Array.from({ length: 7 }, () => ({
      isCompleted: false,
    })),
  })),
};
```

Or use map with spread:

```typescript
const blankState: ReadingPlanProgressState = {
  weeks: [...Array(53)].map(() => ({
    days: [...Array(7)].map(() => ({
      isCompleted: false,
    })),
  })),
};
```

## Technical Details

- Location: `getReadingPlanProgressState` async thunk
- Risk: Data corruption if any code path mutates without deep clone
- Related: Similar pattern was already fixed in `sendPlanToFirestore.gs` (line 56-62)

## Acceptance Criteria

- [ ] `Array.fill()` replaced with `Array.from()` factory pattern
- [ ] Unit test added verifying weeks are independent objects
- [ ] Unit test verifying days within weeks are independent
