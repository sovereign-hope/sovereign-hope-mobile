const admin = require("firebase-admin");
const functions = require("firebase-functions");

if (!admin.apps.length) {
  admin.initializeApp();
}

async function deleteCollectionInBatches(collectionRef, batchSize = 100) {
  let snapshot = await collectionRef.limit(batchSize).get();

  while (!snapshot.empty) {
    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    snapshot = await collectionRef.limit(batchSize).get();
  }
}

// Keep in sync with src/services/members.ts MOUNTAIN_TIME_ZONE
const MOUNTAIN_TIME_ZONE = "America/Boise";
const MAX_PRAYER_PARTNERS = 3;
const PRAYER_ASSIGNMENT_RETENTION_DAYS = 7;
const BATCH_WRITE_LIMIT = 450;

function getMountainDateString(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MOUNTAIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getMountainDateNDaysAgo(days) {
  const [year, month, day] = getMountainDateString()
    .split("-")
    .map((value) => Number(value));
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - days);
  return utcDate.toISOString().slice(0, 10);
}

function shuffleArray(values) {
  const cloned = [...values];
  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = cloned[index];
    cloned[index] = cloned[randomIndex];
    cloned[randomIndex] = current;
  }
  return cloned;
}

function normalizeEmail(email) {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
}

function isAdminToken(context) {
  return (
    context.auth?.token?.admin === true || context.auth?.token?.isAdmin === true
  );
}

function toPrayerMember(docSnapshot) {
  const data = docSnapshot.data();
  const linkedUid =
    typeof data.linkedUid === "string" && data.linkedUid.trim().length > 0
      ? data.linkedUid.trim()
      : null;
  const legacyUid =
    typeof data.uid === "string" && data.uid.trim().length > 0
      ? data.uid.trim()
      : null;
  const source =
    typeof data.source === "string" && data.source.trim().length > 0
      ? data.source.trim()
      : null;

  return {
    memberId: docSnapshot.id,
    linkedUid,
    legacyUid,
    source,
    displayName: data.displayName ?? "Church member",
    photoURL: data.photoURL ?? null,
  };
}

function getAssigneeUid(member) {
  return (
    member.linkedUid ||
    (member.source !== "planning_center" ? member.legacyUid : null)
  );
}

function buildAssigneesByUid(allMembers) {
  const assigneesByUid = new Map();
  for (const member of allMembers) {
    const assigneeUid = getAssigneeUid(member);
    if (!assigneeUid) {
      continue;
    }

    const existing = assigneesByUid.get(assigneeUid);
    if (!existing || (member.linkedUid && !existing.linkedUid)) {
      assigneesByUid.set(assigneeUid, {
        uid: assigneeUid,
        memberId: member.memberId,
        linkedUid: member.linkedUid,
      });
    }
  }

  return assigneesByUid;
}

async function fetchPrayerQueueState(db) {
  const prayerQueueSnapshot = await db.collection("prayerQueue").get();
  const prayerQueueState = new Map();

  prayerQueueSnapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    prayerQueueState.set(doc.id, {
      lastPrayedFor: data.lastPrayedFor ?? null,
      assignmentCount:
        typeof data.assignmentCount === "number" ? data.assignmentCount : 0,
    });
  });

  return prayerQueueState;
}

function getLastPrayedForMillis(queueEntry) {
  if (typeof queueEntry?.lastPrayedFor?.toMillis === "function") {
    return queueEntry.lastPrayedFor.toMillis();
  }

  return 0;
}

function buildSortedMemberQueue(
  allMembers,
  prayerQueueState,
  shuffleFn = shuffleArray
) {
  return shuffleFn(allMembers).sort((leftMember, rightMember) => {
    const leftMillis = getLastPrayedForMillis(
      prayerQueueState.get(leftMember.memberId)
    );
    const rightMillis = getLastPrayedForMillis(
      prayerQueueState.get(rightMember.memberId)
    );

    return leftMillis - rightMillis;
  });
}

