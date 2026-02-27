#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const { execSync } = require("node:child_process");
const admin = require("firebase-admin");

const PCO_API_BASE_URL = "https://api.planningcenteronline.com/people/v2";
const KEYCHAIN_PCO_CLIENT_ID_SERVICE = "sovereign-hope-mobile.pco_client_id";
const KEYCHAIN_PCO_ACCESS_TOKEN_SERVICE =
  "sovereign-hope-mobile.pco_access_token";

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

function toBoolean(value, fallbackValue) {
  if (value === undefined) {
    return fallbackValue;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).toLowerCase().trim();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  throw new Error(
    `Expected a boolean value but received "${value}". Use true or false.`
  );
}

function readKeychainSecret(serviceName) {
  try {
    const output = execSync(
      `security find-generic-password -w -s "${serviceName}"`,
      {
        stdio: ["ignore", "pipe", "ignore"],
        encoding: "utf8",
      }
    );
    return output.trim();
  } catch {
    return "";
  }
}

function getPcoCredentials() {
  const clientId =
    process.env.PCO_CLIENT_ID ||
    readKeychainSecret(KEYCHAIN_PCO_CLIENT_ID_SERVICE);
  const accessToken =
    process.env.PCO_ACCESS_TOKEN ||
    readKeychainSecret(KEYCHAIN_PCO_ACCESS_TOKEN_SERVICE);

  if (!clientId || !accessToken) {
    throw new Error(
      "Missing Planning Center credentials. Set PCO_CLIENT_ID and PCO_ACCESS_TOKEN env vars, or save them in macOS Keychain via functions/scripts/save-pco-credentials-keychain.sh."
    );
  }

  return { clientId, accessToken };
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
      projectId,
      authMode: "service-account",
    };
  }

  if (!projectId) {
    throw new Error(
      "Unable to resolve Firebase project ID for ADC mode. Provide --project-id, set GOOGLE_CLOUD_PROJECT, or add a project mapping in .firebaserc."
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  return {
    auth: admin.auth(),
    db: admin.firestore(),
    projectId,
    authMode: "adc",
  };
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

function initializeFirebaseAdminWithReadiness(projectIdArg) {
  const hasServiceAccountPath = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
  if (!hasServiceAccountPath) {
    assertGcloudAdcReady();
  }

  const initialized = initializeFirebaseAdmin(projectIdArg);

  if (!admin.apps.length) {
    throw new Error("Failed to initialize Firebase Admin SDK.");
  }

  return initialized;
}

function getAuthModeMessage(authMode) {
  if (authMode === "service-account") {
    return "service-account";
  }
  return "adc";
}

function initializeFirebaseForOperation(projectIdArg) {
  const initialized = initializeFirebaseAdminWithReadiness(projectIdArg);

  if (!admin.apps.length) {
    throw new Error("Firebase Admin initialization failed.");
  }

  return initialized;
}

function getPersonDisplayName(personAttributes) {
  const explicitName = personAttributes?.name?.trim();
  if (explicitName) {
    return explicitName;
  }

  const firstName = personAttributes?.first_name?.trim() || "";
  const lastName = personAttributes?.last_name?.trim() || "";
  const combined = `${firstName} ${lastName}`.trim();
  if (combined) {
    return combined;
  }

  return "";
}

function getPersonPhotoUrl(personAttributes) {
  const candidates = [
    personAttributes?.avatar,
    personAttributes?.avatar_url,
    personAttributes?.photo_url,
    personAttributes?.demographic_avatar_url,
    personAttributes?.photo?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function parsePcoPerson(personResource) {
  if (!personResource || personResource.type !== "Person") {
    return null;
  }

  return {
    personId: String(personResource.id),
    displayName: getPersonDisplayName(personResource.attributes || {}),
    photoURL: getPersonPhotoUrl(personResource.attributes || {}),
    personApiUrl: personResource.links?.self || null,
  };
}

async function fetchPcoJson(url, credentials) {
  const authModePreference = String(
    process.env.PCO_AUTH_MODE || "auto"
  ).toLowerCase();

  const basicAuthHeader = `Basic ${Buffer.from(
    `${credentials.clientId}:${credentials.accessToken}`
  ).toString("base64")}`;

  const authAttempts =
    authModePreference === "basic"
      ? [
          {
            mode: "basic",
            headers: { Authorization: basicAuthHeader },
          },
        ]
      : authModePreference === "bearer"
      ? [
          {
            mode: "bearer",
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
              "X-PCO-Client-Id": credentials.clientId,
            },
          },
        ]
      : [
          {
            mode: "basic",
            headers: { Authorization: basicAuthHeader },
          },
          {
            mode: "bearer",
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
              "X-PCO-Client-Id": credentials.clientId,
            },
          },
        ];

  let lastError;
  for (const attempt of authAttempts) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "sovereign-hope-mobile-member-sync/1.0",
        ...attempt.headers,
      },
    });

    if (response.ok) {
      return response.json();
    }

    const text = await response.text();
    lastError = {
      mode: attempt.mode,
      status: response.status,
      body: text.slice(0, 300),
    };

    if (response.status !== 401 && response.status !== 403) {
      break;
    }
  }

  throw new Error(
    `Planning Center request failed (mode=${lastError?.mode}, status=${
      lastError?.status
    }). ${lastError?.body || ""}`
  );
}

