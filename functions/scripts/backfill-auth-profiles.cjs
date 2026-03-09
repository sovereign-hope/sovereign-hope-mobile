#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * One-time script: backfill Firebase Auth displayName and photoURL
 * from Firestore member docs for users missing those fields.
 *
 * Usage:
 *   node functions/scripts/backfill-auth-profiles.cjs
 *   node functions/scripts/backfill-auth-profiles.cjs --dry-run
 */

const fs = require("node:fs");
const { execSync } = require("node:child_process");
const admin = require("firebase-admin");

function getProjectIdFromFirebaseRc() {
  const firebaseRcPath = `${process.cwd()}/.firebaserc`;
  if (!fs.existsSync(firebaseRcPath)) return "";
  try {
    const parsed = JSON.parse(fs.readFileSync(firebaseRcPath, "utf8"));
    const projects = parsed?.projects || {};
    return (
      projects.default?.trim() ||
      projects.production?.trim() ||
      Object.values(projects)
        .find((v) => typeof v === "string" && v.trim())
        ?.trim() ||
      ""
    );
  } catch {
    return "";
  }
}

function initializeFirebaseAdmin() {
  const credentialsPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || getProjectIdFromFirebaseRc();

  if (!projectId) {
    throw new Error(
      "Unable to resolve Firebase project ID. Set GOOGLE_CLOUD_PROJECT or check .firebaserc."
    );
  }

  if (credentialsPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else {
    try {
      execSync("gcloud auth application-default print-access-token", {
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      throw new Error(
        "ADC not ready. Run: gcloud auth application-default login"
      );
    }
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no changes will be written.\n");

  initializeFirebaseAdmin();
  const auth = admin.auth();
  const db = admin.firestore();

  // Load all member docs keyed by uid
  const membersSnapshot = await db.collection("members").get();
  const membersByUid = new Map();
  for (const doc of membersSnapshot.docs) {
    const data = doc.data();
    if (data.uid) membersByUid.set(data.uid, data);
  }

  // Iterate Auth users
  let updated = 0;
  let skipped = 0;
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);

    for (const user of listResult.users) {
      if (user.displayName && user.photoURL) {
        skipped++;
        continue;
      }

      const member = membersByUid.get(user.uid);
      if (!member) {
        skipped++;
        continue;
      }

      const update = {};
      if (!user.displayName && member.displayName) {
        update.displayName = member.displayName;
      }
      if (!user.photoURL && member.photoURL) {
        update.photoURL = member.photoURL;
      }

      if (Object.keys(update).length === 0) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`Would update ${user.email || user.uid}:`, update);
      } else {
        await auth.updateUser(user.uid, update);
        console.log(`Updated ${user.email || user.uid}:`, update);
      }
      updated++;
    }

    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
