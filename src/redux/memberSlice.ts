/* eslint-disable unicorn/no-null */
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import {
  MemberProfile,
  PrayerAssignment,
  fetchAllMembers,
  fetchPrayerAssignment,
  getMountainTimeDate,
  getYesterdayMountainTimeDate,
  requestDailyPrayerAssignment,
} from "src/services/members";

interface PrayerAssignmentResult {
  assignment: PrayerAssignment;
  date: string;
  isFallbackFromPreviousDay: boolean;
}

interface FetchDailyPrayerAssignmentOptions {
  generateIfMissing?: boolean;
}

interface MemberState {
  directory: Array<MemberProfile>;
  prayerAssignment: PrayerAssignment | null;
  prayerAssignmentDate: string | null;
  isFallbackPrayerAssignment: boolean;
  isLoadingDirectory: boolean;
  isLoadingPrayer: boolean;
  hasDirectoryError: boolean;
  hasPrayerError: boolean;
}

const initialState: MemberState = {
  directory: [],
  prayerAssignment: null,
  prayerAssignmentDate: null,
  isFallbackPrayerAssignment: false,
  isLoadingDirectory: false,
  isLoadingPrayer: false,
  hasDirectoryError: false,
  hasPrayerError: false,
};

export const fetchMemberDirectory = createAsyncThunk(
  "member/fetchMemberDirectory",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAllMembers();
    } catch {
      return rejectWithValue("Unable to load member directory.");
    }
  }
);

export const fetchDailyPrayerAssignment = createAsyncThunk<
  PrayerAssignmentResult | null,
  FetchDailyPrayerAssignmentOptions | undefined,
  { state: RootState; rejectValue: string }
>(
  "member/fetchDailyPrayerAssignment",
  async (options, { getState, rejectWithValue }) => {
    const state = getState();
    const uid = state.auth.user?.uid;
    if (!uid) {
      return rejectWithValue(
        "You must be signed in to view prayer assignments."
      );
    }

    try {
      const shouldGenerate = options?.generateIfMissing === true;
      const todayDate = getMountainTimeDate();
      let todayAssignment = await fetchPrayerAssignment(uid, todayDate);

      if (!todayAssignment && shouldGenerate) {
        await requestDailyPrayerAssignment();
        todayAssignment = await fetchPrayerAssignment(uid, todayDate);
      }

      if (todayAssignment) {
        return {
          assignment: todayAssignment,
          date: todayDate,
          isFallbackFromPreviousDay: false,
        };
      }

      const yesterdayDate = getYesterdayMountainTimeDate();
      const yesterdayAssignment = await fetchPrayerAssignment(
        uid,
        yesterdayDate
      );

      if (!yesterdayAssignment) {
        return null;
      }

      return {
        assignment: yesterdayAssignment,
        date: yesterdayDate,
        isFallbackFromPreviousDay: true,
      };
    } catch {
      return rejectWithValue("Unable to load prayer assignments.");
    }
  }
);

const memberSlice = createSlice({
  name: "member",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchMemberDirectory.pending, (state) => {
      state.isLoadingDirectory = true;
      state.hasDirectoryError = false;
    });
    builder.addCase(fetchMemberDirectory.fulfilled, (state, action) => {
      state.isLoadingDirectory = false;
      state.directory = action.payload;
      state.hasDirectoryError = false;
    });
    builder.addCase(fetchMemberDirectory.rejected, (state) => {
      state.isLoadingDirectory = false;
      state.hasDirectoryError = true;
    });

    builder.addCase(fetchDailyPrayerAssignment.pending, (state) => {
      state.isLoadingPrayer = true;
      state.hasPrayerError = false;
      state.prayerAssignment = null;
      state.prayerAssignmentDate = null;
      state.isFallbackPrayerAssignment = false;
    });
    builder.addCase(fetchDailyPrayerAssignment.fulfilled, (state, action) => {
      state.isLoadingPrayer = false;
      state.hasPrayerError = false;
      state.prayerAssignment = action.payload?.assignment ?? null;
      state.prayerAssignmentDate = action.payload?.date ?? null;
      state.isFallbackPrayerAssignment =
        action.payload?.isFallbackFromPreviousDay ?? false;
    });
    builder.addCase(fetchDailyPrayerAssignment.rejected, (state) => {
      state.isLoadingPrayer = false;
      state.hasPrayerError = true;
    });
  },
});

export const selectMemberDirectory = (state: RootState): Array<MemberProfile> =>
  state.member.directory;

export const selectPrayerAssignment = (
  state: RootState
): PrayerAssignment | null => state.member.prayerAssignment;

export const selectPrayerAssignmentDate = (state: RootState): string | null =>
  state.member.prayerAssignmentDate;

export const selectIsFallbackPrayerAssignment = (state: RootState): boolean =>
  state.member.isFallbackPrayerAssignment;

export const selectIsLoadingDirectory = (state: RootState): boolean =>
  state.member.isLoadingDirectory;

export const selectIsLoadingPrayer = (state: RootState): boolean =>
  state.member.isLoadingPrayer;

export const selectHasDirectoryError = (state: RootState): boolean =>
  state.member.hasDirectoryError;

export const selectHasPrayerError = (state: RootState): boolean =>
  state.member.hasPrayerError;

export const memberReducer = memberSlice.reducer;

/* eslint-enable unicorn/no-null */