function pickFromQueue(
  sortedQueue,
  takenToday,
  excludeUid,
  count = MAX_PRAYER_PARTNERS,
  excludeMemberId = null
) {
  const selectedMembers = [];
  const selectedMemberIds = new Set();

  const trySelect = (member, allowTakenToday) => {
    if (
      member.memberId === excludeMemberId ||
      member.linkedUid === excludeUid ||
      selectedMemberIds.has(member.memberId)
    ) {
      return false;
    }

    if (!allowTakenToday && takenToday.has(member.memberId)) {
      return false;
    }

    selectedMembers.push(member);
    selectedMemberIds.add(member.memberId);
    return selectedMembers.length >= count;
  };

  for (const member of sortedQueue) {
    if (trySelect(member, false)) {
      return selectedMembers;
    }
  }

  for (const member of sortedQueue) {
    if (trySelect(member, true)) {
      return selectedMembers;
    }
  }

  return selectedMembers;
}

function buildPrayerAssignmentPayload(sortedQueue, assignee, takenToday) {
  const selectedMembers = pickFromQueue(
    sortedQueue,
    takenToday,
    assignee.uid,
    MAX_PRAYER_PARTNERS,
    assignee.memberId
  );
  if (selectedMembers.length === 0) {
    return null;
  }

  return {
    memberIds: selectedMembers.map((candidate) => candidate.memberId),
    members: selectedMembers.map((candidate) => ({
      uid: candidate.memberId,
      displayName: candidate.displayName,
      photoURL: candidate.photoURL,
    })),
  };
}

function updatePrayerQueueBatch(batch, db, memberIds) {
  const assignmentCountsByMemberId = new Map();

  for (const memberId of memberIds) {
    const nextCount = assignmentCountsByMemberId.get(memberId) ?? 0;
    assignmentCountsByMemberId.set(memberId, nextCount + 1);
  }

  assignmentCountsByMemberId.forEach((count, memberId) => {
    batch.set(
      db.collection("prayerQueue").doc(memberId),
      {
        memberId,
        lastPrayedFor: admin.firestore.FieldValue.serverTimestamp(),
        assignmentCount: admin.firestore.FieldValue.increment(count),
      },
      { merge: true }
    );
  });

  return assignmentCountsByMemberId.size;
}

exports.__test__ = {
  fetchPrayerQueueState,
  buildSortedMemberQueue,
  pickFromQueue,
  updatePrayerQueueBatch,
};

exports.cleanupDeletedUserData = functions.auth
  .user()
  .onDelete(async (user) => {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(user.uid);
    const progressRef = userRef.collection("progress");

    await deleteCollectionInBatches(progressRef);
    await userRef.delete().catch(() => undefined);
  });

