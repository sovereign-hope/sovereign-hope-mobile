---
title: "server: Smart Prayer Queue Assignments"
type: feat
status: active
date: 2026-03-16
platform: server
origin: docs/brainstorms/2026-03-16-smart-prayer-assignments-brainstorm.md
---

# server: Smart Prayer Queue Assignments

## Overview

Replace the random (Fisher-Yates shuffle) prayer assignment algorithm with a queue-based system that maximizes prayer coverage across the entire congregation. The system tracks when each member was last prayed for and coordinates assignments across all users to minimize same-day duplication.

With ~230 members and ~15 active app users (45 assignments/day), the queue approach cycles through the full congregation in ~5 days instead of leaving coverage to chance.

## Problem Statement / Motivation

The current algorithm in `generateDailyPrayerAssignments` (functions/index.js:384-456) has no memory of past assignments. Each day, it independently shuffles and picks 3 random members per user. This means:

- Some members may go weeks without being prayed for
- Others may be assigned to multiple users on the same day
- No guarantee of congregation-wide coverage over time
- The "prayer net" has holes that pure randomness cannot fill

The goal is fair, complete coverage: every member gets prayed for before anyone gets a second round.

(see brainstorm: docs/brainstorms/2026-03-16-smart-prayer-assignments-brainstorm.md)

## Proposed Solution

### New Firestore Collection: `prayerQueue`

A single document per member tracking prayer coverage state.

**Path:** `prayerQueue/{memberId}`

```javascript
{
  memberId: "abc123",           // matches members/{memberId}
  lastPrayedFor: Timestamp,     // when this member was last assigned for prayer
  assignmentCount: 0            // total times assigned (for observability)
}
```

**Lazy creation:** No proactive document creation needed. The daily function treats missing entries as `lastPrayedFor = 0` (epoch), placing new members at the top of the queue automatically.

### Rewritten Algorithm

```
1. Fetch all members from members/ collection
2. Fetch all prayerQueue/ documents → build Map<memberId, lastPrayedFor>
3. Build assignees list via existing buildAssigneesByUid()
4. Sort all members by lastPrayedFor ASC (missing/0 = top of queue)
5. Shuffle active users (Fisher-Yates) to randomize processing order
6. Initialize takenToday = Set()
7. For each user in shuffled order:
   a. Filter sorted queue: remove self (via linkedUid), remove takenToday members
   b. Pick top min(3, filtered.length) from filtered queue
   c. Add picked memberIds to takenToday
   d. Build assignment payload (same shape as today)
8. Batch write all assignments to prayerAssignments/{date}/assignments/{uid}
9. Batch write date doc to prayerAssignments/{date}
10. Batch update prayerQueue/{memberId}.lastPrayedFor = now() for all assigned members
11. Increment prayerQueue/{memberId}.assignmentCount for all assigned members
```

**Same output shape:** The `prayerAssignments/{date}/assignments/{uid}` document structure is unchanged. No client modifications needed.

## Technical Considerations

### Architecture

- **Server-only change.** All modifications are in `functions/index.js` and `firestore.rules`. No changes to client services, Redux, or UI.
- **Same batch write pattern.** Reuse the existing flush-at-450 pattern for Firestore batch operations (functions/index.js:25).
- **Atomic writes.** Assignments + queue updates written in a single batch commit sequence. With 15 users x 3 assignments + 45 queue updates = ~105 operations — well within the 450 batch limit.

### Functions to Modify

| Function                         | File               | Lines   | Change                                 |
| -------------------------------- | ------------------ | ------- | -------------------------------------- |
| `generateDailyPrayerAssignments` | functions/index.js | 384-456 | Rewrite core algorithm                 |
| `requestDailyPrayerAssignment`   | functions/index.js | 458-537 | Add queue-aware on-demand logic        |
| `buildPrayerAssignmentPayload`   | functions/index.js | 130-153 | Replace random shuffle with queue pick |
| `cleanupOldPrayerAssignments`    | functions/index.js | 679-731 | No change (does not touch prayerQueue) |

### New Helper Functions

