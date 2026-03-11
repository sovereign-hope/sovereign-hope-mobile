import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { getFirebaseFirestore } from "src/config/firebase";
import type { Highlight, HighlightColor } from "src/types/highlights";

const getHighlightsCollection = (uid: string) =>
  collection(getFirebaseFirestore(), "users", uid, "highlights");

export const addHighlightDoc = async (
  uid: string,
  data: Omit<Highlight, "id">
): Promise<string> => {
  const ref = await addDoc(getHighlightsCollection(uid), data);
  return ref.id;
};

export const updateHighlightColorDoc = async (
  uid: string,
  highlightId: string,
  color: HighlightColor
): Promise<void> => {
  const ref = doc(
    getFirebaseFirestore(),
    "users",
    uid,
    "highlights",
    highlightId
  );
  await updateDoc(ref, { color, updatedAt: Date.now() });
};

export const deleteHighlightDoc = async (
  uid: string,
  highlightId: string
): Promise<void> => {
  const ref = doc(
    getFirebaseFirestore(),
    "users",
    uid,
    "highlights",
    highlightId
  );
  await deleteDoc(ref);
};

export const subscribeToHighlights = (
  uid: string,
  onUpdate: (highlights: Highlight[]) => void
): Unsubscribe => {
  const q = query(getHighlightsCollection(uid));
  return onSnapshot(q, (snapshot) => {
    const highlights: Highlight[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Highlight, "id">),
    }));
    onUpdate(highlights);
  });
};