exports.linkMemberOnSignUp = functions.auth.user().onCreate(async (user) => {
  const email = normalizeEmail(user.email);
  if (!email) {
    console.log("Skipping member auto-link, signup has no email.", {
      uid: user.uid,
    });
    return null;
  }

  if (user.emailVerified !== true) {
    console.log(
      "Skipping member auto-link, signup email is not verified yet.",
      {
        uid: user.uid,
        email,
      }
    );
    return null;
  }

  const db = admin.firestore();
  const auth = admin.auth();

  const candidatesById = new Map();

  const allEmailsSnapshot = await db
    .collection("members")
    .where("emailsNormalized", "array-contains", email)
    .limit(5)
    .get();
  allEmailsSnapshot.docs.forEach((doc) => candidatesById.set(doc.id, doc));

  if (candidatesById.size === 0) {
    const normalizedSnapshot = await db
      .collection("members")
      .where("emailNormalized", "==", email)
      .limit(5)
      .get();
    normalizedSnapshot.docs.forEach((doc) => candidatesById.set(doc.id, doc));
  }

  if (candidatesById.size === 0) {
    const fallbackSnapshot = await db
      .collection("members")
      .where("email", "==", email)
      .limit(5)
      .get();
    fallbackSnapshot.docs.forEach((doc) => candidatesById.set(doc.id, doc));
  }

  const candidates = [...candidatesById.values()];

  if (candidates.length === 0) {
    console.log("No Planning Center member doc found for signup email.", {
      uid: user.uid,
      email,
    });
    return null;
  }

  if (candidates.length > 1) {
    const alreadyLinkedToUid = candidates.find((doc) => {
      const linkedUid =
        typeof doc.data()?.linkedUid === "string"
          ? doc.data().linkedUid.trim()
          : "";
      return linkedUid === user.uid;
    });

    if (alreadyLinkedToUid) {
      console.log(
        "Signup auto-link already applied for user with duplicate member candidates.",
        {
          uid: user.uid,
          email,
          memberId: alreadyLinkedToUid.id,
          candidateMemberIds: candidates.map((doc) => doc.id),
        }
      );
      return null;
    }

    console.log("Skipping member auto-link, ambiguous member match.", {
      uid: user.uid,
      email,
      candidateMemberIds: candidates.map((doc) => doc.id),
    });
    return null;
  }

  const targetDoc = candidates[0];
  const targetData = targetDoc.data() || {};
  const currentLinkedUid =
    typeof targetData.linkedUid === "string" ? targetData.linkedUid.trim() : "";

  if (currentLinkedUid && currentLinkedUid !== user.uid) {
    console.log("Skipping member auto-link, member doc already linked.", {
      uid: user.uid,
      email,
      memberId: targetDoc.id,
      linkedUid: currentLinkedUid,
    });
    return null;
  }

  const userRecord = await auth.getUser(user.uid);
  const claims = userRecord.customClaims || {};

  await auth.setCustomUserClaims(user.uid, {
    ...claims,
    isMember: true,
  });

  // Sync displayName and photoURL from the Planning Center member doc
  // to the Firebase Auth user profile (if not already set).
  const authUpdate = {};
  if (!userRecord.displayName && targetData.displayName) {
    authUpdate.displayName = targetData.displayName;
  }
  if (!userRecord.photoURL && targetData.photoURL) {
    authUpdate.photoURL = targetData.photoURL;
  }
  if (Object.keys(authUpdate).length > 0) {
    await auth.updateUser(user.uid, authUpdate);
  }

  await targetDoc.ref.set(
    {
      uid: user.uid,
      linkedUid: user.uid,
      email,
      emailNormalized: email,
      linkedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("Auto-linked signup to member record.", {
    uid: user.uid,
    email,
    memberId: targetDoc.id,
    authUpdate,
  });

  return null;
});

/**
 * Find a Planning Center–seeded member doc whose email matches the given
 * normalized email address. Uses the same three-tier lookup order as
 * linkMemberOnSignUp: emailsNormalized → emailNormalized → email.
 *
 * Returns the first unique match, or null when zero or multiple docs match.
 */
async function findPcoMemberDocByEmail(db, email, targetUid) {
  if (!email) return null;

  const candidatesById = new Map();

  const allEmailsSnapshot = await db
    .collection("members")
    .where("emailsNormalized", "array-contains", email)
    .limit(5)
    .get();
  allEmailsSnapshot.docs.forEach((doc) => candidatesById.set(doc.id, doc));

  if (candidatesById.size === 0) {
    const normalizedSnapshot = await db
      .collection("members")
      .where("emailNormalized", "==", email)
      .limit(5)
      .get();
    normalizedSnapshot.docs.forEach((doc) => candidatesById.set(doc.id, doc));
  }

  if (candidatesById.size === 0) {
    const fallbackSnapshot = await db
      .collection("members")
      .where("email", "==", email)
      .limit(5)
      .get();
    fallbackSnapshot.docs.forEach((doc) => candidatesById.set(doc.id, doc));
  }

  const candidates = [...candidatesById.values()];
  if (candidates.length !== 1) return null;

  const targetData = candidates[0].data() || {};
  const currentLinkedUid =
    typeof targetData.linkedUid === "string" ? targetData.linkedUid.trim() : "";

  // Already linked to a different user — don't hijack it.
  if (currentLinkedUid && currentLinkedUid !== targetUid) {
    return null;
  }

  return candidates[0];
}

exports.setMemberClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can manage member claims."
    );
  }

  const uid = typeof data?.uid === "string" ? data.uid.trim() : "";
  const displayName =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  const photoURL =
    typeof data?.photoURL === "string" && data.photoURL.trim().length > 0
      ? data.photoURL.trim()
      : null;
  const isMember = data?.isMember !== false;

  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "uid is required."
    );
  }

  if (isMember && !displayName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "displayName is required when setting member access."
    );
  }

  const auth = admin.auth();
  const db = admin.firestore();
  const userRecord = await auth.getUser(uid);
  const existingClaims = userRecord.customClaims ?? {};
  const nextClaims = { ...existingClaims };

  if (isMember) {
    nextClaims.isMember = true;
  } else {
    delete nextClaims.isMember;
  }

  await auth.setCustomUserClaims(
    uid,
    Object.keys(nextClaims).length > 0 ? nextClaims : null
  );

  let linkedPcoDocId = null;

  if (isMember) {
    // Try to find and link to an existing PCO-seeded member doc by email.
    const email = normalizeEmail(userRecord.email);
    const pcoDoc = await findPcoMemberDocByEmail(db, email, uid);

    if (pcoDoc) {
      // Link the PCO doc to this Firebase user.
      await pcoDoc.ref.set(
        {
          uid,
          linkedUid: uid,
          linkedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      linkedPcoDocId = pcoDoc.id;

      // Delete the sparse UID-keyed doc if one exists (and isn't the PCO doc).
      if (pcoDoc.id !== uid) {
        await db
          .collection("members")
          .doc(uid)
          .delete()
          .catch(() => undefined);
      }

      // Sync rich profile data to Firebase Auth if missing.
      const pcoData = pcoDoc.data() || {};
      const authUpdate = {};
      if (!userRecord.displayName && pcoData.displayName) {
        authUpdate.displayName = pcoData.displayName;
      }
      if (!userRecord.photoURL && pcoData.photoURL) {
        authUpdate.photoURL = pcoData.photoURL;
      }
      if (Object.keys(authUpdate).length > 0) {
        await auth.updateUser(uid, authUpdate);
      }
    } else {
      // No PCO match — fall back to creating a sparse UID-keyed doc.
      const memberRef = db.collection("members").doc(uid);
      await memberRef.set(
        {
          uid,
          displayName,
          photoURL,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  } else {
    // Revoking membership — delete the UID-keyed doc. If the canonical doc is
    // PCO-keyed we leave it (it can be re-linked later).
    await db
      .collection("members")
      .doc(uid)
      .delete()
      .catch(() => undefined);
  }

  return {
    success: true,
    uid,
    isMember,
    linkedPcoDocId,
  };
});

/**
 * Search for unlinked Planning Center member docs by name.
 * Returns up to 20 results sorted by displayName.
 */
exports.searchUnlinkedPcoMembers = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !isAdminToken(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can search members."
      );
    }

    const searchQuery =
      typeof data?.query === "string" ? data.query.trim().toLowerCase() : "";

    if (!searchQuery) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "query is required."
      );
    }

    const db = admin.firestore();

    // Fetch PCO-seeded members that are not yet linked to a Firebase user.
    // We query by source and filter client-side by name since Firestore
    // doesn't support full-text search.
    // Query by source only — no orderBy to avoid needing a composite index.
    // Filter by name client-side and sort results in JS.
    const snapshot = await db
      .collection("members")
      .where("source", "==", "planning_center")
      .get();

    const results = [];
    for (const doc of snapshot.docs) {
      const d = doc.data();
      // Skip already-linked docs.
      if (d.linkedUid) continue;

      const name = (d.displayName || "").toLowerCase();
      const email = (d.email || "").toLowerCase();
      const firstName = (d.firstName || "").toLowerCase();
      const lastName = (d.lastName || "").toLowerCase();

      if (
        name.includes(searchQuery) ||
        email.includes(searchQuery) ||
        firstName.includes(searchQuery) ||
        lastName.includes(searchQuery)
      ) {
        results.push({
          docId: doc.id,
          displayName: d.displayName || null,
          email: d.email || null,
          photoURL: d.photoURL || null,
          firstName: d.firstName || null,
          lastName: d.lastName || null,
          planningCenterPersonId: d.planningCenterPersonId || doc.id,
        });
      }

      if (results.length >= 20) break;
    }

    results.sort((a, b) =>
      (a.displayName || "").localeCompare(b.displayName || "")
    );

    return { results };
  }
);

