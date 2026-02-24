# Service Account Private Key Exposure

---

status: pending
priority: P1-critical
issue_id: SEC-001
tags:

- security
- credentials
- google-apps-script
- firestore

---

## Problem Statement

A service account private key is hardcoded in `sendPlanToFirestore.gs` and committed to source control. This is a critical security vulnerability.

## Findings

**File**: `sendPlanToFirestore.gs` (lines 2-3)

```javascript
const email = "sovereign-hope-mobile@appspot.gserviceaccount.com";
const key =
  "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADA...-----END PRIVATE KEY-----\n";
```

### Impact

- Anyone with repo access can impersonate this service account
- Can read/write to Firestore database
- Can access any Google Cloud resources this account has permissions for
- Key rotation is required immediately if repo is public or has been shared

## Proposed Solutions

### Option A: Environment Variables (Recommended for Apps Script)

Use PropertiesService to store credentials:

```javascript
function writeToFirestore() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const email = scriptProperties.getProperty("FIREBASE_SERVICE_ACCOUNT_EMAIL");
  const key = scriptProperties.getProperty("FIREBASE_SERVICE_ACCOUNT_KEY");
  // ...
}
```

### Option B: Remove from Codebase

1. Remove `sendPlanToFirestore.gs` from git history using `git filter-branch` or BFG Repo-Cleaner
2. Store script in Google Apps Script IDE only
3. Add to `.gitignore`

### Immediate Actions Required

1. Rotate the service account key in Google Cloud Console
2. Invalidate the old key
3. Update the Google Apps Script with the new key (stored securely)

## Technical Details

- Service account: `sovereign-hope-mobile@appspot.gserviceaccount.com`
- Project: `sovereign-hope-mobile`
- Usage: Firebase/Firestore operations for reading plan data

## Acceptance Criteria

- [ ] Old service account key is revoked
- [ ] New key is generated and stored securely (not in source control)
- [ ] `sendPlanToFirestore.gs` either removed from repo or uses PropertiesService
- [ ] Git history scrubbed of the private key (if public repo)
