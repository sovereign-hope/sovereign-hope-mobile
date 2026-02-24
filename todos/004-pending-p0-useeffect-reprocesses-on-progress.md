# useEffect Reprocesses All Days on Every Progress Change

---

status: completed
priority: P0-performance
issue_id: PERF-002
tags:

- performance
- react
- useEffect
- optimization

---

## Problem Statement

The `useEffect` in `ReadingPlanScreen` that transforms reading plan data depends on `readingPlanProgress`, causing it to reprocess all 365 days every time a single day is marked complete.

## Findings

**File**: `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx` (lines 178-229)

```typescript
useEffect(() => {
  if (readingPlan) {
    const data = readingPlan.weeks.map((week, weekIndex) => {
      // Maps through ALL 365+ days
      const nonEmptyDays = week.days.map((day, dayIndex) => {
        // ...lookups into readingPlanProgress for isComplete
      });
      // ...more processing
    });
    setListData(data);
  }
}, [readingPlan, readingPlanProgress]); // Triggers on ANY progress change
```

### Impact

- User taps checkbox → triggers progress update
- Progress update → triggers useEffect
- useEffect → remaps all 365 days
- Sets new listData → causes SectionList re-render
- Visible as checkbox lag, especially on older devices

## Proposed Solution

### Option A: Decouple Progress from List Data

Store progress lookup separately, compute isComplete in render:

```typescript
// Only reprocess when plan structure changes
useEffect(() => {
  if (readingPlan) {
    const data = readingPlan.weeks.map((week, weekIndex) => ({
      title: `Week ${weekIndex + 1} - ${dayOfYearToDate(...)}`,
      data: week.days
        .map((day, dayIndex) => ({ ...day, weekIndex, originalDayIndex: dayIndex }))
        .filter(day => day.reading.length > 0 && day.reading[0] !== ""),
    }));
    setListData(data);
  }
}, [readingPlan]);  // Only depends on plan, not progress

// In list item, compute isComplete from progress
const isComplete = readingPlanProgress?.weeks[item.weekIndex]
  ?.days[item.originalDayIndex]?.isCompleted ?? false;
```

### Option B: Memoize the Computation

```typescript
const listData = useMemo(() => {
  // ... transformation logic
}, [readingPlan, readingPlanProgress]);
```

Note: This still recomputes on progress change but avoids re-render if result is equal.

### Option C: Extract isComplete Lookup

Keep structure stable, only update isComplete via selector in each item.

## Technical Details

- 53 weeks × 7 days = 371 potential items
- Each transform involves multiple map/filter operations
- Progress changes happen frequently (user interaction)

## Acceptance Criteria

- [ ] Checking a day off doesn't reprocess entire list
- [ ] No visible lag when tapping checkbox
- [ ] List data structure only updates when plan changes
- [ ] Progress still reflects correctly in UI
