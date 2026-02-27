/* eslint-disable @typescript-eslint/no-use-before-define, unicorn/no-null */
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { RootState } from "src/app/store";
import {
  AuthUserSnapshot,
  GoogleSignInCredentialParams,
  ReauthParams,
  createEmailPasswordAccount,
  deleteCurrentUserAccount,
  formatAuthError,
  refreshCurrentUserSnapshot,
  signInWithApple,
  signInWithGoogleCredentialToken,
  signInWithEmailPassword,
  signOutCurrentUser,
  subscribeToAuthStateChanges,
  sendPasswordReset,
} from "src/services/auth";
import {
  clearLocalSyncedData,
  deleteRemoteUserData,
  runFullSyncCycle,
} from "src/services/sync";
import {
  getEnableChurchCenterDeepLink,
  getEnableNotificationsState,
  getNotificationTime,
  getReadingBackgroundColor,
  getReadingFontSize,
  getShowChildrensPlan,
  getSubscribedPlans,
} from "src/redux/settingsSlice";
import {
  getAvailablePlans,
  getReadingPlan,
  getReadingPlanProgressState,
} from "src/redux/readingPlanSlice";
import {
  getDismissedNotificationState,
  getNotifications,
} from "src/redux/notificationsSlice";

interface AuthState {
  user: AuthUserSnapshot | null;
  isInitialized: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  hasError: boolean;
  errorMessage?: string;
  lastSyncSucceededAt?: number;
}

const initialState: AuthState = {
  user: null,
  isInitialized: false,
  isLoading: false,
  isSyncing: false,
  hasError: false,
  errorMessage: undefined,
  lastSyncSucceededAt: undefined,
};

let authStateUnsubscribe: (() => void) | null = null;
const LAST_SYNC_UID_STORAGE_KEY = "@sync/lastUid";
type DeleteAccountReauthParams =
  | NonNullable<ReauthParams>
  | { useGoogleSignIn: true };

export const initializeAuthListener = createAsyncThunk(
  "auth/initializeAuthListener",
  (_, { dispatch }) => {
    if (authStateUnsubscribe) {
      return Promise.resolve(true);
    }

    authStateUnsubscribe = subscribeToAuthStateChanges((user) => {
      void (async () => {
        const nextUid = user?.uid;
        if (nextUid) {
          const lastUid = await AsyncStorage.getItem(LAST_SYNC_UID_STORAGE_KEY);
          if (lastUid && lastUid !== nextUid) {
            await clearLocalSyncedData();
          }
          await AsyncStorage.setItem(LAST_SYNC_UID_STORAGE_KEY, nextUid);
        }

        dispatch(setAuthUser(user));
        dispatch(setAuthInitialized(true));
        if (user) {
          void dispatch(runSyncNow({ reason: "auth-state-change" }));
        }
      })();
    });

    return Promise.resolve(true);
  }
);

