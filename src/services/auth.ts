/* eslint-disable unicorn/no-null, @typescript-eslint/no-use-before-define, unicorn/prefer-native-coercion-functions, unicorn/switch-case-braces */
import * as AppleAuthentication from "expo-apple-authentication";
import * as Application from "expo-application";
import { Platform } from "react-native";
import { FirebaseError } from "firebase/app";
import {
  Auth,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "src/config/firebase";

export interface AuthUserSnapshot {
  uid: string;
  email: string | null;
  displayName: string | null;
  providerIds: Array<string>;
}

export interface GoogleSignInCredentialParams {
  idToken: string;
  accessToken?: string;
}

export const getCurrentAuth = (): Auth => getFirebaseAuth();

export const getCurrentUserSnapshot = (): AuthUserSnapshot | null => {
  const user = getCurrentAuth().currentUser;
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    providerIds: user.providerData
      .map((provider) => provider.providerId)
      .filter((providerId): providerId is string => Boolean(providerId)),
  };
};

export const subscribeToAuthStateChanges = (
  callback: (userSnapshot: AuthUserSnapshot | null) => void
): (() => void) =>
  onAuthStateChanged(getCurrentAuth(), (user) => {
    callback(
      user
        ? {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            providerIds: user.providerData
              .map((provider) => provider.providerId)
              .filter((providerId): providerId is string =>
                Boolean(providerId)
              ),
          }
        : null
    );
  });

export const signInWithEmailPassword = async (
  email: string,
  password: string
): Promise<AuthUserSnapshot> => {
  const result = await signInWithEmailAndPassword(
    getCurrentAuth(),
    email,
    password
  );
  return mapUser(result.user);
};

export const createEmailPasswordAccount = async (
  email: string,
  password: string
): Promise<AuthUserSnapshot> => {
  const result = await createUserWithEmailAndPassword(
    getCurrentAuth(),
    email,
    password
  );
  return mapUser(result.user);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(getCurrentAuth(), email);
};

export const signInWithApple = async (): Promise<AuthUserSnapshot> => {
  if (Platform.OS !== "ios") {
    throw new Error("Apple Sign In is only available on iOS.");
  }

  try {
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Apple Sign In is not available on this device.");
    }
  } catch (error) {
    logAppleAuthError("availability_check_failed", error);
    throw error;
  }

  const appleCredential = await signInWithAppleNative();

  if (!appleCredential.identityToken) {
    throw new Error("Apple Sign In did not return an identity token.");
  }

  const provider = new OAuthProvider("apple.com");
  const firebaseCredential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce:
      (
        appleCredential as AppleAuthentication.AppleAuthenticationCredential & {
          nonce?: string;
        }
      ).nonce ?? undefined,
  });

  let result;
  try {
    result = await signInWithCredential(getCurrentAuth(), firebaseCredential);
  } catch (error) {
    logAppleAuthError("firebase_sign_in_failed", error);
    throw error;
  }
  return mapUser(result.user);
};

export const signInWithGoogleCredentialToken = async ({
  idToken,
  accessToken,
}: GoogleSignInCredentialParams): Promise<AuthUserSnapshot> => {
  const firebaseCredential = GoogleAuthProvider.credential(
    idToken,
    accessToken
  );

  try {
    const result = await signInWithCredential(
      getCurrentAuth(),
      firebaseCredential
    );
    return mapUser(result.user);
  } catch (error) {
    logProviderAuthError("google.com", "firebase_sign_in_failed", error);
    throw error;
  }
};

export const signOutCurrentUser = async (): Promise<void> => {
  await signOut(getCurrentAuth());
};

export type ReauthParams =
  | { password: string }
  | { useAppleSignIn: true }
  | undefined;

export const deleteCurrentUserAccount = async (
  reauth?: ReauthParams
): Promise<void> => {
  const auth = getCurrentAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No signed in user.");
  }

  try {
    await deleteUser(user);
    return;
  } catch (error) {
    const code = (error as FirebaseError)?.code;
    if (code !== "auth/requires-recent-login") {
      throw error;
    }
  }

  await reauthenticateCurrentUser(user, reauth);
  await deleteUser(user);
};

