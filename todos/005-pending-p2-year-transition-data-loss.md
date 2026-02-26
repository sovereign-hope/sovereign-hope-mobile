# Year Transition May Lose Progress Data

---

status: pending
priority: P2-major
issue_id: DATA-002
tags:

- data-integrity
- year-transition
- asyncstorage
- edge-case

---

## Problem Statement

When a multi-year plan (like Two Year Bible "2025.1") transitions to the new year ("2026.1"), the old progress data may be orphaned if not migrated.

## Findings

**File**: `src/redux/readingPlanSlice.ts`

The auto-upgrade logic updates the subscribed plan ID:

```typescript
if (isMultiYearPlan(subscribedPlan) && planYear < currentYear) {
  const newPlanId = getUpdatedPlanId(subscribedPlan, currentYear);
  void dispatch(storeSubscribedPlans([newPlanId]));
  subscribedPlan = newPlanId;
}
```

But AsyncStorage keys are plan-ID-specific:

```typescript
await AsyncStorage.setItem(`@readingPlanState${subscribedPlan}`, jsonValue);
```

### Scenario

1. User has `@readingPlanState2025.1` with 52 weeks of progress
2. Year changes to 2026
3. Plan ID updates to "2026.1"
4. New storage key: `@readingPlanState2026.1` (empty)
5. Old progress in `@readingPlanState2025.1` is orphaned

### Expected Behavior for Two Year Bible

This may be intentional - year 2 should start fresh. But it should be documented and/or confirmed.

## Proposed Solutions

### If Fresh Start is Intended (Two Year Bible)

Add documentation explaining this is expected behavior:

```typescript
// For multi-year plans, use current year's plan ID for progress storage
// This ensures year 2 of a Two Year Bible gets fresh progress (by design)
if (isMultiYearPlan(subscribedPlan)) {
  subscribedPlan = getUpdatedPlanId(subscribedPlan, currentYear);
}
```

### If Progress Should Persist

Migrate progress data on year transition:

```typescript
if (isMultiYearPlan(subscribedPlan) && planYear < currentYear) {
  const newPlanId = getUpdatedPlanId(subscribedPlan, currentYear);
  const oldKey = `@readingPlanState${subscribedPlan}`;
  const newKey = `@readingPlanState${newPlanId}`;

  // Migrate if new key doesn't exist
  const existingNew = await AsyncStorage.getItem(newKey);
  if (!existingNew) {
    const oldProgress = await AsyncStorage.getItem(oldKey);
    if (oldProgress) {
      await AsyncStorage.setItem(newKey, oldProgress);
    }
  }
}
```

## Technical Details

- AsyncStorage key format: `@readingPlanState{planId}`
- Multi-year plans: ID ends with `.1` (e.g., "2025.1", "2026.1")
- One-year plans: ID ends with `.2` (e.g., "2025.2")

## Acceptance Criteria

- [ ] Documented whether Two Year Bible progress should reset or persist
- [ ] If persist: Migration logic implemented
- [ ] If reset: Comment explaining this is intentional
- [ ] Edge case tested: User opens app on Jan 1 after year transition
