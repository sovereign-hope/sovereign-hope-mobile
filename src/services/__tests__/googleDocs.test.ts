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
  getNotesDocument,
  googleDocsScope,
  replaceNotesDocumentBody,
} from "../googleDocs";

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

    expect(await replaceNotesDocumentBody("doc-123", "Bible Notes")).toEqual({
      revisionId: "rev-3",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://docs.googleapis.com/v1/documents/doc-123:batchUpdate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          requests: [
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
                text: "Bible Notes",
              },
            },
          ],
        }),
      })
    );
  });

  it("skips deleteContentRange for a minimally empty document body", async () => {
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

    await replaceNotesDocumentBody("doc-123", "Bible Notes");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://docs.googleapis.com/v1/documents/doc-123:batchUpdate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: "Bible Notes",
              },
            },
          ],
        }),
      })
    );
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
