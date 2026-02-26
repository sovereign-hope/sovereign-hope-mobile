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

exports.cleanupDeletedUserData = functions.auth
  .user()
  .onDelete(async (user) => {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(user.uid);
    const progressRef = userRef.collection("progress");

    await deleteCollectionInBatches(progressRef);
    await userRef.delete().catch(() => undefined);
  });