/**
 * Manually link a Firebase user to a specific Planning Center member doc.
 * Updates the PCO doc with the user's UID, sets isMember claim, syncs
 * profile data, and cleans up any sparse UID-keyed doc.
 */
exports.linkMemberToPcoRecord = functions.https.onCall(
  async (data, context) => {
    if (!context.auth || !isAdminToken(context)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can link members."
      );
    }

    const uid = typeof data?.uid === "string" ? data.uid.trim() : "";
    const pcoDocId =
      typeof data?.pcoDocId === "string" ? data.pcoDocId.trim() : "";

    if (!uid || !pcoDocId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "uid and pcoDocId are required."
      );
    }

    const auth = admin.auth();
    const db = admin.firestore();

    const pcoRef = db.collection("members").doc(pcoDocId);
    const pcoSnap = await pcoRef.get();

    if (!pcoSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Planning Center member doc not found."
      );
    }

    const pcoData = pcoSnap.data() || {};
    if (pcoData.linkedUid && pcoData.linkedUid !== uid) {
      throw new functions.https.HttpsError(
        "already-exists",
        `This Planning Center record is already linked to a different user (${pcoData.linkedUid}).`
      );
    }

    // Update the PCO doc with Firebase UID.
    await pcoRef.set(
      {
        uid,
        linkedUid: uid,
        linkedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Set isMember claim.
    const userRecord = await auth.getUser(uid);
    const existingClaims = userRecord.customClaims ?? {};
    await auth.setCustomUserClaims(uid, { ...existingClaims, isMember: true });

    // Sync rich profile data to Firebase Auth.
    const authUpdate = {};
    if (!userRecord.displayName && pcoData.displayName) {
      authUpdate.displayName = pcoData.displayName;
    }
    if (!userRecord.photoURL && pcoData.photoURL) {
      authUpdate.photoURL = pcoData.photoURL;
    }
    if (Object.keys(authUpdate).length > 0) {
      await auth.updateUser(uid, authUpdate);
    }

    // Delete sparse UID-keyed doc if it exists (and isn't the PCO doc).
    if (pcoDocId !== uid) {
      await db
        .collection("members")
        .doc(uid)
        .delete()
        .catch(() => undefined);
    }

    return {
      success: true,
      uid,
      pcoDocId,
      displayName: pcoData.displayName || null,
      photoURL: pcoData.photoURL || null,
    };
  }
);

