---
date: 2026-03-04
topic: automation-member-autolink
---

# Member Auto-Link Automation (Brainstorm)

## What We're Building

A Firebase Auth `onCreate` automation that links a newly created user account to an existing Planning Center-seeded member record when emails match.

## Why This Approach

The existing manual linking command works, but creates operational overhead and misses users until someone runs the script. Automatic linking at signup removes that delay and keeps member access consistent.

## Key Decisions

- Match against **all known Planning Center emails** (not just one primary email).
- Keep behavior **idempotent** and safe on retries.
- Do not overwrite a member record that is already linked to a different UID.
- Preserve fallback compatibility with legacy `email`/`emailNormalized` fields.

## Edge Cases to Handle

- Signup has no email.
- No matching member record.
- Multiple possible matches.
- Existing member record already linked to someone else.
- Trigger retries.

## Next Steps

→ `/sw:plan` for concrete implementation + validation steps.
