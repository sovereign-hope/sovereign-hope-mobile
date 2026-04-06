import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  NotesExportState,
  NotesExportStatus,
} from "src/redux/notesExportSlice";

const STORAGE_KEY = "@notesExport";

const validStatuses = new Set<NotesExportStatus>([
  "disconnected",
  "connecting",
  "connected",
  "syncing",
  "needsReconnect",
  "error",
]);

const isNotesExportState = (
  value: unknown
): value is Omit<NotesExportState, "hasHydrated"> => {
  // eslint-disable-next-line unicorn/no-null
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<NotesExportState>;

  return (
    // eslint-disable-next-line unicorn/no-null
    (candidate.provider === "googleDocs" || candidate.provider === null) &&
    typeof candidate.isDirty === "boolean" &&
    validStatuses.has(candidate.status as NotesExportStatus) &&
    (candidate.documentId === undefined ||
      typeof candidate.documentId === "string") &&
    (candidate.documentTitle === undefined ||
      typeof candidate.documentTitle === "string") &&
    (candidate.googleAccountEmail === undefined ||
      typeof candidate.googleAccountEmail === "string") &&
    (candidate.lastSyncedAt === undefined ||
      typeof candidate.lastSyncedAt === "number") &&
    (candidate.lastError === undefined ||
      typeof candidate.lastError === "string") &&
    (candidate.lastRevisionId === undefined ||
      typeof candidate.lastRevisionId === "string")
  );
};

const normalizeStatus = (
  status: NotesExportStatus,
  provider: NotesExportState["provider"]
): NotesExportStatus => {
  if ((status === "connecting" || status === "syncing") && provider) {
    return "connected";
  }

  return status;
};

export const loadNotesExportStateFromStorage = async (): Promise<
  Partial<NotesExportState>
> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isNotesExportState(parsed)) {
      return {};
    }

    return {
      ...parsed,
      status: normalizeStatus(parsed.status, parsed.provider),
    };
  } catch {
    return {};
  }
};

export const saveNotesExportStateToStorage = async (
  state: NotesExportState
): Promise<void> => {
  try {
    const persistedState: Partial<NotesExportState> = { ...state };
    delete persistedState.hasHydrated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (error) {
    console.warn("[Notes Export] Failed to persist state locally:", error);
  }
};

export const clearNotesExportStateFromStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[Notes Export] Failed to clear persisted state:", error);
  }
};
