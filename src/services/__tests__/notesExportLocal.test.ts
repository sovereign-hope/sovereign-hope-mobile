import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearAllNotesExportStateFromStorage,
  clearNotesExportStateFromStorage,
  loadNotesExportStateFromStorage,
  saveNotesExportStateToStorage,
} from "src/services/notesExportLocal";
import type { NotesExportState } from "src/redux/notesExportSlice";

const connectedState: NotesExportState = {
  provider: "googleDocs",
  status: "connected",
  documentId: "doc-123",
  documentTitle: "Bible Notes",
  googleAccountEmail: "reader@example.com",
  lastSyncedAt: 1234,
  lastRevisionId: "rev-1",
  hasHydrated: true,
  isDirty: false,
};

describe("notesExportLocal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores state under a uid-scoped key", async () => {
    await saveNotesExportStateToStorage("user-123", connectedState);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@notesExport:user-123",
      JSON.stringify({
        provider: "googleDocs",
        status: "connected",
        documentId: "doc-123",
        documentTitle: "Bible Notes",
        googleAccountEmail: "reader@example.com",
        lastSyncedAt: 1234,
        lastRevisionId: "rev-1",
        isDirty: false,
      })
    );
  });

  it("loads uid-scoped state before falling back to the legacy key", async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(
        JSON.stringify({
          provider: "googleDocs",
          status: "syncing",
          documentId: "doc-123",
          isDirty: true,
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          provider: "googleDocs",
          status: "connected",
          documentId: "legacy-doc",
          isDirty: false,
        })
      );

    await expect(loadNotesExportStateFromStorage("user-123")).resolves.toEqual({
      provider: "googleDocs",
      status: "connected",
      documentId: "doc-123",
      isDirty: true,
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("@notesExport:user-123");
    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith("@notesExport");
  });

  it("falls back to the legacy key when no uid-scoped state exists", async () => {
    (AsyncStorage.getItem as jest.Mock)
      // eslint-disable-next-line unicorn/no-null -- AsyncStorage returns null for missing keys
      .mockImplementationOnce(() => Promise.resolve(null))
      .mockImplementationOnce(() =>
        JSON.stringify({
          provider: "googleDocs",
          status: "connected",
          documentId: "legacy-doc",
          isDirty: false,
        })
      );

    await expect(loadNotesExportStateFromStorage("user-123")).resolves.toEqual({
      provider: "googleDocs",
      status: "connected",
      documentId: "legacy-doc",
      isDirty: false,
    });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("@notesExport:user-123");
  });

  it("clears both uid-scoped and legacy state for a user", async () => {
    await clearNotesExportStateFromStorage("user-123");

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "@notesExport:user-123",
      "@notesExport",
    ]);
  });

  it("clears all notes export keys during full local data cleanup", async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValueOnce([
      "@notesExport",
      "@notesExport:user-123",
      "@notes",
    ]);

    await clearAllNotesExportStateFromStorage();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "@notesExport",
      "@notesExport:user-123",
    ]);
  });
});
