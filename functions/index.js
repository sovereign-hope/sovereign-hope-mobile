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

function buildPrayerAssignmentPayload(allMembers, assignee) {
  const eligibleMembers = allMembers.filter(
    (candidate) =>
      candidate.memberId !== assignee.memberId &&
      candidate.linkedUid !== assignee.uid
  );
  if (eligibleMembers.length === 0) {
    return null;
  }

  const randomMembers = shuffleArray(eligibleMembers).slice(
    0,
    Math.min(MAX_PRAYER_PARTNERS, eligibleMembers.length)
  );

  return {
    memberIds: randomMembers.map((candidate) => candidate.memberId),
    members: randomMembers.map((candidate) => ({
      uid: candidate.memberId,
      displayName: candidate.displayName,
      photoURL: candidate.photoURL,
    })),
  };
}

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
  });

  return null;
});

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

  const memberRef = db.collection("members").doc(uid);
  if (isMember) {
    await memberRef.set(
      {
        uid,
        displayName,
        photoURL,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await memberRef.delete().catch(() => undefined);
  }

  return {
    success: true,
    uid,
    isMember,
  };
});

exports.generateDailyPrayerAssignments = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone(MOUNTAIN_TIME_ZONE)
  .onRun(async () => {
    const db = admin.firestore();
    const membersSnapshot = await db.collection("members").get();
    const allMembers = membersSnapshot.docs.map(toPrayerMember);
    const assigneesByUid = buildAssigneesByUid(allMembers);
    const assignees = [...assigneesByUid.values()];

    if (assignees.length === 0) {
      console.log(
        "Skipping prayer assignment generation, no account-linked members found."
      );
      return null;
    }

    const date = getMountainDateString();
    const parentDocRef = db.collection("prayerAssignments").doc(date);
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
      const payload = buildPrayerAssignmentPayload(allMembers, assignee);
      if (!payload) {
        continue;
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

      if (operations >= BATCH_WRITE_LIMIT) {
        await flushBatch();
      }
    }

    await flushBatch();
    console.log("Generated daily prayer assignments.", {
      date,
      generatedCount,
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
    const assignee = buildAssigneesByUid(allMembers).get(uid);

    if (!assignee) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No linked member profile was found for your account."
      );
    }

    const payload = buildPrayerAssignmentPayload(allMembers, assignee);
    if (!payload) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Not enough members are available to generate an assignment."
      );
    }

    await parentDocRef.set(
      {
        date,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    try {
      await assignmentRef.create({
        ...payload,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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