const reauthenticateCurrentUser = async (
  user: User,
  reauth?: ReauthParams
): Promise<void> => {
  if (!reauth) {
    throw new Error(
      "Recent login required. Sign in again, then retry account deletion."
    );
  }

  if ("password" in reauth) {
    if (!user.email) {
      throw new Error(
        "This account does not support password re-authentication."
      );
    }
    const credential = EmailAuthProvider.credential(
      user.email,
      reauth.password
    );
    await reauthenticateWithCredential(user, credential);
    return;
  }

  if ("useAppleSignIn" in reauth && reauth.useAppleSignIn) {
    const appleCredential = await signInWithAppleNative();
    if (!appleCredential.identityToken) {
      throw new Error("Apple Sign In did not return an identity token.");
    }
    const provider = new OAuthProvider("apple.com");
    const firebaseCredential = provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce:
        (
          appleCredential as AppleAuthentication.AppleAuthenticationCredential & {
            nonce?: string;
          }
        ).nonce ?? undefined,
    });
    try {
      await reauthenticateWithCredential(user, firebaseCredential);
    } catch (error) {
      logAppleAuthError("firebase_reauth_failed", error);
      throw error;
    }
    return;
  }

  throw new Error("Unsupported re-authentication method.");
};

export const formatAuthError = (error: unknown): string => {
  const expoErrorCode = (error as { code?: string })?.code;
  if (expoErrorCode === "ERR_REQUEST_CANCELED") {
    return "Sign in was cancelled.";
  }
  if (expoErrorCode === "ERR_REQUEST_UNKNOWN") {
    const bundleId = Application.applicationId ?? "unknown bundle";
    return `Apple Sign In failed before Firebase. Check Sign in with Apple capability/provisioning for ${bundleId}, then rebuild the iOS app.`;
  }
  if (expoErrorCode === "ERR_INVALID_OPERATION") {
    return "Apple Sign In is not available for this app configuration. Check iOS capability/provisioning and rebuild.";
  }

  const firebaseCode = (error as FirebaseError)?.code;
  switch (firebaseCode) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account already exists for this email.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/requires-recent-login":
      return "Please sign in again before deleting your account.";
    default:
      return (
        (error as Error)?.message ?? "Something went wrong. Please try again."
      );
  }
};

const signInWithAppleNative =
  async (): Promise<AppleAuthentication.AppleAuthenticationCredential> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (__DEV__) {
        console.log("Apple Sign In success (native step)", {
          bundleId: Application.applicationId,
          user: credential.user,
          hasIdentityToken: Boolean(credential.identityToken),
          hasAuthorizationCode: Boolean(credential.authorizationCode),
          emailReturned: Boolean(credential.email),
          fullNameReturned: Boolean(credential.fullName),
          state: credential.state ?? null,
        });
      }

      return credential;
    } catch (error) {
      logAppleAuthError("sign_in_async_failed", error);
      throw error;
    }
  };

const logAppleAuthError = (stage: string, error: unknown): void => {
  logProviderAuthError(
    "apple.com",
    stage,
    error,
    Application.applicationId ?? null
  );
};

const logProviderAuthError = (
  provider: "apple.com" | "google.com",
  stage: string,
  error: unknown,
  bundleId: string | null = Application.applicationId ?? null
): void => {
  const appleError = error as {
    code?: string;
    domain?: string;
    message?: string;
    userInfo?: unknown;
    nativeStackIOS?: unknown;
  };

  console.error(
    provider === "apple.com"
      ? "Apple Sign In diagnostic"
      : "Google Sign In diagnostic",
    {
      stage,
      bundleId,
      code: appleError.code ?? null,
      domain: appleError.domain ?? null,
      message: appleError.message ?? String(error),
      userInfo: appleError.userInfo ?? null,
      nativeStackIOS: appleError.nativeStackIOS ?? null,
    }
  );
};

const mapUser = (user: User): AuthUserSnapshot => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  providerIds: user.providerData
    .map((provider) => provider.providerId)
    .filter((providerId): providerId is string => Boolean(providerId)),
});

/* eslint-enable unicorn/no-null, @typescript-eslint/no-use-before-define, unicorn/prefer-native-coercion-functions, unicorn/switch-case-braces */
