import { AppState, AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthIsInitialized, selectAuthUser } from "src/redux/authSlice";
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
  const authIsInitialized = useAppSelector(selectAuthIsInitialized);
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
  const previousUidRef =
    // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires explicit initial value in strict mode
    useRef<string | undefined>(undefined);
  const hydratedUidRef =
    // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires explicit initial value in strict mode
    useRef<string | undefined>(undefined);

  notesRef.current = notes;

  useEffect(() => {
    if (!authIsInitialized) {
      return;
    }

    hydratedUidRef.current = undefined;
    let isCancelled = false;

    const hydrate = async () => {
      if (!user?.uid) {
        if (!isCancelled) {
          dispatch(hydrateNotesExportState({}));
        }
        return;
      }

      const storedState = await loadNotesExportStateFromStorage(user.uid);
      if (isCancelled) {
        return;
      }
      hydratedUidRef.current = user.uid;
      dispatch(hydrateNotesExportState(storedState));
    };

    void hydrate();

    return () => {
      isCancelled = true;
    };
  }, [authIsInitialized, dispatch, user?.uid]);

  useEffect(() => {
    if (
      !authIsInitialized ||
      !hasHydrated ||
      !user?.uid ||
      hydratedUidRef.current !== user.uid
    ) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void saveNotesExportStateToStorage(user.uid, notesExportState);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [authIsInitialized, hasHydrated, notesExportState, user?.uid]);

  useEffect(() => {
    if (!authIsInitialized || !hasHydrated) {
      return;
    }

    if (previousNotesRef.current !== notes) {
      previousNotesRef.current = notes;

      if (user?.uid && isConnected) {
        dispatch(markNotesExportDirty());
      }
    }
  }, [authIsInitialized, dispatch, hasHydrated, isConnected, notes, user?.uid]);

  useEffect(() => {
    if (!authIsInitialized || !hasHydrated) {
      return;
    }

    const uid = user?.uid;
    const previousUid = previousUidRef.current;
    previousUidRef.current = uid;

    if (previousUid && previousUid !== uid) {
      void clearNotesExportStateFromStorage(previousUid);
    }

    if (!uid) {
      hydratedUidRef.current = undefined;
      previousNotesRef.current = notesRef.current;
      dispatch(disconnectNotesExport());
      return;
    }

    if (isConnected && !notesExportState.lastSyncedAt) {
      dispatch(markNotesExportDirty());
    }
  }, [
    authIsInitialized,
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
      syncTimerRef.current = undefined;

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
        isDirty &&
        !isWorking
      ) {
        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current);
          syncTimerRef.current = undefined;
        }

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
  }, [dispatch, isConnected, isDirty, isWorking, syncNow, user?.uid]);
};
