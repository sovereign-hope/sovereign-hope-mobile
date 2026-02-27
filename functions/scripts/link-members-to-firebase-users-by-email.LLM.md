# Link Seeded Members To Firebase Users By Email (LLM Instructions)

Use this after seeding members to connect Firebase Auth accounts to `members` docs by matching email addresses.

Script:

- `functions/scripts/link-members-to-firebase-users-by-email.cjs`

What it does:

1. Reads Firestore `members` docs that have email values
2. Finds Firebase Auth users with matching emails
3. Sets Firebase custom claim `isMember: true`
4. Writes `linkedUid` + `uid` on the member doc
5. Optionally merges duplicate legacy `members/{uid}` docs into the seeded doc

It does **not** create Firebase Auth accounts.

## Required setup

1. Firebase auth mode:
   - ADC:
     - `gcloud auth application-default login`
     - `gcloud config set project sovereign-hope-mobile`
   - or service account via `FIREBASE_SERVICE_ACCOUNT_PATH`

## Recommended workflow

Dry-run first:

```bash
npm run member:link-by-email -- --dry-run
```

Apply:

```bash
npm run member:link-by-email --
```

## Useful options

- `--limit <n>`: process only first N candidate members
- `--project-id <id>`: explicit Firebase project
- `--dry-run`: no writes

## LLM safety rules

- Always run `--dry-run` first unless user asks to apply immediately.
- Never print secrets.
- Report unmatched emails as expected when users have not signed up yet.
