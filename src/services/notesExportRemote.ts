import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "src/config/firebase";

export type NotesExportMetadata = {
  provider: "googleDocs";
  documentId: string;
  documentTitle?: string;
  updatedAt: number;
  lastAppManagedSyncAt?: number;
};

type RemoteUserNotesExportDoc = {
  notesExport?: {
    provider?: "googleDocs";
    documentId?: string;
    documentTitle?: string;
    updatedAt?: number;
    lastAppManagedSyncAt?: number;
  };
};

export const loadNotesExportMetadata = async (
  uid: string
): Promise<NotesExportMetadata | undefined> => {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), "users", uid));
  if (!snapshot.exists()) {
    return undefined;
  }

  const notesExport = (snapshot.data() as RemoteUserNotesExportDoc).notesExport;
  if (
    notesExport?.provider !== "googleDocs" ||
    typeof notesExport.documentId !== "string"
  ) {
    return undefined;
  }

  return {
    provider: "googleDocs",
    documentId: notesExport.documentId,
    documentTitle: notesExport.documentTitle,
    updatedAt: notesExport.updatedAt ?? 0,
    lastAppManagedSyncAt: notesExport.lastAppManagedSyncAt,
  };
};

export const saveNotesExportMetadata = async (
  uid: string,
  metadata: NotesExportMetadata
): Promise<void> => {
  const authUser = getFirebaseAuth().currentUser;

  await setDoc(
    doc(getFirebaseFirestore(), "users", uid),
    {
      // eslint-disable-next-line unicorn/no-null
      email: authUser?.email ?? null,
      // eslint-disable-next-line unicorn/no-null
      displayName: authUser?.displayName ?? null,
      notesExport: metadata,
      lastSyncTimestamp: serverTimestamp(),
    },
    { merge: true }
  );
};
