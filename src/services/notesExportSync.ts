import { renderNotesExport } from "src/services/notesExport";
import { replaceNotesDocumentBody } from "src/services/googleDocs";
import type { Note } from "src/types/notes";

export const syncNotesExportDocument = async (params: {
  documentId: string;
  notes: Note[];
  lastRevisionId?: string;
  now?: number;
}): Promise<{ lastSyncedAt: number; lastRevisionId?: string }> => {
  const now = params.now ?? Date.now();
  const content = renderNotesExport(params.notes, { now });
  const result = await replaceNotesDocumentBody(
    params.documentId,
    content,
    params.lastRevisionId
  );

  return {
    lastSyncedAt: now,
    lastRevisionId: result.revisionId,
  };
};