exports.generateDailyPrayerAssignments = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone(MOUNTAIN_TIME_ZONE)
  .onRun(async () => {
    const db = admin.firestore();
    const date = getMountainDateString();
    const parentDocRef = db.collection("prayerAssignments").doc(date);
    const parentDoc = await parentDocRef.get();

    if (parentDoc.data()?.generationCompletedAt) {
      console.log(
        "Skipping prayer assignment generation, day already complete.",
        {
          date,
        }
      );
      return null;
    }

    const membersSnapshot = await db.collection("members").get();
    const allMembers = membersSnapshot.docs.map(toPrayerMember);
    const assigneesByUid = buildAssigneesByUid(allMembers);
    const prayerQueueState = await fetchPrayerQueueState(db);
    const sortedQueue = buildSortedMemberQueue(allMembers, prayerQueueState);
    const assignees = shuffleArray([...assigneesByUid.values()]);
    const existingAssignmentsSnapshot = await parentDocRef
      .collection("assignments")
      .get();

    if (assignees.length === 0) {
      console.log(
        "Skipping prayer assignment generation, no account-linked members found."
      );
      return null;
    }

    const takenToday = new Set();
    const existingAssignmentUids = new Set();
    existingAssignmentsSnapshot.docs.forEach((doc) => {
      existingAssignmentUids.add(doc.id);
      const memberIds = Array.isArray(doc.data()?.memberIds)
        ? doc.data().memberIds
        : [];
      memberIds.forEach((memberId) => {
        if (typeof memberId === "string") {
          takenToday.add(memberId);
        }
      });
    });

    let batch = db.batch();
    let operations = 0;
    let generatedCount = 0;

    const flushBatch = async () => {
      if (operations === 0) {
        return;
      }
      await batch.commit();
      batch = db.batch();
      operations = 0;
    };

    batch.set(
      parentDocRef,
      {
        date,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    operations += 1;

    for (const assignee of assignees) {
      if (existingAssignmentUids.has(assignee.uid)) {
        continue;
      }

      const payload = buildPrayerAssignmentPayload(
        sortedQueue,
        assignee,
        takenToday
      );
      if (!payload) {
        continue;
      }

      const queueUpdatesCount = new Set(payload.memberIds).size;
      if (operations + 1 + queueUpdatesCount > BATCH_WRITE_LIMIT) {
        await flushBatch();
      }

      const assignmentRef = parentDocRef
        .collection("assignments")
        .doc(assignee.uid);

      batch.set(assignmentRef, {
        ...payload,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      operations += 1;
      generatedCount += 1;
      payload.memberIds.forEach((memberId) => takenToday.add(memberId));
      operations += updatePrayerQueueBatch(batch, db, payload.memberIds);

      if (operations >= BATCH_WRITE_LIMIT) {
        await flushBatch();
      }
    }

    if (operations + 1 > BATCH_WRITE_LIMIT) {
      await flushBatch();
    }

    batch.set(
      parentDocRef,
      {
        date,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        generationCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    operations += 1;

    await flushBatch();
    console.log("Generated daily prayer assignments.", {
      date,
      generatedCount,
      existingAssignmentCount: existingAssignmentUids.size,
      totalMembers: allMembers.length,
      totalAssignees: assignees.length,
    });
    return null;
  });

exports.requestDailyPrayerAssignment = functions.https.onCall(
  async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in."
      );
    }

    if (context.auth.token?.isMember !== true) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "This feature is available to members only."
      );
    }

    const uid = context.auth.uid;
    const date = getMountainDateString();
    const db = admin.firestore();
    const parentDocRef = db.collection("prayerAssignments").doc(date);
    const assignmentRef = parentDocRef.collection("assignments").doc(uid);
    const existingAssignment = await assignmentRef.get();

    if (existingAssignment.exists) {
      return {
        created: false,
        date,
      };
    }

    const membersSnapshot = await db.collection("members").get();
    const allMembers = membersSnapshot.docs.map(toPrayerMember);
    const prayerQueueState = await fetchPrayerQueueState(db);
    const sortedQueue = buildSortedMemberQueue(allMembers, prayerQueueState);
    const assignee = buildAssigneesByUid(allMembers).get(uid);

    if (!assignee) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No linked member profile was found for your account."
      );
    }

    const existingAssignmentsSnapshot = await parentDocRef
      .collection("assignments")
      .get();
    const takenToday = new Set();
    existingAssignmentsSnapshot.docs.forEach((doc) => {
      const memberIds = Array.isArray(doc.data()?.memberIds)
        ? doc.data().memberIds
        : [];
      memberIds.forEach((memberId) => {
        if (typeof memberId === "string") {
          takenToday.add(memberId);
        }
      });
    });

    const payload = buildPrayerAssignmentPayload(
      sortedQueue,
      assignee,
      takenToday
    );
    if (!payload) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Not enough members are available to generate an assignment."
      );
    }

    try {
      const batch = db.batch();
      batch.set(
        parentDocRef,
        {
          date,
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batch.create(assignmentRef, {
        ...payload,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updatePrayerQueueBatch(batch, db, payload.memberIds);
      await batch.commit();
    } catch (error) {
      const errorCode = String(error?.code ?? "");
      if (errorCode === "already-exists" || errorCode === "6") {
        return {
          created: false,
          date,
        };
      }
      throw error;
    }

    return {
      created: true,
      date,
      memberCount: payload.memberIds.length,
    };
  }
);

// ── Admin: Reading Plan Management ──────────────────────────────────────────

exports.saveReadingPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can manage reading plans."
    );
  }

  const plan = data?.plan;
  if (!plan || typeof plan.id !== "string" || !plan.id.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "plan.id is required."
    );
  }
  if (!Array.isArray(plan.weeks)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "plan.weeks must be an array."
    );
  }

  const db = admin.firestore();
  await db
    .collection("readingPlans")
    .doc(plan.id)
    .set({
      id: plan.id,
      title: plan.title || "",
      description: plan.description || "",
      weeks: plan.weeks,
    });

  return { success: true, planId: plan.id };
});

