import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  clearNotesExportMetadata,
  loadNotesExportMetadata,
  saveNotesExportMetadata,
} from "src/services/notesExportRemote";

jest.mock("firebase/firestore", () => ({
  deleteField: jest.fn(() => "__deleteField__"),
  doc: jest.fn(() => "__userDocRef__"),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => "__serverTimestamp__"),
  setDoc: jest.fn(),
}));

jest.mock("src/config/firebase", () => ({
  getFirebaseAuth: jest.fn(() => ({
    currentUser: {
      email: "reader@example.com",
      displayName: "Reader Example",
    },
  })),
  getFirebaseFirestore: jest.fn(() => "__firestore__"),
}));

describe("notesExportRemote", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads saved Google Docs metadata from the user document", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        notesExport: {
          provider: "googleDocs",
          documentId: "doc-123",
          documentTitle: "Bible Notes",
          updatedAt: 1234,
          lastAppManagedSyncAt: 5678,
        },
      }),
    });

    await expect(loadNotesExportMetadata("user-123")).resolves.toEqual({
      provider: "googleDocs",
      documentId: "doc-123",
      documentTitle: "Bible Notes",
      updatedAt: 1234,
      lastAppManagedSyncAt: 5678,
    });

    expect(doc).toHaveBeenCalledWith("__firestore__", "users", "user-123");
  });

  it("persists Google Docs metadata onto the user document", async () => {
    await saveNotesExportMetadata("user-123", {
      provider: "googleDocs",
      documentId: "doc-123",
      documentTitle: "Bible Notes",
      updatedAt: 1234,
      lastAppManagedSyncAt: 5678,
    });

    expect(setDoc).toHaveBeenCalledWith(
      "__userDocRef__",
      {
        email: "reader@example.com",
        displayName: "Reader Example",
        notesExport: {
          provider: "googleDocs",
          documentId: "doc-123",
          documentTitle: "Bible Notes",
          updatedAt: 1234,
          lastAppManagedSyncAt: 5678,
        },
        lastSyncTimestamp: "__serverTimestamp__",
      },
      { merge: true }
    );
    expect(serverTimestamp).toHaveBeenCalledTimes(1);
  });

  it("clears Google Docs metadata from the user document", async () => {
    await clearNotesExportMetadata("user-123");

    expect(setDoc).toHaveBeenCalledWith(
      "__userDocRef__",
      {
        notesExport: "__deleteField__",
        lastSyncTimestamp: "__serverTimestamp__",
      },
      { merge: true }
    );
    expect(deleteField).toHaveBeenCalledTimes(1);
    expect(serverTimestamp).toHaveBeenCalledTimes(1);
  });
});
