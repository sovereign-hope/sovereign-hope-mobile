import { Platform } from "react-native";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import type { NotesExportDocument } from "src/services/notesExport";

const GOOGLE_DOCS_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DOCS_API_BASE = "https://docs.googleapis.com/v1/documents";

type GoogleDocsApiErrorCode =
  | "cancelled"
  | "invalidAuth"
  | "needsReconnect"
  | "notFound"
  | "network"
  | "unknown";

export class GoogleDocsApiError extends Error {
  code: GoogleDocsApiErrorCode;

  constructor(code: GoogleDocsApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "GoogleDocsApiError";
  }
}

export type ConnectedGoogleAccount = {
  email: string;
  displayName?: string;
  scopes: string[];
};

export type NotesDocumentMetadata = {
  documentId: string;
  title: string;
  revisionId?: string;
  bodyEndIndex: number;
};

type BatchUpdateRequest = Record<string, unknown>;

type GoogleDocsDocumentResponse = {
  documentId?: string;
  title?: string;
  revisionId?: string;
  body?: {
    content?: Array<{
      endIndex?: number;
    }>;
  };
};

type GoogleApiErrorPayload = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

const ensurePlayServicesIfNeeded = async (): Promise<void> => {
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
  }
};

const getBodyEndIndex = (document: GoogleDocsDocumentResponse): number => {
  const content = document.body?.content ?? [];
  const endIndex = content.at(-1)?.endIndex;

  return typeof endIndex === "number" && endIndex > 1 ? endIndex : 1;
};

const getGoogleDocsErrorMessage = async (
  response: Response
): Promise<string> => {
  let bodyText = "";

  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  let payload: GoogleApiErrorPayload | undefined;
  if (bodyText) {
    try {
      payload = JSON.parse(bodyText) as GoogleApiErrorPayload;
    } catch {
      payload = undefined;
    }
  }

  const statusMessage = payload?.error?.message ?? "";

  if (response.status === 401) {
    return "Reconnect Google Docs to continue syncing.";
  }

  if (response.status === 403) {
    if (
      /insufficient permissions/i.test(statusMessage) ||
      /insufficient authentication scopes/i.test(statusMessage) ||
      /insufficientauthenticationscopes/i.test(statusMessage)
    ) {
      return "Reconnect Google Docs to continue syncing.";
    }

    return "This Google account can't access the current Google Doc.";
  }

  if (response.status === 404) {
    return "The current Google Doc could not be found.";
  }

  if (response.status >= 500) {
    return "Google Docs is unavailable right now. Try again.";
  }

  return "Google Docs sync failed. Try again.";
};

function getParagraphStyle(
  kind: NotesExportDocument["paragraphStyles"][number]["kind"]
) {
  switch (kind) {
    case "title": {
      return {
        namedStyleType: "TITLE",
        alignment: "CENTER",
        spaceBelow: {
          magnitude: 2,
          unit: "PT",
        },
      };
    }
    case "subtitle": {
      return {
        namedStyleType: "NORMAL_TEXT",
        alignment: "CENTER",
        spaceBelow: {
          magnitude: 0,
          unit: "PT",
        },
      };
    }
    case "timestamp": {
      return {
        namedStyleType: "NORMAL_TEXT",
        alignment: "CENTER",
        spaceBelow: {
          magnitude: 14,
          unit: "PT",
        },
      };
    }
    case "bookHeading": {
      return {
        namedStyleType: "HEADING_1",
        spaceAbove: {
          magnitude: 12,
          unit: "PT",
        },
        spaceBelow: {
          magnitude: 4,
          unit: "PT",
        },
      };
    }
    case "passageHeading": {
      return {
        namedStyleType: "HEADING_2",
        spaceAbove: {
          magnitude: 8,
          unit: "PT",
        },
        spaceBelow: {
          magnitude: 0,
          unit: "PT",
        },
      };
    }
  }
}