exports.deleteReadingPlan = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can delete reading plans."
    );
  }

  const planId = typeof data?.planId === "string" ? data.planId.trim() : "";
  if (!planId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "planId is required."
    );
  }

  const db = admin.firestore();
  await db.collection("readingPlans").doc(planId).delete();

  return { success: true, planId };
});

// ── Admin: Admin Claim Management ───────────────────────────────────────────

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can manage admin claims."
    );
  }

  const uid = typeof data?.uid === "string" ? data.uid.trim() : "";
  const isAdmin = data?.isAdmin !== false;

  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "uid is required."
    );
  }

  // Prevent admin from removing their own admin role
  if (!isAdmin && uid === context.auth.uid) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Cannot remove your own admin role."
    );
  }

  const auth = admin.auth();
  const userRecord = await auth.getUser(uid);
  const existingClaims = userRecord.customClaims ?? {};
  const nextClaims = { ...existingClaims };

  if (isAdmin) {
    nextClaims.isAdmin = true;
  } else {
    delete nextClaims.isAdmin;
    delete nextClaims.admin;
  }

  await auth.setCustomUserClaims(
    uid,
    Object.keys(nextClaims).length > 0 ? nextClaims : null
  );

  return { success: true, uid, isAdmin };
});

// ── Admin: List Firebase Auth Users ─────────────────────────────────────────