| Function                   | Purpose                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `fetchPrayerQueueState()`  | Fetch all prayerQueue docs, return Map<memberId, { lastPrayedFor, assignmentCount }> |
| `buildSortedMemberQueue()` | Sort members by lastPrayedFor ASC, with missing entries treated as epoch 0           |
| `pickFromQueue()`          | Given sorted queue, takenToday set, and self-exclusion uid, return top N members     |
| `updatePrayerQueueBatch()` | Batch update lastPrayedFor and assignmentCount for assigned members                  |

### On-Demand Callable (`requestDailyPrayerAssignment`)

The callable needs queue awareness for single-user generation:

1. Check if assignment already exists for today (existing behavior — idempotent)
2. If missing: fetch prayerQueue state
3. Read today's existing assignments to derive `takenToday` set (handles case where scheduled run already populated other users)
4. Pick from queue excluding self and takenToday
5. Write assignment + update queue in a single batch

**Race condition handling:** The existing `assignmentRef.create()` pattern (line 517) already handles concurrent calls — `create()` fails with `ALREADY_EXISTS` if another call wins. This remains unchanged.

### Performance

- **Reads:** 2 collection fetches (members + prayerQueue) instead of 1. With 230 members, this adds ~230 document reads. Firestore pricing: negligible at this scale.
- **Writes:** Same assignment writes as before, plus ~45 queue updates per day. Well within free tier.
- **Execution time:** Sequential user processing adds minimal overhead. 15 users x queue sort is O(n log n) where n=230. Total function runtime stays well under the 540s Cloud Functions v2 timeout.

### Security

**New Firestore rules for `prayerQueue`:**

```javascript
match /prayerQueue/{memberId} {
  // Server-only collection. No client reads or writes.
  allow read: if false;
  allow write: if false;
}
```

The `prayerQueue` collection is purely server-side infrastructure. Cloud Functions use the Admin SDK which bypasses security rules.

### Idempotency

- **Scheduled function:** Add a guard at the top — check if `prayerAssignments/{today}` parent doc already exists. If it does, log and exit early. This prevents duplicate generation on Cloud Scheduler retries.
- **On-demand callable:** Already idempotent via `assignmentRef.create()` pattern.

## System-Wide Impact

- **Interaction graph:** Cloud Scheduler triggers `generateDailyPrayerAssignments` daily. The function reads `members/` and `prayerQueue/`, writes `prayerAssignments/{date}/` and `prayerQueue/`. No callbacks, middleware, or observers are affected. The client reads `prayerAssignments/{date}/assignments/{uid}` — same path, same shape.
- **Error propagation:** If the function fails, no assignments are generated (same as today). Firestore batch writes are atomic within each batch. The on-demand callable serves as a fallback for users who don't have assignments.
- **State lifecycle risks:** Partial batch failure could leave assignments written but queue not updated. Mitigation: write assignments and queue updates in the same batch. If batch fails, nothing is written — retry is safe.
- **API surface parity:** Only the Cloud Functions are affected. The client service layer (`src/services/members.ts`) reads the same Firestore path and document shape. No changes needed.
- **Integration test scenarios:**
  1. Scheduled run generates assignments for all users with no same-day dupes
  2. On-demand call after scheduled run returns existing assignment (idempotent)
  3. On-demand call before scheduled run creates assignment; scheduled run skips that user
  4. New member with no queue entry gets prioritized
  5. Cold start (empty prayerQueue) degrades to fair distribution

## Acceptance Criteria

