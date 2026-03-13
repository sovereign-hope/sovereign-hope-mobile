import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import { selectAllNotes, setNotes } from "src/redux/notesSlice";
import { subscribeToNotes, setNoteDoc } from "src/services/notes";
import {
  clearNotesFromStorage,
  loadNotesFromStorage,
  saveNotesToStorage,
} from "src/services/notesLocal";
import type { Note } from "src/types/notes";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Push local notes to Firestore.
 * Called once on sign-in to sync any notes created while signed out.
 */
const mergeLocalNotesToFirestore = async (
  uid: string,
  localNotes: Note[]
): Promise<void> => {
  if (localNotes.length === 0) return;

  try {
    for (const note of localNotes) {
      await setNoteDoc(uid, note);
    }
  } catch (error) {
    console.warn("[Notes] Failed to merge local notes to Firestore:", error);
  }
};

/**
 * Local-first notes sync.
 *
 * - On mount: load notes from AsyncStorage into Redux (works without auth).
 * - On Redux change: persist back to AsyncStorage (write-through).
 * - On sign-in: merge local notes with Firestore, then subscribe to live updates.
 * - On sign-out: clear local notes to prevent data leakage.
 */
export const useNotesSync = (): void => {
  const user = useAppSelector(selectAuthUser);
  const notes = useAppSelector(selectAllNotes);
  const dispatch = useAppDispatch();

  // eslint-disable-next-line unicorn/no-null
  const prevUidRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires initial value in strict mode
    undefined
  );

  const debouncedSave = useCallback((data: Note[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveNotesToStorage(data);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // 1. Load from AsyncStorage on mount (always, regardless of auth)
  useEffect(() => {
    const load = async () => {
      const stored = await loadNotesFromStorage();
      if (stored.length > 0) {
        dispatch(setNotes(stored));
      }
      isInitialLoadRef.current = false;
    };
    void load();
  }, [dispatch]);

  // 2. Write-through: persist Redux notes to AsyncStorage on change (debounced)
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    debouncedSave(notes);
  }, [notes, debouncedSave]);

  // 3. Auth-aware: merge on sign-in, subscribe while signed in
  useEffect(() => {
    // eslint-disable-next-line unicorn/no-null
    const uid = user?.uid ?? null;
    const prevUid = prevUidRef.current;
    prevUidRef.current = uid;

    // User just signed out — clear local notes to prevent data leakage
    if (prevUid && !uid) {
      dispatch(setNotes([]));
      void clearNotesFromStorage();
      return;
    }

    if (!uid) return;

    // User just signed in — merge local notes into Firestore
    if (!prevUid && uid) {
      void mergeLocalNotesToFirestore(uid, notesRef.current);
    }

    // Subscribe to Firestore for live updates while signed in
    const unsubscribe = subscribeToNotes(uid, (remote) => {
      dispatch(setNotes(remote));
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on auth change
  }, [dispatch, user?.uid]);
};