exports.listFirebaseUsers = functions.https.onCall(async (_data, context) => {
  if (!context.auth || !isAdminToken(context)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can list users."
    );
  }

  const auth = admin.auth();
  const users = [];
  let nextPageToken;

  do {
    const listResult = await auth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      users.push({
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        customClaims: user.customClaims || null,
      });
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  return { users };
});

// ── Scheduled Functions ─────────────────────────────────────────────────────

exports.cleanupOldPrayerAssignments = functions.pubsub
  .schedule("0 0 * * 0")
  .timeZone(MOUNTAIN_TIME_ZONE)
  .onRun(async () => {
    const db = admin.firestore();
    const cutoffDate = getMountainDateNDaysAgo(
      PRAYER_ASSIGNMENT_RETENTION_DAYS
    );
    const oldDateDocs = await db
      .collection("prayerAssignments")
      .where(admin.firestore.FieldPath.documentId(), "<", cutoffDate)
      .get();

    let deletedAssignmentCount = 0;

    for (const dateDoc of oldDateDocs.docs) {
      const assignmentsSnapshot = await dateDoc.ref
        .collection("assignments")
        .get();
      let batch = db.batch();
      let operations = 0;

      const flushBatch = async () => {
        if (operations === 0) {
          return;
        }
        await batch.commit();
        batch = db.batch();
        operations = 0;
      };

      for (const assignmentDoc of assignmentsSnapshot.docs) {
        batch.delete(assignmentDoc.ref);
        operations += 1;
        deletedAssignmentCount += 1;

        if (operations >= BATCH_WRITE_LIMIT) {
          await flushBatch();
        }
      }

      await flushBatch();
      await dateDoc.ref.delete();
    }

    console.log("Cleaned up old prayer assignments.", {
      cutoffDate,
      deletedDateDocs: oldDateDocs.size,
      deletedAssignmentCount,
    });

    return null;
  });
