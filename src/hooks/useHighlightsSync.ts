import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import { selectAllHighlights, setHighlights } from "src/redux/highlightsSlice";
import {
  subscribeToHighlights,
  setHighlightDoc,
} from "src/services/highlights";
import {
  clearHighlightsFromStorage,
  loadHighlightsFromStorage,
  saveHighlightsToStorage,
} from "src/services/highlightsLocal";
import type { Highlight } from "src/types/highlights";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Push local highlights to Firestore.
 * Called once on sign-in to sync any highlights created while signed out.
 */
const mergeLocalHighlightsToFirestore = async (
  uid: string,
  localHighlights: Highlight[]
): Promise<void> => {
  if (localHighlights.length === 0) return;

  try {
    for (const highlight of localHighlights) {
      await setHighlightDoc(uid, highlight);
    }
  } catch (error) {
    console.warn(
      "[Highlights] Failed to merge local highlights to Firestore:",
      error
    );
  }
};

/**
 * Local-first highlights sync.
 *
 * - On mount: load highlights from AsyncStorage into Redux (works without auth).
 * - On Redux change: persist back to AsyncStorage (write-through).
 * - On sign-in: merge local highlights with Firestore, then subscribe to live updates.
 * - On sign-out: keep local highlights (don't clear).
 */
export const useHighlightsSync = (): void => {
  const user = useAppSelector(selectAuthUser);
  const highlights = useAppSelector(selectAllHighlights);
  const dispatch = useAppDispatch();

  // eslint-disable-next-line unicorn/no-null
  const prevUidRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);
  // Keep a ref to the latest highlights so the sign-in merge always
  // uses the current value (avoids stale closure in the auth effect).
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;
  // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires initial value in strict mode
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Debounced save — avoids redundant AsyncStorage writes during rapid
  // changes like drag-to-select (which updates the range many times/second).
  const debouncedSave = useCallback((data: Highlight[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveHighlightsToStorage(data);
    }, SAVE_DEBOUNCE_MS);
  }, []);

  // 1. Load from AsyncStorage on mount (always, regardless of auth)
  useEffect(() => {
    const load = async () => {
      const stored = await loadHighlightsFromStorage();
      if (stored.length > 0) {
        dispatch(setHighlights(stored));
      }
      isInitialLoadRef.current = false;
    };
    void load();
  }, [dispatch]);

  // 2. Write-through: persist Redux highlights to AsyncStorage on change (debounced)
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    debouncedSave(highlights);
  }, [highlights, debouncedSave]);

  // 3. Auth-aware: merge on sign-in, subscribe while signed in
  useEffect(() => {
    // eslint-disable-next-line unicorn/no-null
    const uid = user?.uid ?? null;
    const prevUid = prevUidRef.current;
    prevUidRef.current = uid;

    // User just signed out — clear local highlights to prevent data leakage
    // on shared devices (User A's highlights should not merge into User B's account).
    if (prevUid && !uid) {
      dispatch(setHighlights([]));
      void clearHighlightsFromStorage();
      return;
    }

    if (!uid) return;

    // User just signed in — merge local highlights into Firestore
    if (!prevUid && uid) {
      void mergeLocalHighlightsToFirestore(uid, highlightsRef.current);
    }

    // Subscribe to Firestore for live updates while signed in
    const unsubscribe = subscribeToHighlights(uid, (remote) => {
      dispatch(setHighlights(remote));
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on auth change
  }, [dispatch, user?.uid]);
};