function getParagraphStyleFields(
  kind: NotesExportDocument["paragraphStyles"][number]["kind"]
) {
  switch (kind) {
    case "title": {
      return "namedStyleType,alignment,spaceBelow";
    }
    case "subtitle": {
      return "namedStyleType,alignment,spaceBelow";
    }
    case "timestamp": {
      return "namedStyleType,alignment,spaceBelow";
    }
    case "bookHeading": {
      return "namedStyleType,spaceAbove,spaceBelow";
    }
    case "passageHeading": {
      return "namedStyleType,spaceAbove,spaceBelow";
    }
  }
}

function createRgbColor(red: number, green: number, blue: number) {
  return {
    color: {
      rgbColor: {
        red,
        green,
        blue,
      },
    },
  };
}

function getTextStyle(kind: NotesExportDocument["textStyles"][number]["kind"]) {
  switch (kind) {
    case "subtitle": {
      return {
        italic: true,
        fontSize: {
          magnitude: 10,
          unit: "PT",
        },
        foregroundColor: createRgbColor(0.43, 0.47, 0.54),
      };
    }
    case "timestamp": {
      return {
        fontSize: {
          magnitude: 9,
          unit: "PT",
        },
        foregroundColor: createRgbColor(0.43, 0.47, 0.54),
      };
    }
    case "metadata": {
      return {
        fontSize: {
          magnitude: 9,
          unit: "PT",
        },
        foregroundColor: createRgbColor(0.43, 0.47, 0.54),
      };
    }
  }
}

function getTextStyleFields(
  kind: NotesExportDocument["textStyles"][number]["kind"]
) {
  switch (kind) {
    case "subtitle": {
      return "italic,fontSize,foregroundColor";
    }
    case "timestamp": {
      return "fontSize,foregroundColor";
    }
    case "metadata": {
      return "fontSize,foregroundColor";
    }
  }
}

const getAuthenticatedGoogleUser = async () => {
  await ensurePlayServicesIfNeeded();

  let googleUser = GoogleSignin.getCurrentUser();

  if (!googleUser && GoogleSignin.hasPreviousSignIn()) {
    const silentResponse = await GoogleSignin.signInSilently();
    if (silentResponse.type === "success") {
      googleUser = silentResponse.data;
    }
  }

  if (!googleUser) {
    const signInResponse = await GoogleSignin.signIn();
    if (!isSuccessResponse(signInResponse)) {
      throw new GoogleDocsApiError(
        "cancelled",
        "Google account authorization was cancelled."
      );
    }
    googleUser = signInResponse.data;
  }

  if (!googleUser.scopes.includes(GOOGLE_DOCS_SCOPE)) {
    const addScopesResponse = await GoogleSignin.addScopes({
      scopes: [GOOGLE_DOCS_SCOPE],
    });

    if (!addScopesResponse || !isSuccessResponse(addScopesResponse)) {
      throw new GoogleDocsApiError(
        "cancelled",
        "Google Docs access was not granted."
      );
    }

    googleUser = addScopesResponse.data;
  }

  return googleUser;
};

const getExistingGoogleUser = async () => {
  await ensurePlayServicesIfNeeded();

  let googleUser = GoogleSignin.getCurrentUser();

  if (!googleUser && GoogleSignin.hasPreviousSignIn()) {
    const silentResponse = await GoogleSignin.signInSilently();
    if (silentResponse.type === "success") {
      googleUser = silentResponse.data;
    }
  }

  return googleUser;
};

const getAccessToken = async (): Promise<string> => {
  const tokens = await GoogleSignin.getTokens();

  if (!tokens.accessToken) {
    throw new GoogleDocsApiError(
      "invalidAuth",
      "Google Sign In did not return an access token."
    );
  }

  return tokens.accessToken;
};

