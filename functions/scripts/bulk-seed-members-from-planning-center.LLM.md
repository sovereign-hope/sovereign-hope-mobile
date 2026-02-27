# Bulk Seed Members From Planning Center (LLM Instructions)

Use this when you need to seed the `members` collection from the Planning Center **Members** list, even if many people do not have Firebase Auth accounts yet.

Script:

- `functions/scripts/bulk-seed-members-from-planning-center.cjs`

What it does:

1. Reads Planning Center list (default: `Members`)
2. Pulls all people (including email + profile data)
3. Upserts Firestore `members/{planningCenterPersonId}` docs
4. Does **not** create Firebase Auth users
5. Does **not** set Firebase custom claims

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
npm run member:bulk-seed -- --dry-run
```

Then apply:

```bash
npm run member:bulk-seed --
```

## Useful options

- `--list-name "Members"`: list name (default)
- `--list-id "<id>"`: explicit list id (overrides name)
- `--limit <n>`: process only first N candidates
- `--per-page <n>`: API page size (default `100`)
- `--project-id <id>`: explicit Firebase project
- `--dry-run`: no writes

## Troubleshooting

If Planning Center returns `401`, force auth mode:

```bash
PCO_AUTH_MODE=basic npm run member:bulk-seed -- --dry-run
PCO_AUTH_MODE=bearer npm run member:bulk-seed -- --dry-run
```

## LLM safety rules

- Always run `--dry-run` first unless user explicitly asks to apply immediately.
- Never print secrets.
- If user asks to link Firebase users, run `member:link-by-email` after this step.
