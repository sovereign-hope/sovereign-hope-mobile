# Member Access Runbook

This guide explains the members-only data workflow for Sovereign Hope Mobile.

Primary goal: seed all church members first, then link Firebase user accounts as people sign in.

## Scripts

- `functions/scripts/save-pco-credentials-keychain.sh`
- `functions/scripts/bulk-seed-members-from-planning-center.cjs`
- `functions/scripts/link-members-to-firebase-users-by-email.cjs`
- `functions/scripts/set-member-from-planning-center.cjs` (single-user admin action)
- `functions/scripts/bulk-sync-members-from-planning-center.cjs` (legacy one-step sync)

LLM usage docs:

- `functions/scripts/bulk-seed-members-from-planning-center.LLM.md`
- `functions/scripts/link-members-to-firebase-users-by-email.LLM.md`
- `functions/scripts/set-member-from-planning-center.LLM.md`
- `functions/scripts/bulk-sync-members-from-planning-center.LLM.md`

## Prerequisites

1. Google Cloud CLI (`gcloud`) installed
2. Access to Firebase project `sovereign-hope-mobile`
3. Planning Center API credentials (client ID + access token)
4. macOS if using Keychain helper script (`security` CLI)

## One-Time Setup

### 1) Authenticate Firebase Admin access via ADC (no service account file required)

```bash
gcloud auth application-default login
gcloud config set project sovereign-hope-mobile
```

### 2) Save Planning Center credentials securely (macOS Keychain)

```bash
npm run member:save-pco-keychain -- "<PCO_CLIENT_ID>" "<PCO_ACCESS_TOKEN>"
```

Stored under:

- `sovereign-hope-mobile.pco_client_id`
- `sovereign-hope-mobile.pco_access_token`

Non-macOS alternative:

```bash
export PCO_CLIENT_ID="<PCO_CLIENT_ID>"
export PCO_ACCESS_TOKEN="<PCO_ACCESS_TOKEN>"
```

## Recommended Flow (Two-Step)

### Step A: Seed `members` from Planning Center list

Dry run:

```bash
npm run member:bulk-seed -- --dry-run
```

Apply:

```bash
npm run member:bulk-seed
```

Optional test limit:

```bash
npm run member:bulk-seed -- --dry-run --limit 25
```

What this writes:

- Upserts `members/{planningCenterPersonId}`
- Includes profile + email + Planning Center metadata
- Does not create Firebase Auth users
- Does not set `isMember` claims

### Step B: Link existing Firebase users to seeded member docs by email

Dry run:

```bash
npm run member:link-by-email -- --dry-run
```

Apply:

```bash
npm run member:link-by-email
```

Optional test limit:

```bash
npm run member:link-by-email -- --dry-run --limit 25
```

What this writes:

- Finds `members` docs with matching Firebase Auth email
- Sets `isMember: true` custom claim
- Sets `linkedUid` and `uid` on the member doc
- May merge duplicate legacy `members/{uid}` docs when safe

## Single-User Admin Commands

Dry run by email:

```bash
npm run member:set -- --firebase-email "user@example.com" --dry-run
```

Grant access:

```bash
npm run member:set -- --firebase-email "user@example.com"
```

Revoke access:

```bash
npm run member:set -- --firebase-email "user@example.com" --is-member false
```

## Legacy One-Step Bulk Sync (Optional)

This path directly links only users who already exist in Firebase Auth.

Dry run:

```bash
npm run member:bulk-sync -- --dry-run
```

Apply:

```bash
npm run member:bulk-sync
```

## Planning Center Auth Notes

If Planning Center requests return `401`, force mode:

```bash
PCO_AUTH_MODE=basic npm run member:bulk-seed -- --dry-run
PCO_AUTH_MODE=bearer npm run member:bulk-seed -- --dry-run
PCO_AUTH_MODE=basic npm run member:set -- --firebase-email "user@example.com" --dry-run
PCO_AUTH_MODE=bearer npm run member:set -- --firebase-email "user@example.com" --dry-run
```

Allowed values:

- `PCO_AUTH_MODE=auto` (default)
- `PCO_AUTH_MODE=basic`
- `PCO_AUTH_MODE=bearer`

## Prayer Assignment Behavior

Daily prayer assignments are generated for account-linked members only (users with a linked Firebase UID).

- Assignment documents are keyed by Firebase UID: `prayerAssignments/{date}/assignments/{uid}`
- Prayer targets are drawn from the full `members` collection (including seeded members not yet account-linked)

## Verification

After linking or granting access:

1. User backgrounds then foregrounds app
2. App refreshes auth claims on foreground
3. Members tab appears for linked members

## Troubleshooting

### `ADC is not ready`

```bash
gcloud auth application-default login
```

### `Unable to resolve Firebase project ID for ADC mode`

```bash
gcloud config set project sovereign-hope-mobile
```

Or pass explicitly:

```bash
npm run member:bulk-seed -- --project-id sovereign-hope-mobile --dry-run
```

### `Planning Center request failed (401)`

1. Re-save credentials:
   - `npm run member:save-pco-keychain -- "<PCO_CLIENT_ID>" "<PCO_ACCESS_TOKEN>"`
2. Retry with forced mode (`PCO_AUTH_MODE=basic` or `PCO_AUTH_MODE=bearer`)

### User has no Firebase email

Use UID-based single-user script:

```bash
npm run member:set -- --uid "<firebase_uid>"
```
