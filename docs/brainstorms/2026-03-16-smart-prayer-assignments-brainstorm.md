---
date: 2026-03-16
topic: smart-prayer-assignments
platform: server-cloud-functions
---

# Smart Prayer Assignments

## What We're Building

Replace the current random (Fisher-Yates shuffle) prayer assignment algorithm with a queue-based system that maximizes prayer coverage across the entire congregation. Instead of randomly picking 3 members per user each day, the system tracks when each member was last prayed for and prioritizes those who have gone longest without prayer.

The key change: assignments are coordinated across all users so that the same member isn't assigned to multiple users on the same day (as much as possible), and every member cycles through the queue before anyone repeats.

## Why This Approach

The current random algorithm has no memory. With 230 members and ~15 active app users (45 assignments/day), random selection means some members may go weeks without being prayed for while others are assigned repeatedly. A queue-based approach guarantees that the full congregation is cycled through in ~5 days (230 / 45), with the least-recently-prayed members always prioritized.

### Current State

- Cloud Function `generateDailyPrayerAssignments` runs at midnight MT
- Fisher-Yates shuffle picks 3 random members per user
- No tracking of past assignments beyond 7-day retention
- No coordination across users (same member can be assigned to all 15 users)
- Firestore path: `prayerAssignments/{date}/assignments/{uid}`

### Target State

- Same Cloud Function, same Firestore output shape (no client changes)
- New `prayerQueue` Firestore collection tracks `lastPrayedFor` per member
- Algorithm sorts by least-recently-prayed, coordinates across users to minimize same-day dupes
- Random user processing order each day for variety

## Key Decisions

1. **Individual tracking, not household-based.** Each of the 230 members is tracked independently, even if they share a household.

2. **Always 3 assignments per user.** `MAX_PRAYER_PARTNERS` stays at 3. With 15 users, that's 45 assignments/day covering ~20% of the congregation daily.

3. **Global queue with same-day coordination.** Process users sequentially (in randomized order each day). As each user gets their 3 assignments, those members are marked "taken" for the day. Next user draws from remaining least-recently-prayed members. This avoids same-day duplication.

4. **Random user processing order.** Shuffle the user list each day before running the sequential assignment pass. This prevents the same users from always getting "first pick" from the queue.

5. **No per-user cooldown.** If the global queue says a member is least-prayed-for, any user can get them regardless of recent personal assignment history. With 230 members this naturally rotates.

6. **New Firestore state: `prayerQueue` collection.** A document per member tracking `lastPrayedFor` timestamp and `assignmentCount`. The Cloud Function reads this to sort the queue and writes back after generating assignments.

7. **Server-only change.** The `prayerAssignments/{date}/assignments/{uid}` document shape is unchanged. No client or mobile changes needed.

## Algorithm Sketch

```
1. Fetch all members from `members/` collection
2. Fetch all queue entries from `prayerQueue/` collection
3. Build sorted queue: members ordered by lastPrayedFor ASC (never-prayed-for first)
4. Shuffle active users (randomize processing order)
5. Initialize taken = empty set
6. For each user in shuffled order:
   a. Filter queue: remove self, remove taken members
   b. Pick top 3 from filtered queue
   c. Add picked members to taken set
   d. Write assignment to prayerAssignments/{date}/assignments/{uid}
7. Batch update prayerQueue/{memberId}.lastPrayedFor = now for all assigned members
```

### Edge Cases

- **New member added:** No `prayerQueue` entry yet = `lastPrayedFor` of 0 = top of queue. They get prayed for immediately.
- **Member removed:** Orphaned queue entry is harmless. Could be cleaned up during weekly cleanup job.
- **Fewer members than needed:** If queue exhaustion happens (all members taken), fall back to picking from least-recently-prayed already-taken members (accept dupes gracefully).
- **Single user:** Gets the 3 least-recently-prayed members, no coordination needed.
- **All users processed, some members never assigned:** Expected when users < members/3. They stay at top of queue for tomorrow.

## Open Questions

None - all key decisions resolved.

## Scope Boundary

**In scope:**

- Rewrite `generateDailyPrayerAssignments` Cloud Function algorithm
- New `prayerQueue` Firestore collection and security rules
- Update `requestDailyPrayerAssignment` (on-demand) to use same algorithm
- Backfill: initialize queue from existing recent assignments (or start fresh)

**Out of scope:**

- Client/mobile UI changes
- Prayer completion tracking (whether user actually prayed)
- User-facing queue position or coverage stats
- Notification changes
