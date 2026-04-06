import { useCallback, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import {
  disconnectNotesExport,
  markNotesExportDirty,
  selectAllNotesExportState,
  setNotesExportConnected,
  setNotesExportConnecting,
  setNotesExportError,
  setNotesExportNeedsReconnect,
  setNotesExportSyncSucceeded,
  setNotesExportSyncing,
} from "src/redux/notesExportSlice";
import {
  GoogleDocsApiError,
  connectGoogleDocs,
  createNotesDocument,
  disconnectGoogleDocs,
  getNotesDocument,
} from "src/services/googleDocs";
import { clearNotesExportStateFromStorage } from "src/services/notesExportLocal";
import {
  loadNotesExportMetadata,
  saveNotesExportMetadata,
} from "src/services/notesExportRemote";
import { syncNotesExportDocument } from "src/services/notesExportSync";

const DEFAULT_DOCUMENT_TITLE = "Bible Notes";

type ConnectNotesExportOptions = {
  createNewDocument?: boolean;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Google Docs sync failed.";

const isReconnectError = (error: unknown): boolean =>
  error instanceof GoogleDocsApiError &&
  (error.code === "needsReconnect" || error.code === "invalidAuth");

export const useNotesExportActions = (): {
  isWorking: boolean;
  connect: (options?: ConnectNotesExportOptions) => Promise<boolean>;
  disconnect: () => Promise<void>;
  syncNow: () => Promise<boolean>;
} => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const notes = useAppSelector((state) => state.notes.notes);
  const notesExportState = useAppSelector(selectAllNotesExportState);
  const [isWorking, setIsWorking] = useState(false);
  const syncPromiseRef =
    // eslint-disable-next-line unicorn/no-useless-undefined -- useRef requires explicit initial value in strict mode
    useRef<Promise<boolean> | undefined>(undefined);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (syncPromiseRef.current) {
      return syncPromiseRef.current;
    }

    if (!authUser?.uid || !notesExportState.documentId) {
      return false;
    }

    const uid = authUser.uid;
    const documentId = notesExportState.documentId;

    dispatch(setNotesExportSyncing());
    setIsWorking(true);

    const syncPromise = (async (): Promise<boolean> => {
      try {
        const result = await syncNotesExportDocument({
          documentId,
          notes,
          lastRevisionId: notesExportState.lastRevisionId,
        });

        dispatch(setNotesExportSyncSucceeded(result));

        await saveNotesExportMetadata(uid, {
          provider: "googleDocs",
          documentId,
          documentTitle:
            notesExportState.documentTitle ?? DEFAULT_DOCUMENT_TITLE,
          updatedAt: Date.now(),
          lastAppManagedSyncAt: result.lastSyncedAt,
        });

        return true;
      } catch (error) {
        if (isReconnectError(error)) {
          dispatch(
            setNotesExportNeedsReconnect({
              lastError: getErrorMessage(error),
            })
          );
        } else {
          dispatch(
            setNotesExportError({
              lastError: getErrorMessage(error),
            })
          );
        }

        return false;
      } finally {
        syncPromiseRef.current = undefined;
        setIsWorking(false);
      }
    })();

    syncPromiseRef.current = syncPromise;
    return syncPromise;
  }, [
    authUser?.uid,
    dispatch,
    notes,
    notesExportState.documentId,
    notesExportState.documentTitle,
    notesExportState.lastRevisionId,
  ]);

  const connect = useCallback(
    async (options?: ConnectNotesExportOptions): Promise<boolean> => {
      if (!authUser?.uid) {
        return false;
      }

      dispatch(
        setNotesExportConnecting({
          documentId: notesExportState.documentId,
          documentTitle: notesExportState.documentTitle,
        })
      );
      setIsWorking(true);

      try {
        const account = await connectGoogleDocs();
        const remoteMetadata = await loadNotesExportMetadata(authUser.uid);
        const shouldReuseDocument = options?.createNewDocument !== true;

        let documentId = shouldReuseDocument
          ? notesExportState.documentId ?? remoteMetadata?.documentId
          : undefined;
        let documentTitle = shouldReuseDocument
          ? notesExportState.documentTitle ??
            remoteMetadata?.documentTitle ??
            DEFAULT_DOCUMENT_TITLE
          : DEFAULT_DOCUMENT_TITLE;

        if (documentId) {
          const document = await getNotesDocument(documentId);
          documentId = document.documentId;
          documentTitle = document.title;
        } else {
          const document = await createNotesDocument(DEFAULT_DOCUMENT_TITLE);
          documentId = document.documentId;
          documentTitle = document.title;
        }

        await saveNotesExportMetadata(authUser.uid, {
          provider: "googleDocs",
          documentId,
          documentTitle,
          updatedAt: Date.now(),
        });

        dispatch(
          setNotesExportConnected({
            documentId,
            documentTitle,
            googleAccountEmail: account.email,
          })
        );
        dispatch(markNotesExportDirty());

        return true;
      } catch (error) {
        if (isReconnectError(error)) {
          dispatch(
            setNotesExportNeedsReconnect({
              lastError: getErrorMessage(error),
            })
          );
        } else {
          dispatch(
            setNotesExportError({
              lastError: getErrorMessage(error),
            })
          );
        }

        return false;
      } finally {
        setIsWorking(false);
      }
    },
    [
      authUser?.uid,
      dispatch,
      notesExportState.documentId,
      notesExportState.documentTitle,
    ]
  );

  const disconnect = useCallback(async (): Promise<void> => {
    setIsWorking(true);

    try {
      await disconnectGoogleDocs();
    } finally {
      try {
        dispatch(disconnectNotesExport());
        if (authUser?.uid) {
          await clearNotesExportStateFromStorage(authUser.uid);
        }
      } finally {
        setIsWorking(false);
      }
    }
  }, [authUser?.uid, dispatch]);

  return {
    isWorking,
    connect,
    disconnect,
    syncNow,
  };
};
