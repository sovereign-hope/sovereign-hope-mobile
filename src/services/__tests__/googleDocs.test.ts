import { Platform } from "react-native";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import {
  GoogleDocsApiError,
  connectGoogleDocs,
  createNotesDocument,
  disconnectGoogleDocs,
  getConnectedGoogleDocsAccountSilently,
  getNotesDocument,
  googleDocsScope,
  replaceNotesDocumentBody,
} from "../googleDocs";
import { buildNotesExportDocument } from "../notesExport";

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    addScopes: jest.fn(),
    getCurrentUser: jest.fn(),
    getTokens: jest.fn(),
    hasPlayServices: jest.fn(),
    hasPreviousSignIn: jest.fn(),
    revokeAccess: jest.fn(),
    signIn: jest.fn(),
    signInSilently: jest.fn(),
    signOut: jest.fn(),
  },
  isSuccessResponse: jest.fn(),
}));

const mockGoogleUser = {
  user: {
    email: "reader@example.com",
    name: "Reader Example",
  },
  scopes: ["email", "profile"],
};

const createJsonResponse = (
  body: unknown,
  status = 200
): Pick<Response, "ok" | "status" | "json" | "text"> => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn(() => Promise.resolve(body)),
  text: jest.fn(() => Promise.resolve(JSON.stringify(body))),
});

const getBatchUpdateBody = (
  fetchCalls: unknown[][]
): {
  requests: Array<Record<string, unknown>>;
} => {
  const secondCall = fetchCalls[1];
  expect(secondCall).toBeDefined();

  const [, requestInit] = secondCall as [string, RequestInit];
  const { body } = requestInit;
  expect(typeof body).toBe("string");

  return JSON.parse(body as string) as {
    requests: Array<Record<string, unknown>>;
  };
};

const getSecondRequestInit = (fetchCalls: unknown[][]): RequestInit => {
  const secondCall = fetchCalls[1];
  expect(secondCall).toBeDefined();

  const [, requestInit] = secondCall as [string, RequestInit];
  return requestInit;
};

const getSecondRequestUrl = (fetchCalls: unknown[][]): string => {
  const secondCall = fetchCalls[1];
  expect(secondCall).toBeDefined();

  const [url] = secondCall as [string, RequestInit];
  return url;
};

