# initialNumToRender={400} Defeats Virtualization

---

status: completed
priority: P0-performance
issue_id: PERF-001
tags:

- performance
- react-native
- sectionlist
- virtualization

---

## Problem Statement

`SectionList` with `initialNumToRender={400}` renders all 365 days upfront, defeating virtualization and causing significant performance degradation on app launch.

## Findings

**File**: `src/screens/ReadingPlanScreen/ReadingPlanScreen.tsx` (line 315)

```typescript
<SectionList
  // ...
  initialNumToRender={400} // Renders ALL items, no virtualization
  // ...
/>
```

### Impact

- ~365 list items rendered on mount
- Each item includes multiple Text components, Icons, Pressables
- Delays Time-to-Interactive significantly
- Memory usage spikes during initial render
- Battery drain from unnecessary rendering

### Expected Behavior

React Native's virtualization should only render items visible in viewport + buffer.

## Proposed Solution

Reduce to standard value (10-15) and rely on virtualization:

```typescript
<SectionList
  // ...
  initialNumToRender={15}
  windowSize={21} // Optional: control render window
  maxToRenderPerBatch={10} // Optional: batch size
  // ...
/>
```

### Handle scrollToLocation

The high value was likely set to prevent `scrollToLocation` failures. Better solutions:

```typescript
// Option 1: Use getItemLayout for predictable item heights
getItemLayout={(data, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index + HEADER_HEIGHT * sectionIndex,
  index,
})}

// Option 2: Handle scroll failure gracefully (already implemented)
onScrollToIndexFailed={() => {
  // Already has empty handler - could add retry logic
}}
```

## Technical Details

- SectionList documentation recommends initialNumToRender ~10
- Current implementation: 365+ items in 52+ sections
- Each ReadingPlanListItem has ~15 native view components

## Acceptance Criteria

- [ ] `initialNumToRender` reduced to 10-15
- [ ] `getItemLayout` implemented for fixed-height items
- [ ] Scroll-to-current-week still works
- [ ] Performance tested on low-end device
