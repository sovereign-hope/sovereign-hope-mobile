#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Bootstrap script to promote a Firebase Auth user to admin.
 *
 * Usage:
 *   node functions/scripts/set-admin-claim.cjs --uid <firebase_uid>
 *   node functions/scripts/set-admin-claim.cjs --email <firebase_auth_email>
 *   node functions/scripts/set-admin-claim.cjs --email <email> --remove
 *
 * Auth:
 *   1) Service account: FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/key.json
 *   2) ADC: gcloud auth application-default login
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

function parseArgs(rawArgs) {
  const args = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const token = rawArgs[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = rawArgs[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function initializeFirebaseAdmin(projectIdArg) {
  const credentialsPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    projectIdArg ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    getProjectIdFromFirebaseRc();

  if (!projectId) {
    throw new Error(
      "Unable to resolve Firebase project ID. Provide --project-id or set GOOGLE_CLOUD_PROJECT."
    );
  }

  if (credentialsPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
  } else {
    // Verify ADC is ready
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

  return admin.auth();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.uid && !args.email)) {
    console.error(`
Usage:
  node functions/scripts/set-admin-claim.cjs --uid <firebase_uid> [options]
  node functions/scripts/set-admin-claim.cjs --email <firebase_auth_email> [options]

Options:
  --remove              Remove admin claim instead of setting it
  --project-id <id>     Override Firebase project ID
  --dry-run             Print planned changes without writing
  --help                Show this help
`);
    process.exit(1);
  }

  const auth = initializeFirebaseAdmin(
    args["project-id"] ? String(args["project-id"]).trim() : ""
  );

  const userRecord = args.uid
    ? await auth.getUser(String(args.uid).trim())
    : await auth.getUserByEmail(String(args.email).trim());

  const existingClaims = userRecord.customClaims || {};
  const nextClaims = { ...existingClaims };
  const isRemoving = Boolean(args.remove);

  if (isRemoving) {
    delete nextClaims.isAdmin;
    delete nextClaims.admin;
  } else {
    nextClaims.isAdmin = true;
  }

  const claimsPayload = Object.keys(nextClaims).length > 0 ? nextClaims : null;

  if (args["dry-run"]) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          uid: userRecord.uid,
          email: userRecord.email,
          action: isRemoving ? "remove_admin" : "set_admin",
          claimsPayload,
        },
        null,
        2
      )
    );
    return;
  }

  await auth.setCustomUserClaims(userRecord.uid, claimsPayload);

  console.log(
    JSON.stringify(
      {
        ok: true,
        uid: userRecord.uid,
        email: userRecord.email,
        action: isRemoving ? "removed_admin" : "set_admin",
        claims: claimsPayload,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
