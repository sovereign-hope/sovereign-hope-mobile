#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const { execSync } = require("node:child_process");
const admin = require("firebase-admin");

function parseArgs(rawArgs) {
  const args = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const nextToken = rawArgs[index + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = nextToken;
    index += 1;
  }

  return args;
}

function normalizeEmail(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

function toPositiveInt(value, fallbackValue) {
  if (value === undefined || value === null || value === "") {
    return fallbackValue;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received "${value}".`);
  }
  return parsed;
}

function getProjectIdFromFirebaseRc() {
  const firebaseRcPath = `${process.cwd()}/.firebaserc`;
  if (!fs.existsSync(firebaseRcPath)) {
    return "";
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(firebaseRcPath, "utf8"));
    const projectMap = parsed?.projects || {};
    if (typeof projectMap.default === "string" && projectMap.default.trim()) {
      return projectMap.default.trim();
    }
    if (
      typeof projectMap.production === "string" &&
      projectMap.production.trim()
    ) {
      return projectMap.production.trim();
    }

    const firstValue = Object.values(projectMap).find(
      (value) => typeof value === "string" && value.trim()
    );
    return typeof firstValue === "string" ? firstValue.trim() : "";
  } catch {
    return "";
  }
}

function assertGcloudAdcReady() {
  try {
    execSync("gcloud auth application-default print-access-token", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
  } catch {
    throw new Error(
      "ADC is not ready. Run: gcloud auth application-default login"
    );
  }
}

function initializeFirebaseAdmin(projectIdArg) {
  const credentialsPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectIdFromEnv =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const projectIdFromFirebaseRc = getProjectIdFromFirebaseRc();
  let projectId =
    projectIdArg || projectIdFromEnv || projectIdFromFirebaseRc || "";

  if (credentialsPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    projectId = projectId || serviceAccount.project_id || "";
    if (!projectId) {
      throw new Error(
        "Unable to resolve Firebase project ID. Provide --project-id, set GOOGLE_CLOUD_PROJECT, or use a service account with project_id."
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    }

    return {
      auth: admin.auth(),
      db: admin.firestore(),
      authMode: "service-account",
    };
  }

  if (!projectId) {
    throw new Error(
      "Unable to resolve Firebase project ID for ADC mode. Provide --project-id, set GOOGLE_CLOUD_PROJECT, or add a project mapping in .firebaserc."
    );
  }

  assertGcloudAdcReady();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  return { auth: admin.auth(), db: admin.firestore(), authMode: "adc" };
}

function canMergeLegacyDoc(memberId, memberEmail, legacyData) {
  const legacyPersonId =
    typeof legacyData?.planningCenterPersonId === "string"
      ? legacyData.planningCenterPersonId.trim()
      : "";
  if (legacyPersonId && legacyPersonId !== memberId) {
    return false;
  }

  const legacyEmail = normalizeEmail(
    legacyData?.emailNormalized || legacyData?.email || ""
  );
  if (legacyEmail && memberEmail && legacyEmail !== memberEmail) {
    return false;
  }

  return true;
}

async function linkMemberByEmail(options) {
  const { auth, db, dryRun, limit, projectId } = options;

  const snapshot = await db.collection("members").get();
  const summary = {
    ok: true,
    dryRun,
    projectId,
    totalMemberDocs: snapshot.size,
    candidatesWithEmail: 0,
    alreadyLinked: 0,
    matchedFirebaseUsers: 0,
    linkedMembers: 0,
    claimsAlreadyMember: 0,
    firebaseUsersNotFound: 0,
    legacyDocsMerged: 0,
    legacyMergeConflicts: 0,
    unmatchedEmails: [],
    sample: [],
  };

  let processed = 0;

  for (const docSnapshot of snapshot.docs) {
    if (limit > 0 && processed >= limit) {
      break;
    }

    const data = docSnapshot.data() || {};
    const memberId = docSnapshot.id;
    const email = normalizeEmail(data.emailNormalized || data.email || "");
    if (!email) {
      continue;
    }

    summary.candidatesWithEmail += 1;

    const linkedUid =
      typeof data.linkedUid === "string" ? data.linkedUid.trim() : "";
    if (linkedUid) {
      summary.alreadyLinked += 1;
      continue;
    }

    processed += 1;

    try {
      const userRecord = await auth.getUserByEmail(email);
      const uid = userRecord.uid;
      const claims = userRecord.customClaims || {};
      const alreadyMember = claims.isMember === true;

      summary.matchedFirebaseUsers += 1;
      if (alreadyMember) {
        summary.claimsAlreadyMember += 1;
      }

      const legacyRef =
        uid !== memberId ? db.collection("members").doc(uid) : null;
      let mergedLegacyDoc = false;
      let legacyMergeConflict = false;

      if (!dryRun) {
        await auth.setCustomUserClaims(uid, {
          ...claims,
          isMember: true,
        });

        await db.runTransaction(async (transaction) => {
          const freshMemberSnapshot = await transaction.get(docSnapshot.ref);
          const freshData = freshMemberSnapshot.data() || {};

          let createdAt =
            freshMemberSnapshot.exists && freshData.createdAt
              ? freshData.createdAt
              : admin.firestore.FieldValue.serverTimestamp();

          if (legacyRef) {
            const legacySnapshot = await transaction.get(legacyRef);
            if (legacySnapshot.exists) {
              const legacyData = legacySnapshot.data() || {};
              if (canMergeLegacyDoc(memberId, email, legacyData)) {
                mergedLegacyDoc = true;
                if (!freshData.createdAt && legacyData.createdAt) {
                  createdAt = legacyData.createdAt;
                }
                transaction.delete(legacyRef);
              } else {
                legacyMergeConflict = true;
              }
            }
          }

          transaction.set(
            docSnapshot.ref,
            {
              uid,
              linkedUid: uid,
              emailNormalized: email,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              linkedAt: admin.firestore.FieldValue.serverTimestamp(),
              createdAt,
            },
            { merge: true }
          );
        });
      } else if (legacyRef) {
        const legacySnapshot = await legacyRef.get();
        if (legacySnapshot.exists) {
          const legacyData = legacySnapshot.data() || {};
          if (canMergeLegacyDoc(memberId, email, legacyData)) {
            mergedLegacyDoc = true;
          } else {
            legacyMergeConflict = true;
          }
        }
      }

      if (mergedLegacyDoc) {
        summary.legacyDocsMerged += 1;
      }
      if (legacyMergeConflict) {
        summary.legacyMergeConflicts += 1;
      }

      summary.linkedMembers += 1;
      if (summary.sample.length < 100) {
        summary.sample.push({
          memberId,
          uid,
          email,
          alreadyMember,
          mergedLegacyDoc,
          legacyMergeConflict,
        });
      }
    } catch (error) {
      const firebaseCode = error?.errorInfo?.code || error?.code || "";
      if (firebaseCode === "auth/user-not-found") {
        summary.firebaseUsersNotFound += 1;
        if (summary.unmatchedEmails.length < 200) {
          summary.unmatchedEmails.push(email);
        }
        continue;
      }

      throw error;
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

function printUsageAndExit(exitCode = 1) {
  console.error(`
Usage:
  node functions/scripts/link-members-to-firebase-users-by-email.cjs [options]

Options:
  --limit <n>                   Limit number of candidates for testing
  --project-id <id>             Firebase project override
  --dry-run                     Preview without writing
  --help                        Show this help

Auth:
  1) Service account JSON:
     FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json ...
  2) ADC (no service account file):
     gcloud auth application-default login
     gcloud config set project <project_id>
`);
  process.exit(exitCode);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsageAndExit(0);
  }

  const limit = args.limit ? toPositiveInt(args.limit, 0) : 0;
  const projectId = args["project-id"] ? String(args["project-id"]).trim() : "";
  const dryRun = Boolean(args["dry-run"]);

  const firebase = initializeFirebaseAdmin(projectId);
  await linkMemberByEmail({
    auth: firebase.auth,
    db: firebase.db,
    dryRun,
    limit,
    projectId: projectId || "(resolved)",
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
