import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  NotesExportState,
  NotesExportStatus,
} from "src/redux/notesExportSlice";

const STORAGE_KEY_PREFIX = "@notesExport";
const LEGACY_STORAGE_KEY = STORAGE_KEY_PREFIX;

const validStatuses = new Set<NotesExportStatus>([
  "disconnected",
  "connecting",
  "connected",
  "syncing",
  "needsReconnect",
  "error",
]);

const getStorageKey = (uid: string): string => `${STORAGE_KEY_PREFIX}:${uid}`;

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

const parseNotesExportState = (
  raw: string | null
): Partial<NotesExportState> => {
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
};

export const loadNotesExportStateFromStorage = async (
  uid: string
): Promise<Partial<NotesExportState>> => {
  try {
    const scopedRaw = await AsyncStorage.getItem(getStorageKey(uid));
    const raw =
      scopedRaw === null
        ? await AsyncStorage.getItem(LEGACY_STORAGE_KEY)
        : scopedRaw;

    return parseNotesExportState(raw);
  } catch {
    return {};
  }
};

export const saveNotesExportStateToStorage = async (
  uid: string,
  state: NotesExportState
): Promise<void> => {
  try {
    const persistedState: Partial<NotesExportState> = { ...state };
    delete persistedState.hasHydrated;
    await AsyncStorage.setItem(
      getStorageKey(uid),
      JSON.stringify(persistedState)
    );
  } catch (error) {
    console.warn("[Notes Export] Failed to persist state locally:", error);
  }
};

export const clearNotesExportStateFromStorage = async (
  uid: string
): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([getStorageKey(uid), LEGACY_STORAGE_KEY]);
  } catch (error) {
    console.warn("[Notes Export] Failed to clear persisted state:", error);
  }
};

export const clearAllNotesExportStateFromStorage = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const notesExportKeys = allKeys.filter((key) =>
      key.startsWith(STORAGE_KEY_PREFIX)
    );

    if (notesExportKeys.length > 0) {
      await AsyncStorage.multiRemove(notesExportKeys);
    }
  } catch (error) {
    console.warn("[Notes Export] Failed to clear all persisted state:", error);
  }
};
