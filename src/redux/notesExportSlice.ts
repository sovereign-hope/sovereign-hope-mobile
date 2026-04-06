import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "src/app/store";

export type NotesExportStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "syncing"
  | "needsReconnect"
  | "error";

export type NotesExportState = {
  provider: "googleDocs" | null;
  status: NotesExportStatus;
  documentId?: string;
  documentTitle?: string;
  googleAccountEmail?: string;
  lastSyncedAt?: number;
  lastError?: string;
  lastRevisionId?: string;
  hasHydrated: boolean;
  isDirty: boolean;
};

type NotesExportConnectionPayload = {
  documentId?: string;
  documentTitle?: string;
  googleAccountEmail?: string;
};

type NotesExportSyncSuccessPayload = {
  lastSyncedAt: number;
  lastRevisionId?: string;
};

type NotesExportStatusPayload = {
  lastError?: string;
};

const initialState: NotesExportState = {
  // eslint-disable-next-line unicorn/no-null
  provider: null,
  status: "disconnected",
  hasHydrated: false,
  isDirty: false,
};

export const notesExportSlice = createSlice({
  name: "notesExport",
  initialState,
  reducers: {
    hydrateNotesExportState(
      _state,
      action: PayloadAction<Partial<NotesExportState>>
    ) {
      return {
        ...initialState,
        ...action.payload,
        hasHydrated: true,
      };
    },
    setNotesExportConnecting(
      state,
      action: PayloadAction<NotesExportConnectionPayload>
    ) {
      state.provider = "googleDocs";
      state.status = "connecting";
      state.documentId = action.payload.documentId ?? state.documentId;
      state.documentTitle = action.payload.documentTitle ?? state.documentTitle;
      state.googleAccountEmail =
        action.payload.googleAccountEmail ?? state.googleAccountEmail;
      state.lastError = undefined;
    },
    setNotesExportConnected(
      state,
      action: PayloadAction<NotesExportConnectionPayload>
    ) {
      state.provider = "googleDocs";
      state.status = "connected";
      state.documentId = action.payload.documentId ?? state.documentId;
      state.documentTitle = action.payload.documentTitle ?? state.documentTitle;
      state.googleAccountEmail =
        action.payload.googleAccountEmail ?? state.googleAccountEmail;
      state.lastError = undefined;
    },
    setNotesExportSyncing(state) {
      state.status = "syncing";
      state.lastError = undefined;
    },
    setNotesExportSyncSucceeded(
      state,
      action: PayloadAction<NotesExportSyncSuccessPayload>
    ) {
      state.status = "connected";
      state.lastSyncedAt = action.payload.lastSyncedAt;
      state.lastRevisionId =
        action.payload.lastRevisionId ?? state.lastRevisionId;
      state.lastError = undefined;
      state.isDirty = false;
    },
    setNotesExportNeedsReconnect(
      state,
      action: PayloadAction<NotesExportStatusPayload>
    ) {
      state.status = "needsReconnect";
      state.lastError = action.payload.lastError ?? state.lastError;
    },
    setNotesExportError(state, action: PayloadAction<{ lastError: string }>) {
      state.status = "error";
      state.lastError = action.payload.lastError;
    },
    markNotesExportDirty(state) {
      state.isDirty = true;
    },
    clearNotesExportDirty(state) {
      state.isDirty = false;
    },
    disconnectNotesExport() {
      return {
        ...initialState,
        hasHydrated: true,
      };
    },
  },
});

export const {
  hydrateNotesExportState,
  setNotesExportConnecting,
  setNotesExportConnected,
  setNotesExportSyncing,
  setNotesExportSyncSucceeded,
  setNotesExportNeedsReconnect,
  setNotesExportError,
  markNotesExportDirty,
  clearNotesExportDirty,
  disconnectNotesExport,
} = notesExportSlice.actions;

export const selectNotesExportState = (state: RootState): NotesExportState =>
  state.notesExport;
export const selectAllNotesExportState = (state: RootState): NotesExportState =>
  state.notesExport;
export const selectNotesExportStatus = (state: RootState): NotesExportStatus =>
  state.notesExport.status;
export const selectNotesExportProvider = (
  state: RootState
): NotesExportState["provider"] => state.notesExport.provider;
export const selectNotesExportDocumentId = (
  state: RootState
): string | undefined => state.notesExport.documentId;
export const selectNotesExportDocumentTitle = (
  state: RootState
): string | undefined => state.notesExport.documentTitle;
export const selectNotesExportGoogleAccountEmail = (
  state: RootState
): string | undefined => state.notesExport.googleAccountEmail;
export const selectNotesExportIsDirty = (state: RootState): boolean =>
  state.notesExport.isDirty;
export const selectNotesExportLastSyncedAt = (
  state: RootState
): number | undefined => state.notesExport.lastSyncedAt;
export const selectNotesExportLastError = (
  state: RootState
): string | undefined => state.notesExport.lastError;
export const selectNotesExportLastRevisionId = (
  state: RootState
): string | undefined => state.notesExport.lastRevisionId;
export const selectNotesExportHasHydrated = (state: RootState): boolean =>
  state.notesExport.hasHydrated;
export const selectIsNotesExportConnected = (state: RootState): boolean =>
  state.notesExport.status === "connected" ||
  state.notesExport.status === "syncing" ||
  state.notesExport.status === "error";

export const notesExportReducer = notesExportSlice.reducer;
