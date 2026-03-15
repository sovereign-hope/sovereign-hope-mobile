/* eslint-disable unicorn/no-null */
import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
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

export interface DirectorySection {
  title: string;
  sortKey: string;
  letter: string;
  isSingleMember: boolean;
  data: Array<MemberProfile>;
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

const normalizeValue = (value?: string | null): string =>
  value?.trim().toLowerCase() ?? "";

const getDisplayNameParts = (displayName: string): Array<string> =>
  displayName.trim().split(/\s+/).filter(Boolean);

const getFirstNameValue = (member: MemberProfile): string =>
  member.firstName?.trim() || getDisplayNameParts(member.displayName)[0] || "";

const getLastNameValue = (member: MemberProfile): string =>
  member.lastName?.trim() ||
  getDisplayNameParts(member.displayName).at(-1) ||
  member.displayName.trim();

const getSectionLetter = (value: string): string => {
  const trimmedValue = value.trim().toUpperCase();
  const firstCharacter = trimmedValue[0] ?? "#";
  return /[A-Z]/.test(firstCharacter) ? firstCharacter : "#";
};

const compareAlphabetically = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { sensitivity: "base" });

const sortMembersWithinSection = (
  members: Array<MemberProfile>
): Array<MemberProfile> =>
  [...members].sort((left, right) => {
    if (left.isHeadOfHousehold !== right.isHeadOfHousehold) {
      return left.isHeadOfHousehold ? -1 : 1;
    }

    const firstNameComparison = compareAlphabetically(
      getFirstNameValue(left),
      getFirstNameValue(right)
    );
    if (firstNameComparison !== 0) {
      return firstNameComparison;
    }

    return compareAlphabetically(left.displayName, right.displayName);
  });

const buildHouseholdSection = (
  householdMembers: Array<MemberProfile>
): DirectorySection => {
  const sortedMembers = sortMembersWithinSection(householdMembers);
  const headOfHousehold =
    sortedMembers.find((member) => member.isHeadOfHousehold) ??
    sortedMembers[0];
  const householdTitle =
    sortedMembers
      .find((member) => member.householdName?.trim())
      ?.householdName?.trim() ||
    headOfHousehold?.displayName ||
    "Church Household";
  const householdSortValue =
    sortedMembers
      .find((member) => member.householdLastName?.trim())
      ?.householdLastName?.trim() ||
    (headOfHousehold ? getLastNameValue(headOfHousehold) : householdTitle);
  const sortKey = householdSortValue.toUpperCase();

  return {
    title: householdTitle,
    sortKey,
    letter: getSectionLetter(sortKey),
    isSingleMember: false,
    data: sortedMembers,
  };
};

const filterSectionMembers = (
  section: DirectorySection,
  searchQuery: string
): Array<MemberProfile> =>
  section.data.filter((member) => {
    const normalizedDisplayName = normalizeValue(member.displayName);
    const normalizedFirstName = normalizeValue(member.firstName);
    const normalizedLastName = normalizeValue(member.lastName);

    return (
      normalizedDisplayName.includes(searchQuery) ||
      normalizedFirstName.includes(searchQuery) ||
      normalizedLastName.includes(searchQuery)
    );
  });

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

export const selectGroupedDirectorySections = createSelector(
  [selectMemberDirectory],
  (directory): Array<DirectorySection> => {
    const householdMap = new Map<string, Array<MemberProfile>>();
    const singlesByLetter = new Map<string, Array<MemberProfile>>();

    for (const member of directory) {
      const householdId = member.householdId?.trim();
      if (!householdId) {
        const sortKey = getLastNameValue(member).toUpperCase();
        const letter = getSectionLetter(sortKey);
        const existing = singlesByLetter.get(letter) ?? [];
        existing.push(member);
        singlesByLetter.set(letter, existing);
        continue;
      }

      const existingMembers = householdMap.get(householdId) ?? [];
      existingMembers.push(member);
      householdMap.set(householdId, existingMembers);
    }

    const letterSections: Array<DirectorySection> = [
      ...singlesByLetter.entries(),
    ].map(([letter, members]) => ({
      title: letter,
      sortKey: letter,
      letter,
      isSingleMember: true,
      data: [...members].sort((left, right) =>
        compareAlphabetically(
          getLastNameValue(left).toUpperCase(),
          getLastNameValue(right).toUpperCase()
        )
      ),
    }));

    const householdSections = [...householdMap.values()].map((members) =>
      buildHouseholdSection(members)
    );

    return [...letterSections, ...householdSections].sort((left, right) => {
      const sortKeyComparison = compareAlphabetically(
        left.sortKey,
        right.sortKey
      );
      if (sortKeyComparison !== 0) {
        return sortKeyComparison;
      }

      return compareAlphabetically(left.title, right.title);
    });
  }
);

const selectDirectorySearchQuery = (
  _state: RootState,
  searchQuery: string
): string => searchQuery;

export const selectFilteredDirectorySections = createSelector(
  [selectGroupedDirectorySections, selectDirectorySearchQuery],
  (sections, rawSearchQuery): Array<DirectorySection> => {
    const searchQuery = normalizeValue(rawSearchQuery);
    if (!searchQuery) {
      return sections;
    }

    return sections.flatMap((section) => {
      const normalizedTitle = normalizeValue(section.title);
      const householdMatch =
        !section.isSingleMember && normalizedTitle.includes(searchQuery);

      if (householdMatch) {
        return [section];
      }

      const matchingMembers = filterSectionMembers(section, searchQuery);
      if (matchingMembers.length === 0) {
        return [];
      }

      return [{ ...section, data: matchingMembers }];
    });
  }
);

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