export const runSyncNow = createAsyncThunk(
  "auth/runSyncNow",
  async (
    _params: {
      reason:
        | "auth-state-change"
        | "foreground"
        | "network-reconnect"
        | "manual";
    },
    { dispatch, getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    if (!state.auth.user) {
      return false;
    }

    const didSync = await runFullSyncCycle();
    if (!didSync) {
      return rejectWithValue("Sync failed");
    }

    await dispatch(getSubscribedPlans());
    await dispatch(getEnableNotificationsState());
    await dispatch(getNotificationTime());
    await dispatch(getReadingFontSize());
    await dispatch(getReadingBackgroundColor());
    await dispatch(getShowChildrensPlan());
    await dispatch(getEnableChurchCenterDeepLink());
    await dispatch(getDismissedNotificationState());
    await dispatch(getAvailablePlans());
    await dispatch(getReadingPlanProgressState());
    await dispatch(getReadingPlan());
    await dispatch(getNotifications());

    return true;
  }
);

export const refreshAuthClaims = createAsyncThunk(
  "auth/refreshAuthClaims",
  async (_, { rejectWithValue }) => {
    try {
      return await refreshCurrentUserSnapshot(true);
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const signInWithAppleThunk = createAsyncThunk(
  "auth/signInWithApple",
  async (_, { rejectWithValue }) => {
    try {
      return await signInWithApple();
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const signInWithGoogleThunk = createAsyncThunk(
  "auth/signInWithGoogle",
  async (params: GoogleSignInCredentialParams, { rejectWithValue }) => {
    try {
      return await signInWithGoogleCredentialToken(params);
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const signInWithEmailPasswordThunk = createAsyncThunk(
  "auth/signInWithEmailPassword",
  async (params: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await signInWithEmailPassword(params.email, params.password);
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const createEmailPasswordAccountThunk = createAsyncThunk(
  "auth/createEmailPasswordAccount",
  async (params: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await createEmailPasswordAccount(params.email, params.password);
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const sendPasswordResetThunk = createAsyncThunk(
  "auth/sendPasswordReset",
  async (params: { email: string }, { rejectWithValue }) => {
    try {
      await sendPasswordReset(params.email);
      return true;
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (
    params: { clearLocalData: boolean },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await signOutCurrentUser();
      if (params.clearLocalData) {
        await clearLocalSyncedData();
        await AsyncStorage.removeItem(LAST_SYNC_UID_STORAGE_KEY);
        await dispatch(getSubscribedPlans());
        await dispatch(getEnableNotificationsState());
        await dispatch(getNotificationTime());
        await dispatch(getReadingFontSize());
        await dispatch(getReadingBackgroundColor());
        await dispatch(getShowChildrensPlan());
        await dispatch(getEnableChurchCenterDeepLink());
        await dispatch(getDismissedNotificationState());
        await dispatch(getReadingPlanProgressState());
        await dispatch(getReadingPlan());
      }
      return true;
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const deleteAccount = createAsyncThunk(
  "auth/deleteAccount",
  async (
    params:
      | { reauth?: DeleteAccountReauthParams; clearLocalData?: boolean }
      | undefined,
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const uid = state.auth.user?.uid;
      if (!uid) {
        throw new Error("No signed in user.");
      }

      const isGoogleReauth =
        params?.reauth !== undefined && "useGoogleSignIn" in params.reauth;

      if (isGoogleReauth) {
        const googleResponse = await GoogleSignin.signIn();
        if (!isSuccessResponse(googleResponse)) {
          throw Object.assign(new Error("Sign in was cancelled."), {
            code: "ERR_REQUEST_CANCELED",
          });
        }
        const idToken = googleResponse.data.idToken;
        if (!idToken) {
          throw new Error(
            "Google Sign In did not return an ID token. Check OAuth client configuration and try again."
          );
        }
        const reauthUser = await signInWithGoogleCredentialToken({ idToken });
        if (reauthUser.uid !== uid) {
          await signOutCurrentUser();
          throw new Error(
            "Google account does not match the account being deleted."
          );
        }
      }

      const reauthForDeletion = isGoogleReauth
        ? undefined
        : (params?.reauth as ReauthParams | undefined);

      await deleteCurrentUserAccount(reauthForDeletion);
      await deleteRemoteUserData(uid);

      if (params?.clearLocalData ?? true) {
        await clearLocalSyncedData();
        await AsyncStorage.removeItem(LAST_SYNC_UID_STORAGE_KEY);
        await dispatch(getSubscribedPlans());
        await dispatch(getEnableNotificationsState());
        await dispatch(getNotificationTime());
        await dispatch(getReadingFontSize());
        await dispatch(getReadingBackgroundColor());
        await dispatch(getShowChildrensPlan());
        await dispatch(getEnableChurchCenterDeepLink());
        await dispatch(getDismissedNotificationState());
        await dispatch(getReadingPlanProgressState());
        await dispatch(getReadingPlan());
      }

      return true;
    } catch (error) {
      return rejectWithValue(formatAuthError(error));
    }
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser: (state, action: PayloadAction<AuthUserSnapshot | null>) => {
      state.user = action.payload;
      state.hasError = false;
      if (action.payload === null) {
        state.isSyncing = false;
      }
    },
    setAuthInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    clearAuthError: (state) => {
      state.hasError = false;
      state.errorMessage = undefined;
    },
  },
  extraReducers: (builder) => {
    const pendingCases = new Set([
      signInWithAppleThunk.pending.type,
      signInWithGoogleThunk.pending.type,
      signInWithEmailPasswordThunk.pending.type,
      createEmailPasswordAccountThunk.pending.type,
      sendPasswordResetThunk.pending.type,
      signOut.pending.type,
      deleteAccount.pending.type,
    ]);

    builder.addCase(initializeAuthListener.rejected, (state) => {
      state.isInitialized = true;
      state.hasError = true;
      state.errorMessage = "Failed to start auth listener.";
    });

    builder.addCase(runSyncNow.pending, (state) => {
      state.isSyncing = true;
    });
    builder.addCase(runSyncNow.fulfilled, (state) => {
      state.isSyncing = false;
      state.lastSyncSucceededAt = Date.now();
    });
    builder.addCase(runSyncNow.rejected, (state) => {
      state.isSyncing = false;
    });

    builder.addCase(refreshAuthClaims.fulfilled, (state, action) => {
      if (action.payload) {
        state.user = action.payload;
      }
    });

    builder.addMatcher(
      (action: { type: string }) => pendingCases.has(action.type),
      (state) => {
        state.isLoading = true;
        state.hasError = false;
        state.errorMessage = undefined;
      }
    );

    builder.addMatcher(
      (action: { type: string }) =>
        [
          signInWithAppleThunk.fulfilled.type,
          signInWithGoogleThunk.fulfilled.type,
          signInWithEmailPasswordThunk.fulfilled.type,
          createEmailPasswordAccountThunk.fulfilled.type,
          sendPasswordResetThunk.fulfilled.type,
          signOut.fulfilled.type,
          deleteAccount.fulfilled.type,
        ].includes(action.type),
      (state) => {
        state.isLoading = false;
        state.hasError = false;
      }
    );

    builder.addMatcher(
      (action: { type: string }) =>
        [
          signInWithAppleThunk.rejected.type,
          signInWithGoogleThunk.rejected.type,
          signInWithEmailPasswordThunk.rejected.type,
          createEmailPasswordAccountThunk.rejected.type,
          sendPasswordResetThunk.rejected.type,
          signOut.rejected.type,
          deleteAccount.rejected.type,
        ].includes(action.type),
      (state, action: { payload?: unknown }) => {
        state.isLoading = false;
        state.hasError = true;
        state.errorMessage =
          typeof action.payload === "string"
            ? action.payload
            : "Something went wrong. Please try again.";
      }
    );
  },
});

export const { setAuthUser, setAuthInitialized, clearAuthError } =
  authSlice.actions;

export const selectAuthUser = (state: RootState): AuthUserSnapshot | null =>
  state.auth.user;

export const selectIsAuthenticated = (state: RootState): boolean =>
  Boolean(state.auth.user);

export const selectIsMember = (state: RootState): boolean =>
  state.auth.user?.isMember === true;

export const selectAuthIsInitialized = (state: RootState): boolean =>
  state.auth.isInitialized;

export const selectAuthIsLoading = (state: RootState): boolean =>
  state.auth.isLoading;

export const selectAuthIsSyncing = (state: RootState): boolean =>
  state.auth.isSyncing;

export const selectAuthErrorMessage = (state: RootState): string | undefined =>
  state.auth.errorMessage;

export const authReducer = authSlice.reducer;

/* eslint-enable @typescript-eslint/no-use-before-define, unicorn/no-null */
