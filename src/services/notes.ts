import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { getFirebaseFirestore } from "src/config/firebase";
import type { Note } from "src/types/notes";

/** Write a note with an explicit ID (preserves local ID as Firestore doc ID). */
export const setNoteDoc = async (uid: string, note: Note): Promise<void> => {
  const { id, ...data } = note;
  const ref = doc(getFirebaseFirestore(), "users", uid, "notes", id);
  await setDoc(ref, data);
};

export const updateNoteTextDoc = async (
  uid: string,
  noteId: string,
  text: string
): Promise<void> => {
  const ref = doc(getFirebaseFirestore(), "users", uid, "notes", noteId);
  await updateDoc(ref, { text, updatedAt: Date.now() });
};

export const deleteNoteDoc = async (
  uid: string,
  noteId: string
): Promise<void> => {
  const ref = doc(getFirebaseFirestore(), "users", uid, "notes", noteId);
  await deleteDoc(ref);
};

export const subscribeToNotes = (
  uid: string,
  onUpdate: (notes: Note[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(collection(getFirebaseFirestore(), "users", uid, "notes"));
  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Note, "id">),
      }));
      onUpdate(notes);
    },
    (error) => {
      console.warn("[Notes] Firestore listener error:", error);
      onError?.(error);
    }
  );
};