async function findPcoPersonByEmail(email, credentials) {
  const emailLower = email.trim().toLowerCase();
  if (!emailLower) {
    return null;
  }

  // Preferred: query people directly by search email.
  const directSearchUrl =
    `${PCO_API_BASE_URL}/people` +
    `?where[search_name_or_email]=${encodeURIComponent(emailLower)}` +
    "&per_page=25";
  const directResult = await fetchPcoJson(directSearchUrl, credentials);
  const directMatch = (directResult?.data || []).find((person) => {
    const matched = parsePcoPerson(person);
    return Boolean(matched);
  });
  if (directMatch) {
    return parsePcoPerson(directMatch);
  }

  // Fallback: resolve via email_addresses and include person.
  const emailSearchUrl =
    `${PCO_API_BASE_URL}/email_addresses` +
    `?where[address]=${encodeURIComponent(emailLower)}` +
    "&include=person&per_page=1";
  const emailResult = await fetchPcoJson(emailSearchUrl, credentials);
  const includedPeople = (emailResult?.included || []).filter(
    (item) => item.type === "Person"
  );
  if (includedPeople.length > 0) {
    return parsePcoPerson(includedPeople[0]);
  }

  return null;
}

async function setMemberClaimAndProfile(options) {
  const {
    uid,
    firebaseEmail,
    isMember,
    emailOverride,
    displayNameOverride,
    photoUrlOverride,
    skipPlanningCenter,
    dryRun,
    projectId,
  } = options;

  const { auth, db, authMode } = initializeFirebaseForOperation(projectId);
  const hasUid = Boolean(uid);
  const hasFirebaseEmail = Boolean(firebaseEmail);
  if (!hasUid && !hasFirebaseEmail) {
    throw new Error("Provide --uid or --firebase-email.");
  }

  let userRecord;
  if (hasUid) {
    userRecord = await auth.getUser(uid);
  } else {
    userRecord = await auth.getUserByEmail(firebaseEmail);
  }
  const resolvedUid = userRecord.uid;

  const email = (emailOverride || userRecord.email || "").trim();
  const existingClaims = userRecord.customClaims || {};
  const nextClaims = { ...existingClaims };

  if (isMember) {
    nextClaims.isMember = true;
  } else {
    delete nextClaims.isMember;
  }

  let planningCenterPerson = null;
  if (isMember && !skipPlanningCenter) {
    if (!email) {
      throw new Error(
        "User has no email and no --email override was provided. Planning Center lookup requires an email."
      );
    }
    const pcoCredentials = getPcoCredentials();
    planningCenterPerson = await findPcoPersonByEmail(email, pcoCredentials);
  }

  const fallbackName =
    userRecord.displayName ||
    (email.includes("@")
      ? email.slice(0, email.indexOf("@"))
      : "Church Member");
  const displayName = (
    displayNameOverride ||
    planningCenterPerson?.displayName ||
    fallbackName
  ).trim();
  const photoURL =
    photoUrlOverride !== undefined
      ? photoUrlOverride || null
      : planningCenterPerson?.photoURL || null;

  const memberDocRef = db.collection("members").doc(resolvedUid);
  const claimsPayload = Object.keys(nextClaims).length > 0 ? nextClaims : null;

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          authMode: getAuthModeMessage(authMode),
          uid: resolvedUid,
          email,
          isMember,
          claimsPayload,
          memberDocumentAction: isMember ? "upsert" : "delete",
          memberDocumentPreview: isMember
            ? {
                uid: resolvedUid,
                displayName,
                photoURL,
                email: email || null,
                planningCenterPersonId: planningCenterPerson?.personId || null,
                planningCenterPersonUrl:
                  planningCenterPerson?.personApiUrl || null,
              }
            : null,
        },
        null,
        2
      )
    );
    return;
  }

  await auth.setCustomUserClaims(resolvedUid, claimsPayload);

  if (isMember) {
    await db.runTransaction(async (transaction) => {
      const existingMemberDoc = await transaction.get(memberDocRef);
      transaction.set(
        memberDocRef,
        {
          uid: resolvedUid,
          displayName,
          photoURL,
          email: email || null,
          planningCenterPersonId: planningCenterPerson?.personId || null,
          planningCenterPersonUrl: planningCenterPerson?.personApiUrl || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: existingMemberDoc.exists
            ? existingMemberDoc.data().createdAt ||
              admin.firestore.FieldValue.serverTimestamp()
            : admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  } else {
    await memberDocRef.delete().catch(() => undefined);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        authMode: getAuthModeMessage(authMode),
        uid: resolvedUid,
        email: email || null,
        isMember,
        memberDocumentAction: isMember ? "upserted" : "deleted",
        planningCenterMatched: Boolean(planningCenterPerson),
        planningCenterPersonId: planningCenterPerson?.personId || null,
      },
      null,
      2
    )
  );
}

function printUsageAndExit() {
  console.error(`
Usage:
  node functions/scripts/set-member-from-planning-center.cjs --uid <firebase_uid> [options]
  node functions/scripts/set-member-from-planning-center.cjs --firebase-email <firebase_auth_email> [options]

Required:
  --uid <firebase_uid> OR --firebase-email <firebase_auth_email>

Options:
  --is-member <true|false>      Default: true
  --firebase-email <email>      Resolve Firebase user by Auth email
  --email <email>               Override email used for Planning Center lookup
  --display-name <name>         Override display name written to Firestore
  --photo-url <url>             Override photo URL written to Firestore
  --project-id <id>             Override Firebase project ID
  --skip-planning-center        Skip Planning Center lookup
  --dry-run                     Print planned changes without writing
  --help                        Show this help
  PCO_AUTH_MODE                 Env var: auto|basic|bearer (default: auto)

Auth:
  1) Service account JSON:
     FIREBASE_SERVICE_ACCOUNT_PATH=/abs/path/to/service-account.json ...
  2) ADC (no service account file):
     gcloud auth application-default login
     gcloud config set project <project_id>
     # optional --project-id if needed
`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.uid && !args["firebase-email"])) {
    printUsageAndExit();
  }

  await setMemberClaimAndProfile({
    uid: args.uid ? String(args.uid).trim() : "",
    firebaseEmail: args["firebase-email"]
      ? String(args["firebase-email"]).trim()
      : "",
    isMember: toBoolean(args["is-member"], true),
    emailOverride: args.email ? String(args.email).trim() : "",
    displayNameOverride: args["display-name"]
      ? String(args["display-name"]).trim()
      : "",
    photoUrlOverride:
      args["photo-url"] !== undefined
        ? String(args["photo-url"]).trim()
        : undefined,
    skipPlanningCenter: Boolean(args["skip-planning-center"]),
    dryRun: Boolean(args["dry-run"]),
    projectId: args["project-id"] ? String(args["project-id"]).trim() : "",
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
