#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require("node:fs");
const { execSync } = require("node:child_process");
const admin = require("firebase-admin");

const PCO_API_BASE_URL = "https://api.planningcenteronline.com/people/v2";
const KEYCHAIN_PCO_CLIENT_ID_SERVICE = "sovereign-hope-mobile.pco_client_id";
const KEYCHAIN_PCO_ACCESS_TOKEN_SERVICE =
  "sovereign-hope-mobile.pco_access_token";

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

    return { db: admin.firestore(), authMode: "service-account" };
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

  return { db: admin.firestore(), authMode: "adc" };
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

function getAllEmailsForPerson(person, emailsById) {
  const emailRefs = person.relationships?.emails?.data || [];
  const seen = new Set();
  const values = [];

  for (const ref of emailRefs) {
    const resolved = emailsById.get(String(ref.id));
    if (!resolved || resolved.blocked || !resolved.address) {
      continue;
    }

    const normalized = String(resolved.address).trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    values.push({
      address: normalized,
      primary: resolved.primary === true,
    });
  }

  return values;
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
      ? [{ mode: "basic", headers: { Authorization: basicAuthHeader } }]
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
          { mode: "basic", headers: { Authorization: basicAuthHeader } },
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
        "User-Agent": "sovereign-hope-mobile-member-seed/1.0",
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

async function resolveMembersList(credentials, listName, listId) {
  if (listId) {
    const json = await fetchPcoJson(
      `${PCO_API_BASE_URL}/lists/${encodeURIComponent(listId)}`,
      credentials
    );
    if (!json?.data || json.data.type !== "List") {
      throw new Error(`List ID ${listId} was not found in Planning Center.`);
    }
    return {
      id: String(json.data.id),
      name: json.data.attributes?.name || "Members",
    };
  }

  const queryUrl =
    `${PCO_API_BASE_URL}/lists` +
    `?where[name]=${encodeURIComponent(listName)}` +
    "&per_page=100";
  const json = await fetchPcoJson(queryUrl, credentials);
  const lists = (json?.data || []).filter((item) => item.type === "List");

  if (lists.length === 0) {
    throw new Error(`No Planning Center list found with name "${listName}".`);
  }

  const exactMatches = lists.filter(
    (list) =>
      String(list.attributes?.name || "").toLowerCase() ===
      String(listName).toLowerCase()
  );
  const chosen = exactMatches[0] || lists[0];

  return {
    id: String(chosen.id),
    name: chosen.attributes?.name || listName,
  };
}

async function fetchAllPeopleFromList(credentials, listId, perPage) {
  const allPeople = [];
  const allIncludedResources = [];
  let nextUrl =
    `${PCO_API_BASE_URL}/lists/${encodeURIComponent(listId)}/people` +
    `?per_page=${perPage}` +
    "&include=emails,households,household_memberships";
  const visitedUrls = new Set();

  while (nextUrl) {
    if (visitedUrls.has(nextUrl)) {
      throw new Error(
        "Pagination loop detected while reading Planning Center list."
      );
    }
    visitedUrls.add(nextUrl);

    const json = await fetchPcoJson(nextUrl, credentials);
    const people = (json?.data || []).filter((item) => item.type === "Person");

    allPeople.push(...people);
    allIncludedResources.push(...(json?.included || []));

    nextUrl = json?.links?.next || null;
  }

  return { people: allPeople, includedResources: allIncludedResources };
}

function buildPcoResourceMaps(includedResources) {
  const emailsById = new Map();
  const householdsById = new Map();
  const householdMembershipsById = new Map();

  for (const resource of includedResources) {
    const resourceId = String(resource.id);

    if (resource.type === "Email") {
      emailsById.set(resourceId, {
        address: resource.attributes?.address || "",
        primary: resource.attributes?.primary === true,
        blocked: resource.attributes?.blocked === true,
      });
      continue;
    }

    if (resource.type === "Household") {
      householdsById.set(resourceId, {
        id: resourceId,
        name: resource.attributes?.name?.trim() || null,
      });
      continue;
    }

    if (resource.type === "HouseholdMembership") {
      householdMembershipsById.set(resourceId, resource);
    }
  }

  return { emailsById, householdsById, householdMembershipsById };
}

function getHouseholdContextForPerson(
  person,
  householdsById,
  householdMembershipsById
) {
  const membershipRefs =
    person.relationships?.household_memberships?.data || [];
  const householdMemberships = membershipRefs
    .map((membershipRef) =>
      householdMembershipsById.get(String(membershipRef.id || ""))
    )
    .filter(Boolean);

  const chosenMembership =
    householdMemberships.find(
      (membership) => membership.attributes?.primary_contact === true
    ) || householdMemberships[0];
  const householdId =
    chosenMembership?.relationships?.household?.data?.id ||
    person.relationships?.households?.data?.[0]?.id ||
    null;
  const normalizedHouseholdId = householdId ? String(householdId).trim() : "";
  const household = normalizedHouseholdId
    ? householdsById.get(normalizedHouseholdId)
    : null;

  return {
    householdId: normalizedHouseholdId || null,
    householdName: household?.name || null,
    isHeadOfHousehold: chosenMembership?.attributes?.primary_contact === true,
  };
}

function buildCandidates(people, includedResources, limit) {
  const { emailsById, householdsById, householdMembershipsById } =
    buildPcoResourceMaps(includedResources);

  const dedupeByPersonId = new Map();
  for (const person of people) {
    const personId = String(person.id);
    if (dedupeByPersonId.has(personId)) {
      continue;
    }

    const emails = getAllEmailsForPerson(person, emailsById);
    const primaryEmail =
      emails.find((entry) => entry.primary === true)?.address ||
      emails[0]?.address ||
      null;
    const householdContext = getHouseholdContextForPerson(
      person,
      householdsById,
      householdMembershipsById
    );

    dedupeByPersonId.set(personId, {
      personId,
      displayName:
        getPersonDisplayName(person.attributes || {}) || "Church Member",
      photoURL: getPersonPhotoUrl(person.attributes || {}),
      email: primaryEmail,
      emailNormalized: primaryEmail,
      emails,
      emailsNormalized: emails.map((entry) => entry.address),
      personApiUrl: person.links?.self || null,
      firstName: person.attributes?.first_name?.trim() || null,
      lastName: person.attributes?.last_name?.trim() || null,
      householdId: householdContext.householdId,
      householdName: householdContext.householdName,
      isHeadOfHousehold: householdContext.isHeadOfHousehold,
    });
  }

  const candidates = [...dedupeByPersonId.values()];
  const householdLastNamesById = new Map();

  for (const candidate of candidates) {
    if (!candidate.householdId || !candidate.lastName) {
      continue;
    }

    if (
      candidate.isHeadOfHousehold ||
      !householdLastNamesById.has(candidate.householdId)
    ) {
      householdLastNamesById.set(candidate.householdId, candidate.lastName);
    }
  }

  const values = candidates.map((candidate) => ({
    ...candidate,
    householdLastName: candidate.householdId
      ? householdLastNamesById.get(candidate.householdId) || candidate.lastName
      : null,
  }));

  if (limit > 0) {
    return values.slice(0, limit);
  }
  return values;
}

async function upsertSeedMember(db, listInfo, candidate, dryRun) {
  const ref = db.collection("members").doc(candidate.personId);

  if (dryRun) {
    const existing = await ref.get();
    return {
      existed: existing.exists,
      linked: Boolean(existing.data()?.linkedUid),
    };
  }

  let existed = false;
  let linked = false;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    existed = existing.exists;
    const existingData = existing.data() || {};
    linked = Boolean(existingData.linkedUid);
    const linkedUid =
      typeof existingData.linkedUid === "string" &&
      existingData.linkedUid.trim()
        ? existingData.linkedUid.trim()
        : null;

    transaction.set(
      ref,
      {
        memberId: candidate.personId,
        uid: linkedUid,
        linkedUid,
        email: candidate.email,
        emailNormalized: candidate.emailNormalized,
        emails: candidate.emails,
        emailsNormalized: candidate.emailsNormalized,
        displayName: candidate.displayName,
        photoURL: candidate.photoURL,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        householdId: candidate.householdId,
        householdName: candidate.householdName,
        householdLastName: candidate.householdLastName,
        isHeadOfHousehold: candidate.isHeadOfHousehold,
        source: "planning_center",
        planningCenterPersonId: candidate.personId,
        planningCenterPersonUrl: candidate.personApiUrl,
        planningCenterListId: listInfo.id,
        planningCenterListName: listInfo.name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeededAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: existing.exists
          ? existingData.createdAt ||
            admin.firestore.FieldValue.serverTimestamp()
          : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return { existed, linked };
}

async function seedMembers(options) {
  const { listName, listId, perPage, limit, dryRun, projectId } = options;
  const pcoCredentials = getPcoCredentials();
  const { db, authMode } = initializeFirebaseAdmin(projectId);
  const listInfo = await resolveMembersList(pcoCredentials, listName, listId);
  const { people, includedResources } = await fetchAllPeopleFromList(
    pcoCredentials,
    listInfo.id,
    perPage
  );
  const candidates = buildCandidates(people, includedResources, limit);

  const summary = {
    ok: true,
    dryRun,
    authMode,
    list: listInfo,
    totalPeopleInList: people.length,
    includedResourceRecords: includedResources.length,
    candidates: candidates.length,
    seededCreated: 0,
    seededUpdated: 0,
    alreadyLinked: 0,
    withoutEmail: 0,
    sample: [],
  };

  for (const candidate of candidates) {
    if (!candidate.email) {
      summary.withoutEmail += 1;
    }

    const result = await upsertSeedMember(db, listInfo, candidate, dryRun);

    if (result.linked) {
      summary.alreadyLinked += 1;
    }

    if (result.existed) {
      summary.seededUpdated += 1;
    } else {
      summary.seededCreated += 1;
    }

    if (summary.sample.length < 50) {
      summary.sample.push({
        personId: candidate.personId,
        email: candidate.email,
        displayName: candidate.displayName,
        householdId: candidate.householdId,
        householdName: candidate.householdName,
        existed: result.existed,
        alreadyLinked: result.linked,
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

function printUsageAndExit(exitCode = 1) {
  console.error(`
Usage:
  node functions/scripts/bulk-seed-members-from-planning-center.cjs [options]

Options:
  --list-name <name>            Planning Center list name (default: Members)
  --list-id <id>                Planning Center list id (overrides --list-name)
  --per-page <n>                PCO page size (default: 100)
  --limit <n>                   Limit number of candidates (testing)
  --project-id <id>             Firebase project override
  --dry-run                     Preview without writing
  --help                        Show this help
  PCO_AUTH_MODE                 Env var: auto|basic|bearer (default: auto)

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

  await seedMembers({
    listName: args["list-name"] ? String(args["list-name"]).trim() : "Members",
    listId: args["list-id"] ? String(args["list-id"]).trim() : "",
    perPage: toPositiveInt(args["per-page"], 100),
    limit: args.limit ? toPositiveInt(args.limit, 0) : 0,
    projectId: args["project-id"] ? String(args["project-id"]).trim() : "",
    dryRun: Boolean(args["dry-run"]),
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
