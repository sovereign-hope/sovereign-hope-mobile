import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import * as SecureStore from "expo-secure-store";

export interface AuthenticationState {
  userToken?: string;
  isLoading: boolean;
  isSignout: boolean;
  hasError: boolean;
}

const initialState: AuthenticationState = {
  userToken: undefined,
  isLoading: false,
  isSignout: false,
  hasError: false,
};

export const fetchToken = createAsyncThunk(
  "authentication/fetchToken",
  async () => SecureStore.getItemAsync("userToken")
);

export const storeToken = createAsyncThunk(
  "authentication/storeToken",
  async (token: string) => {
    await SecureStore.setItemAsync("userToken", token);
    return token;
  }
);

export const authenticationSlice = createSlice({
  name: "authentication",
  initialState,
  reducers: {
    signOut: (state) => {
      state.userToken = undefined;
      state.isSignout = true;
      state.hasError = false;
    },
  },
  extraReducers: (builder) => {
    // fetchToken
    builder.addCase(fetchToken.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(fetchToken.fulfilled, (state, action) => {
      state.userToken = action.payload || undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(fetchToken.rejected, (state) => {
      state.userToken = undefined;
      state.isLoading = false;
      state.hasError = true;
    });

    // storeToken
    builder.addCase(storeToken.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(storeToken.fulfilled, (state, action) => {
      state.userToken = action.payload || undefined;
      state.isLoading = false;
      state.isSignout = false;
      state.hasError = false;
    });
    builder.addCase(storeToken.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const { signOut } = authenticationSlice.actions;

export const selectToken = (state: RootState): string | undefined =>
  state.authentication.userToken;
export const selectError = (state: RootState): boolean =>
  state.authentication.hasError;

export const authenticationReducer = authenticationSlice.reducer;
