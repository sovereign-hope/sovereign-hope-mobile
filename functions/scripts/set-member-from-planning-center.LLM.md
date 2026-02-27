# Set Member From Planning Center (LLM Instructions)

This file tells any LLM exactly how to invoke the member sync script with safe defaults.

## Script

- Path: `functions/scripts/set-member-from-planning-center.cjs`
- Purpose:
  - Set Firebase custom claim `isMember`
  - Upsert/delete `members/{uid}` Firestore document
  - When enabled, look up a matching person in Planning Center People API by email

## Required inputs

1. Firebase user identifier:
   - `uid` (Firebase Auth UID), or
   - `firebase-email` (Firebase Auth email; script resolves UID automatically)
2. Firebase Admin auth mode (choose one):
   - Service account JSON:
     - `FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json`
   - ADC (no service account file):
     - `gcloud auth application-default login`
     - `gcloud config set project sovereign-hope-mobile`
     - optionally add `--project-id` to the script command

## Secure Planning Center credentials

Preferred (macOS Keychain):

```bash
functions/scripts/save-pco-credentials-keychain.sh "<PCO_CLIENT_ID>" "<PCO_ACCESS_TOKEN>"
```

Alternative (env vars for one command only):

```bash
PCO_CLIENT_ID="<PCO_CLIENT_ID>" PCO_ACCESS_TOKEN="<PCO_ACCESS_TOKEN>" ...
```

Never commit secrets to git.

If Planning Center auth fails with `401`, force auth mode:

```bash
PCO_AUTH_MODE=basic   # or bearer
```

## Most common commands

Preview changes only (recommended first) using ADC:

```bash
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid> \
  --dry-run
```

Preview changes by Firebase Auth email (no UID needed):

```bash
node functions/scripts/set-member-from-planning-center.cjs \
  --firebase-email "<user@example.com>" \
  --dry-run
```

Preview changes only (recommended first) using service account JSON:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json \
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid> \
  --dry-run
```

Grant member access + create/update member profile (with Planning Center lookup, ADC):

```bash
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid>
```

Grant member access by Firebase Auth email:

```bash
node functions/scripts/set-member-from-planning-center.cjs \
  --firebase-email "<user@example.com>"
```

Grant member access + create/update member profile (with Planning Center lookup, service account):

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json \
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid>
```

Revoke member access + delete member profile:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json \
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid> \
  --is-member false
```

Override display fields manually:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json \
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid> \
  --display-name "Jane Doe" \
  --photo-url "https://example.com/jane.jpg"
```

Skip Planning Center lookup completely:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json \
node functions/scripts/set-member-from-planning-center.cjs \
  --uid <firebase_uid> \
  --skip-planning-center
```

## Parameters reference

- `--uid <uid>`: Firebase Auth UID (required if `--firebase-email` is not provided)
- `--firebase-email <email>`: Firebase Auth email (required if `--uid` is not provided)
- `--is-member <true|false>`: Default `true`
- `--email <email>`: Override Planning Center lookup email instead of Firebase user email
- `--display-name <name>`: Explicit Firestore display name
- `--photo-url <url>`: Explicit Firestore photo URL
- `--project-id <id>`: Optional Firebase project override
- `--skip-planning-center`: No PCO API lookup
- `--dry-run`: Print payload only, no writes
- `--help`: Usage
- `PCO_AUTH_MODE` (env): `auto` (default), `basic`, or `bearer`

## LLM safety rules

- Do not print raw secrets (service account JSON, PCO token).
- Prefer `--dry-run` first.
- `firebase login` by itself is not enough for Admin SDK writes; use service account or ADC.
- If no email is available and no `--email` provided, ask for one before running.
- If Planning Center lookup fails, retry once; then run with `--skip-planning-center` only if explicitly requested.
