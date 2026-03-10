# Documentation Index

This directory contains internal planning and operational docs for Sovereign Hope Mobile.

## Runbooks

- [Member Access Runbook](./member-access-runbook.md): Seeding and linking member data with Planning Center and Firebase.

## Operational Script Docs

- [Bulk Seed Members](../functions/scripts/bulk-seed-members-from-planning-center.LLM.md): Seed `members` docs from Planning Center.
- [Link Members by Email](../functions/scripts/link-members-to-firebase-users-by-email.LLM.md): Link seeded members to Firebase users and set claims.
- [Set Single Member Access](../functions/scripts/set-member-from-planning-center.LLM.md): Grant or revoke member access for one user.
- [Legacy Bulk Sync](../functions/scripts/bulk-sync-members-from-planning-center.LLM.md): Legacy one-step sync flow for existing Firebase users.

## Planning Docs

- [Plans](./plans/): Implementation plans for features and technical work.
- [Brainstorms](./brainstorms/): Early ideation docs and design notes.

## Related Top-Level Docs

- [Main Project README](../README.md): Onboarding, local development, and release workflow.
- [Admin Dashboard README](../admin/README.md): Admin web app access, local dev, and deploy commands.
- [PR Template](../PULL_REQUEST_TEMPLATE.md): Pull request checklist and release impact prompts.
- [Comprehensive Testing Plan](../plans/comprehensive-testing-suite.md): Test strategy and quality goals.
- [Solutions Archive](../plans/solutions/): Resolved issues and implementation notes.
- [Engineering Todo Backlog](../todos/): Prioritized technical debt and follow-up items.