const requestGoogleDocs = async <TResponse>(
  path: string,
  init: RequestInit
): Promise<TResponse> => {
  const accessToken = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${GOOGLE_DOCS_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new GoogleDocsApiError(
      "network",
      "Google Docs could not be reached."
    );
  }

  if (!response.ok) {
    const errorMessage = await getGoogleDocsErrorMessage(response);
    if (response.status === 401 || response.status === 403) {
      throw new GoogleDocsApiError("needsReconnect", errorMessage);
    }
    if (response.status === 404) {
      throw new GoogleDocsApiError("notFound", errorMessage);
    }

    throw new GoogleDocsApiError("unknown", errorMessage);
  }

  if (response.status === 204) {
    return {} as TResponse;
  }

  return (await response.json()) as TResponse;
};

export const connectGoogleDocs = async (): Promise<ConnectedGoogleAccount> => {
  const googleUser = await getAuthenticatedGoogleUser();

  await getAccessToken();

  return {
    email: googleUser.user.email,
    displayName: googleUser.user.name ?? undefined,
    scopes: googleUser.scopes,
  };
};

export const getConnectedGoogleDocsAccountSilently = async (): Promise<
  ConnectedGoogleAccount | undefined
> => {
  const googleUser = await getExistingGoogleUser();

  if (!googleUser || !googleUser.scopes.includes(GOOGLE_DOCS_SCOPE)) {
    return undefined;
  }

  try {
    await getAccessToken();
  } catch {
    return undefined;
  }

  return {
    email: googleUser.user.email,
    displayName: googleUser.user.name ?? undefined,
    scopes: googleUser.scopes,
  };
};

export const createNotesDocument = async (
  title: string
): Promise<NotesDocumentMetadata> => {
  const response = await requestGoogleDocs<GoogleDocsDocumentResponse>("", {
    method: "POST",
    body: JSON.stringify({ title }),
  });

  return {
    documentId: response.documentId ?? "",
    title: response.title ?? title,
    revisionId: response.revisionId ?? undefined,
    bodyEndIndex: getBodyEndIndex(response),
  };
};

export const getNotesDocument = async (
  documentId: string
): Promise<NotesDocumentMetadata> => {
  const response = await requestGoogleDocs<GoogleDocsDocumentResponse>(
    `/${documentId}`,
    {
      method: "GET",
    }
  );

  return {
    documentId: response.documentId ?? documentId,
    title: response.title ?? "Bible Notes",
    revisionId: response.revisionId ?? undefined,
    bodyEndIndex: getBodyEndIndex(response),
  };
};

export const replaceNotesDocumentBody = async (
  documentId: string,
  document: NotesExportDocument,
  targetRevisionId?: string
): Promise<{ revisionId?: string }> => {
  const currentDocument = await getNotesDocument(documentId);
  const requests: BatchUpdateRequest[] =
    currentDocument.bodyEndIndex > 2
      ? [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: currentDocument.bodyEndIndex - 1,
              },
            },
          },
          {
            insertText: {
              location: { index: 1 },
              text: document.text,
            },
          },
        ]
      : [
          {
            insertText: {
              location: { index: 1 },
              text: document.text,
            },
          },
        ];

  for (const style of document.paragraphStyles) {
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: style.startIndex,
          endIndex: style.endIndex,
        },
        paragraphStyle: getParagraphStyle(style.kind),
        fields: getParagraphStyleFields(style.kind),
      },
    });
  }

  for (const style of document.textStyles) {
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: style.startIndex,
          endIndex: style.endIndex,
        },
        textStyle: getTextStyle(style.kind),
        fields: getTextStyleFields(style.kind),
      },
    });
  }

  const response = await requestGoogleDocs<GoogleDocsDocumentResponse>(
    `/${documentId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        requests,
        ...(targetRevisionId
          ? {
              writeControl: {
                targetRevisionId,
              },
            }
          : {}),
      }),
    }
  );

  return {
    revisionId: response.revisionId ?? undefined,
  };
};

export const disconnectGoogleDocs = async (): Promise<void> => {
  try {
    await GoogleSignin.revokeAccess();
  } finally {
    await GoogleSignin.signOut();
  }
};

export const googleDocsScope = GOOGLE_DOCS_SCOPE;