describe("googleDocs", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    global.fetch = fetchMock as typeof fetch;
    (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue(mockGoogleUser);
    (GoogleSignin.getTokens as jest.Mock).mockResolvedValue({
      accessToken: "access-token",
      idToken: "id-token",
    });
    (GoogleSignin.hasPreviousSignIn as jest.Mock).mockReturnValue(false);
    (GoogleSignin.signInSilently as jest.Mock).mockResolvedValue({
      type: "noSavedCredentialFound",
      // eslint-disable-next-line unicorn/no-null
      data: null,
    });
    (GoogleSignin.addScopes as jest.Mock).mockResolvedValue({
      type: "success",
      data: {
        ...mockGoogleUser,
        scopes: [...mockGoogleUser.scopes, googleDocsScope],
      },
    });
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      type: "success",
      data: mockGoogleUser,
    });
    (GoogleSignin.revokeAccess as jest.Mock).mockImplementation(() =>
      Promise.resolve()
    );
    (GoogleSignin.signOut as jest.Mock).mockImplementation(() =>
      Promise.resolve()
    );
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (isSuccessResponse as unknown as jest.Mock).mockImplementation(
      (response: { type?: string }) => response.type === "success"
    );
  });

  it("connects an existing Google user and requests the Docs scope", async () => {
    const account = await connectGoogleDocs();

    expect(GoogleSignin.addScopes).toHaveBeenCalledWith({
      scopes: [googleDocsScope],
    });
    expect(GoogleSignin.getTokens).toHaveBeenCalledTimes(1);
    expect(account).toEqual({
      email: "reader@example.com",
      displayName: "Reader Example",
      scopes: ["email", "profile", googleDocsScope],
    });
  });

  it("returns the existing authorized Google Docs account silently", async () => {
    (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue({
      ...mockGoogleUser,
      scopes: [...mockGoogleUser.scopes, googleDocsScope],
    });

    await expect(getConnectedGoogleDocsAccountSilently()).resolves.toEqual({
      email: "reader@example.com",
      displayName: "Reader Example",
      scopes: ["email", "profile", googleDocsScope],
    });

    expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  });

  it("returns undefined when the existing Google account lacks the Docs scope", async () => {
    await expect(
      getConnectedGoogleDocsAccountSilently()
    ).resolves.toBeUndefined();
  });

  it("creates a Google Doc", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        documentId: "doc-123",
        title: "Bible Notes",
        revisionId: "rev-1",
        body: {
          content: [{ endIndex: 1 }],
        },
      })
    );

    const document = await createNotesDocument("Bible Notes");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://docs.googleapis.com/v1/documents",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Bible Notes" }),
      })
    );
    expect(document).toEqual({
      documentId: "doc-123",
      title: "Bible Notes",
      revisionId: "rev-1",
      bodyEndIndex: 1,
    });
  });

  it("loads document metadata", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        documentId: "doc-123",
        title: "Bible Notes",
        revisionId: "rev-2",
        body: {
          content: [{ endIndex: 1 }, { endIndex: 42 }],
        },
      })
    );

    expect(await getNotesDocument("doc-123")).toEqual({
      documentId: "doc-123",
      title: "Bible Notes",
      revisionId: "rev-2",
      bodyEndIndex: 42,
    });
  });

  it("replaces the body of an existing document", async () => {
    const fetchCalls = fetchMock.mock.calls as unknown[][];
    const exportDocument = buildNotesExportDocument([], {
      now: Date.UTC(2026, 3, 6, 21, 10),
    });

    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          documentId: "doc-123",
          title: "Bible Notes",
          revisionId: "rev-2",
          body: {
            content: [{ endIndex: 1 }, { endIndex: 42 }],
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          revisionId: "rev-3",
        })
      );

    expect(await replaceNotesDocumentBody("doc-123", exportDocument)).toEqual({
      revisionId: "rev-3",
    });

    const secondRequest = getSecondRequestInit(fetchCalls);
    expect(getSecondRequestUrl(fetchCalls)).toBe(
      "https://docs.googleapis.com/v1/documents/doc-123:batchUpdate"
    );
    expect(secondRequest.method).toBe("POST");
    expect(typeof secondRequest.body).toBe("string");

    const batchUpdateBody = getBatchUpdateBody(fetchCalls);
    const paragraphStyleRequest = batchUpdateBody.requests.find((request) =>
      Object.hasOwn(request, "updateParagraphStyle")
    ) as
      | {
          updateParagraphStyle: {
            paragraphStyle: {
              namedStyleType: string;
              alignment?: string;
            };
          };
        }
      | undefined;
    const textStyleRequest = batchUpdateBody.requests.find((request) =>
      Object.hasOwn(request, "updateTextStyle")
    ) as
      | {
          updateTextStyle: {
            textStyle: {
              italic?: boolean;
            };
          };
        }
      | undefined;

    expect(batchUpdateBody.requests).toEqual(
      expect.arrayContaining([
        {
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: 41,
            },
          },
        },
        {
          insertText: {
            location: { index: 1 },
            text: exportDocument.text,
          },
        },
      ])
    );
    expect(paragraphStyleRequest?.updateParagraphStyle.paragraphStyle).toEqual(
      expect.objectContaining({
        namedStyleType: "TITLE",
        alignment: "CENTER",
      })
    );
    expect(textStyleRequest?.updateTextStyle.textStyle).toEqual(
      expect.objectContaining({
        italic: true,
      })
    );
    expect(batchUpdateBody).toEqual(
      expect.objectContaining({
        writeControl: {
          targetRevisionId: "rev-2",
        },
      })
    );
  });

  it("prefers the freshly loaded document revision over a stale caller revision", async () => {
    const exportDocument = buildNotesExportDocument([], {
      now: Date.UTC(2026, 3, 6, 21, 10),
    });
    const fetchCalls = fetchMock.mock.calls as unknown[][];

    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          documentId: "doc-123",
          title: "Bible Notes",
          revisionId: "rev-current",
          body: {
            content: [{ endIndex: 1 }, { endIndex: 42 }],
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          revisionId: "rev-next",
        })
      );

    await replaceNotesDocumentBody("doc-123", exportDocument, "rev-stale");

    const batchUpdateBody = getBatchUpdateBody(fetchCalls);
    expect(batchUpdateBody).toEqual(
      expect.objectContaining({
        writeControl: {
          targetRevisionId: "rev-current",
        },
      })
    );
  });

  it("skips deleteContentRange for a minimally empty document body", async () => {
    const fetchCalls = fetchMock.mock.calls as unknown[][];
    const exportDocument = buildNotesExportDocument([], {
      now: Date.UTC(2026, 3, 6, 21, 10),
    });

    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          documentId: "doc-123",
          title: "Bible Notes",
          revisionId: "rev-2",
          body: {
            content: [{ endIndex: 1 }, { endIndex: 2 }],
          },
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          revisionId: "rev-3",
        })
      );

    await replaceNotesDocumentBody("doc-123", exportDocument);

    const secondRequest = getSecondRequestInit(fetchCalls);
    expect(getSecondRequestUrl(fetchCalls)).toBe(
      "https://docs.googleapis.com/v1/documents/doc-123:batchUpdate"
    );
    expect(secondRequest.method).toBe("POST");
    expect(typeof secondRequest.body).toBe("string");

    const batchUpdateBody = getBatchUpdateBody(fetchCalls);

    expect(batchUpdateBody.requests[0]).toEqual({
      insertText: {
        location: { index: 1 },
        text: exportDocument.text,
      },
    });
  });

  it("maps auth failures to reconnect errors", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ error: "denied" }, 403)
    );

    await expect(createNotesDocument("Bible Notes")).rejects.toEqual(
      expect.objectContaining<Partial<GoogleDocsApiError>>({
        code: "needsReconnect",
        message: "This Google account can't access the current Google Doc.",
      })
    );
  });

  it("maps insufficient scope errors to a reconnect message", async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          error: {
            message: "Request had insufficient authentication scopes.",
          },
        },
        403
      )
    );

    await expect(createNotesDocument("Bible Notes")).rejects.toEqual(
      expect.objectContaining<Partial<GoogleDocsApiError>>({
        code: "needsReconnect",
        message: "Reconnect Google Docs to continue syncing.",
      })
    );
  });

  it("maps missing documents to a friendly not found error", async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse({}, 404));

    await expect(getNotesDocument("doc-123")).rejects.toEqual(
      expect.objectContaining<Partial<GoogleDocsApiError>>({
        code: "notFound",
        message: "The current Google Doc could not be found.",
      })
    );
  });

  it("revokes access and signs out on disconnect", async () => {
    await disconnectGoogleDocs();

    expect(GoogleSignin.revokeAccess).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  });
});
