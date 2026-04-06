import { AppState, AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import { selectAllNotes } from "src/redux/notesSlice";
import {
  clearNotesExportDirty,
  disconnectNotesExport,
  hydrateNotesExportState,
  markNotesExportDirty,
  selectIsNotesExportConnected,
  selectNotesExportHasHydrated,
  selectNotesExportIsDirty,
} from "src/redux/notesExportSlice";
import {
  clearNotesExportStateFromStorage,
  loadNotesExportStateFromStorage,
  saveNotesExportStateToStorage,
} from "src/services/notesExportLocal";
import { useNotesExportActions } from "src/hooks/useNotesExportActions";

const SAVE_DEBOUNCE_MS = 500;
const SYNC_DEBOUNCE_MS = 5000;

export const useNotesExportSync = (): void => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const notes = useAppSelector(selectAllNotes);
  const notesExportState = useAppSelector((state) => state.notesExport);
  const isConnected = useAppSelector(selectIsNotesExportConnected);
  const isDirty = useAppSelector(selectNotesExportIsDirty);
  const hasHydrated = useAppSelector(selectNotesExportHasHydrated);
  const { syncNow, isWorking } = useNotesExportActions();

  const notesRef = useRef(notes);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const saveTimerRef =
    // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires explicit initial value in strict mode
    useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncTimerRef =
    // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires explicit initial value in strict mode
    useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previousNotesRef = useRef(notes);

  notesRef.current = notes;

  useEffect(() => {
    const hydrate = async () => {
      const storedState = await loadNotesExportStateFromStorage();
      dispatch(hydrateNotesExportState(storedState));
    };

    void hydrate();
  }, [dispatch]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void saveNotesExportStateToStorage(notesExportState);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [hasHydrated, notesExportState]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (previousNotesRef.current !== notes) {
      previousNotesRef.current = notes;

      if (user?.uid && isConnected) {
        dispatch(markNotesExportDirty());
      }
    }
  }, [dispatch, hasHydrated, isConnected, notes, user?.uid]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!user?.uid) {
      previousNotesRef.current = notesRef.current;
      dispatch(disconnectNotesExport());
      void clearNotesExportStateFromStorage();
      return;
    }

    if (isConnected && !notesExportState.lastSyncedAt) {
      dispatch(markNotesExportDirty());
    }
  }, [
    dispatch,
    hasHydrated,
    isConnected,
    notesExportState.lastSyncedAt,
    user?.uid,
  ]);

  useEffect(() => {
    if (!hasHydrated || !user?.uid || !isConnected || !isDirty || isWorking) {
      return;
    }

    if (appStateRef.current !== "active") {
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      void syncNow().then((didSync) => {
        if (didSync) {
          dispatch(clearNotesExportDirty());
        }

        return didSync;
      });
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [
    dispatch,
    hasHydrated,
    isConnected,
    isDirty,
    isWorking,
    syncNow,
    user?.uid,
  ]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = /inactive|background/.test(appStateRef.current);
      appStateRef.current = nextState;

      if (
        wasBackgrounded &&
        nextState === "active" &&
        user?.uid &&
        isConnected &&
        isDirty
      ) {
        void syncNow().then((didSync) => {
          if (didSync) {
            dispatch(clearNotesExportDirty());
          }

          return didSync;
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch, isConnected, isDirty, syncNow, user?.uid]);
};