- [x] Members who haven't been prayed for are assigned before those who have been recently
- [x] No same-day duplicate assignments across users (best effort — graceful fallback if queue exhausted)
- [x] User processing order is randomized daily so no user consistently gets "first pick"
- [x] New members are immediately prioritized (no prayerQueue entry = top of queue)
- [x] Output Firestore document shape (`prayerAssignments/{date}/assignments/{uid}`) is unchanged
- [x] No client/mobile code changes required
- [x] Scheduled function is idempotent (retries don't create duplicate assignments)
- [x] On-demand callable is queue-aware and respects takenToday state
- [x] Firestore security rules deny client access to `prayerQueue` collection
- [x] Existing self-exclusion behavior preserved (user never assigned to pray for themselves)
- [x] `MAX_PRAYER_PARTNERS` (3) respected; fewer assigned gracefully when pool exhausted
- [x] `prayerQueue` collection untouched by weekly cleanup function
- [x] Existing tests updated to cover queue-based behavior
- [x] Batch writes stay within 450-operation flush limit

## Success Metrics

- **Coverage cycle time:** Full congregation prayed for within `ceil(230 / 45) = ~5 days` (vs. unbounded with random)
- **Same-day duplication rate:** Near 0% under normal conditions (vs. ~20% with random)
- **No regressions:** Client continues to display assignments without changes
- **Queue health:** `assignmentCount` across members converges toward equal values over time

## Dependencies & Risks

| Risk                                                  | Likelihood         | Impact | Mitigation                                                                                                                                                    |
| ----------------------------------------------------- | ------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-run cold start produces suboptimal distribution | Certain (one-time) | Low    | All members have `lastPrayedFor = 0`, so the shuffle provides fair initial distribution. Queue normalizes within one cycle (~5 days).                         |
| Cloud Function timeout on large queue fetch           | Very low           | Medium | 230 docs + 230 queue docs is well within timeout. Monitor execution time.                                                                                     |
| Queue state corruption from partial writes            | Very low           | High   | Use single batch for assignments + queue updates. Atomic within Firestore batch limits.                                                                       |
| Member deactivation leaves orphaned queue entries     | Low                | Low    | Orphaned entries are harmless — members not in `members/` collection are never assigned. Queue entries can be cleaned up manually or in a future enhancement. |
| On-demand callable races with scheduled function      | Low                | Low    | Existing `create()` idempotency handles this. Scheduled function should skip users with existing assignments.                                                 |

## Implementation Suggestions

### Recommended File Changes

**`functions/index.js`:**

1. Add new helper: `fetchPrayerQueueState()` — reads `prayerQueue` collection into a Map
2. Add new helper: `buildSortedMemberQueue(members, queueState)` — sorts by `lastPrayedFor` ASC
3. Add new helper: `pickFromQueue(sortedQueue, takenToday, excludeUid, count)` — returns top N available members
4. Rewrite `generateDailyPrayerAssignments()` body with queue algorithm
5. Update `requestDailyPrayerAssignment()` to read queue state and today's existing assignments
6. Add idempotency guard to `generateDailyPrayerAssignments()` (check for existing date doc)

**`firestore.rules`:** 7. Add `prayerQueue/{memberId}` rule block (read: false, write: false)

### Testing Strategy

- Unit test `buildSortedMemberQueue()` with various lastPrayedFor timestamps
- Unit test `pickFromQueue()` with takenToday exclusions and self-exclusion
- Integration test full `generateDailyPrayerAssignments` flow with mock Firestore
- Verify idempotency: call twice, assert same assignments
- Verify on-demand callable respects existing assignments
- Verify cold start behavior (empty prayerQueue)

### Migration / Rollout

- **No migration needed.** Empty `prayerQueue` = all members at `lastPrayedFor = 0` = fair first-run distribution.
- **Optional backfill:** Could scan recent `prayerAssignments` to pre-populate `lastPrayedFor` for a smoother transition. Not required — queue normalizes within ~5 days regardless.
- **Rollback:** Revert Cloud Function deployment. `prayerQueue` collection can be left in place or deleted — it has no client dependencies.

## Sources & References

- **Origin brainstorm:** [docs/brainstorms/2026-03-16-smart-prayer-assignments-brainstorm.md](../brainstorms/2026-03-16-smart-prayer-assignments-brainstorm.md) — Key decisions: individual member tracking, global queue with same-day coordination, random user processing order, no per-user cooldown, server-only change.
- **Existing implementation:** [functions/index.js](../../functions/index.js) — Current prayer assignment Cloud Functions (lines 384-537, 679-731)
- **Firestore rules:** [firestore.rules](../../firestore.rules) — Current security rules (lines 22-32)
- **Client service:** [src/services/members.ts](../../src/services/members.ts) — Prayer assignment fetch (unchanged)
- **Redux slice:** [src/redux/memberSlice.ts](../../src/redux/memberSlice.ts) — Prayer state management (unchanged)
- **Original plan:** [docs/plans/2026-02-26-feat-member-only-features-plan.md](./2026-02-26-feat-member-only-features-plan.md) — Original prayer assignment feature design
