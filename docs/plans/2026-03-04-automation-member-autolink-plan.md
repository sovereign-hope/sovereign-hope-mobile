---
date: 2026-03-04
topic: automation-member-autolink
---

# Plan: Firebase Signup Auto-Link for Members

## Scope

1. Ensure member seed data stores all Planning Center emails (`emails`, `emailsNormalized`).
2. Ensure link-by-email script checks all stored member emails.
3. Ensure Auth `onCreate` function auto-links using `emailsNormalized` with legacy fallbacks.

## Implementation Steps

1. **Seed script updates**
   - Build complete per-person email list.
   - Persist `emails` + `emailsNormalized` on `members/{personId}`.
2. **Link script updates**
   - Add helper to collect all candidate emails from member doc.
   - Attempt `auth.getUserByEmail` across candidate list.
3. **Cloud Function updates**
   - Query `emailsNormalized` first (`array-contains`) then legacy fields.
   - Set `isMember` claim and write `linkedUid` safely.
4. **Backfill run**
   - Run `member:bulk-seed` then `member:link-by-email`.

## Validation

- Syntax checks for changed JS files.
- Dry-run + apply for seed and link scripts.
- Confirm at least one known account links through alternate email path.

## Rollout

1. Deploy updated function.
2. Verify with a new signup that exists in Planning Center under secondary email.
3. Monitor function logs for conflict/skip reasons.
