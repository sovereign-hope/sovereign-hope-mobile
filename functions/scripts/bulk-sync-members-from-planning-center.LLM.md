# Bulk Sync Members From Planning Center (LLM Instructions)

Use this legacy one-step flow when you need to sync **only people from the Planning Center Members list who already have Firebase Auth users**.

Script:

- `functions/scripts/bulk-sync-members-from-planning-center.cjs`

What it does:

1. Reads Planning Center list (default list name: `Members`)
2. Pulls people in that list with their emails
3. Matches Firebase Auth users by email
4. Sets custom claim `isMember: true`
5. Upserts `members/{uid}` Firestore docs

It does **not** revoke users who are not in the list.
It does **not** seed unlinked members. For seed-first workflows, use:

- `member:bulk-seed`
- then `member:link-by-email`

## Required setup

1. Firebase auth mode:
   - ADC:
     - `gcloud auth application-default login`
     - `gcloud config set project sovereign-hope-mobile`
   - or service account via `FIREBASE_SERVICE_ACCOUNT_PATH`
2. Planning Center credentials:
   - `npm run member:save-pco-keychain -- "<PCO_CLIENT_ID>" "<PCO_ACCESS_TOKEN>"`

## Recommended workflow

Start with dry-run:

```bash
npm run member:bulk-sync -- --dry-run
```

Then apply:

```bash
npm run member:bulk-sync
```

## Useful options

- `--list-name "Members"`: list name (default)
- `--list-id "<id>"`: explicit list id (overrides name)
- `--limit <n>`: process only first N candidates (for testing)
- `--per-page <n>`: API page size (default `100`)
- `--project-id <id>`: explicit Firebase project
- `--dry-run`: no writes

## Troubleshooting

If Planning Center returns `401`, force auth mode:

```bash
PCO_AUTH_MODE=basic npm run member:bulk-sync -- --dry-run
PCO_AUTH_MODE=bearer npm run member:bulk-sync -- --dry-run
```

## Safety rules for LLMs

- Always run `--dry-run` first unless user explicitly asks to apply immediately.
- Do not print secrets.
- Report `unmatchedEmails` clearly (emails in list that are not Firebase users).
