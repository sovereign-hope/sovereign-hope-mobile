import { configureStore } from "@reduxjs/toolkit";
import {
  clearNotesExportDirty,
  disconnectNotesExport,
  hydrateNotesExportState,
  markNotesExportDirty,
  notesExportReducer,
  selectIsNotesExportConnected,
  selectNotesExportDocumentId,
  selectNotesExportGoogleAccountEmail,
  selectNotesExportLastError,
  selectNotesExportLastSyncedAt,
  selectNotesExportProvider,
  selectNotesExportStatus,
  setNotesExportConnected,
  setNotesExportConnecting,
  setNotesExportError,
  setNotesExportNeedsReconnect,
  setNotesExportSyncSucceeded,
  setNotesExportSyncing,
} from "../notesExportSlice";
import type { NotesExportState } from "../notesExportSlice";

const defaultNotesExportState: NotesExportState = {
  // eslint-disable-next-line unicorn/no-null
  provider: null,
  status: "disconnected",
  hasHydrated: false,
  isDirty: false,
};

const createTestStore = (preloadedState?: {
  notesExport?: Partial<NotesExportState>;
}) =>
  configureStore({
    reducer: { notesExport: notesExportReducer },
    preloadedState: preloadedState
      ? {
          notesExport: {
            ...defaultNotesExportState,
            ...preloadedState.notesExport,
          },
        }
      : undefined,
  });

describe("notesExportSlice", () => {
  it("starts with the disconnected initial state", () => {
    const store = createTestStore();

    expect(store.getState().notesExport).toEqual(defaultNotesExportState);
  });

  it("hydrates persisted state and marks hydration complete", () => {
    const store = createTestStore();

    store.dispatch(
      hydrateNotesExportState({
        provider: "googleDocs",
        status: "connected",
        documentId: "doc-123",
        documentTitle: "Bible Notes",
        googleAccountEmail: "reader@example.com",
        lastSyncedAt: 1234,
        hasHydrated: false,
        isDirty: true,
      })
    );

    expect(store.getState().notesExport).toEqual({
      provider: "googleDocs",
      status: "connected",
      documentId: "doc-123",
      documentTitle: "Bible Notes",
      googleAccountEmail: "reader@example.com",
      lastSyncedAt: 1234,
      hasHydrated: true,
      isDirty: true,
    });
  });

  it("handles connected, syncing, and success transitions", () => {
    const store = createTestStore();

    store.dispatch(
      setNotesExportConnecting({
        googleAccountEmail: "reader@example.com",
      })
    );
    store.dispatch(
      setNotesExportConnected({
        documentId: "doc-123",
        documentTitle: "Bible Notes",
      })
    );
    store.dispatch(markNotesExportDirty());
    store.dispatch(setNotesExportSyncing());
    store.dispatch(
      setNotesExportSyncSucceeded({
        lastSyncedAt: 4321,
        lastRevisionId: "rev-1",
      })
    );

    const state = store.getState();
    expect(selectNotesExportStatus(state as never)).toBe("connected");
    expect(selectNotesExportProvider(state as never)).toBe("googleDocs");
    expect(selectNotesExportDocumentId(state as never)).toBe("doc-123");
    expect(selectNotesExportGoogleAccountEmail(state as never)).toBe(
      "reader@example.com"
    );
    expect(selectNotesExportLastSyncedAt(state as never)).toBe(4321);
    expect(selectIsNotesExportConnected(state as never)).toBe(true);
    expect(state.notesExport.isDirty).toBe(false);
    expect(state.notesExport.lastRevisionId).toBe("rev-1");
  });

  it("preserves document metadata through needsReconnect and error states", () => {
    const store = createTestStore({
      notesExport: {
        provider: "googleDocs",
        status: "connected",
        documentId: "doc-123",
        documentTitle: "Bible Notes",
        googleAccountEmail: "reader@example.com",
        hasHydrated: true,
      },
    });

    store.dispatch(
      setNotesExportNeedsReconnect({
        lastError: "Access was revoked",
      })
    );

    expect(store.getState().notesExport).toMatchObject({
      status: "needsReconnect",
      documentId: "doc-123",
      documentTitle: "Bible Notes",
      googleAccountEmail: "reader@example.com",
      lastError: "Access was revoked",
    });

    store.dispatch(
      setNotesExportError({
        lastError: "Sync failed",
      })
    );

    expect(store.getState().notesExport).toMatchObject({
      status: "error",
      documentId: "doc-123",
      documentTitle: "Bible Notes",
      googleAccountEmail: "reader@example.com",
      lastError: "Sync failed",
    });
    expect(selectNotesExportLastError(store.getState() as never)).toBe(
      "Sync failed"
    );
  });

  it("resets export metadata on disconnect but leaves hydration complete", () => {
    const store = createTestStore({
      notesExport: {
        provider: "googleDocs",
        status: "connected",
        documentId: "doc-123",
        documentTitle: "Bible Notes",
        googleAccountEmail: "reader@example.com",
        lastSyncedAt: 9999,
        lastError: "Sync failed",
        lastRevisionId: "rev-1",
        hasHydrated: true,
        isDirty: true,
      },
    });

    store.dispatch(disconnectNotesExport());

    expect(store.getState().notesExport).toEqual({
      // eslint-disable-next-line unicorn/no-null
      provider: null,
      status: "disconnected",
      hasHydrated: true,
      isDirty: false,
    });
  });

  it("tracks and clears the dirty flag independently", () => {
    const store = createTestStore({
      notesExport: {
        provider: "googleDocs",
        status: "connected",
        hasHydrated: true,
      },
    });

    store.dispatch(markNotesExportDirty());
    expect(store.getState().notesExport.isDirty).toBe(true);

    store.dispatch(clearNotesExportDirty());
    expect(store.getState().notesExport.isDirty).toBe(false);
  });
});
