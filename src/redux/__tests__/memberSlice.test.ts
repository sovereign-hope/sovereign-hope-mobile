/* eslint-disable unicorn/no-null */
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "src/redux/authSlice";
import {
  fetchDailyPrayerAssignment,
  fetchMemberDirectory,
  memberReducer,
  selectFilteredDirectorySections,
  selectGroupedDirectorySections,
} from "src/redux/memberSlice";
import {
  fetchAllMembers,
  fetchPrayerAssignment,
  getMountainTimeDate,
  getYesterdayMountainTimeDate,
  requestDailyPrayerAssignment,
} from "src/services/members";

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    signIn: jest.fn(),
  },
  isSuccessResponse: jest.fn(() => true),
}));

jest.mock("src/services/members", () => ({
  fetchAllMembers: jest.fn(),
  fetchPrayerAssignment: jest.fn(),
  getMountainTimeDate: jest.fn(() => "2026-02-27"),
  getYesterdayMountainTimeDate: jest.fn(() => "2026-02-26"),
  requestDailyPrayerAssignment: jest.fn(),
}));

const createTestStore = (withAuthenticatedMember = true) =>
  configureStore({
    reducer: {
      auth: authReducer,
      member: memberReducer,
    },
    preloadedState: {
      auth: {
        user: withAuthenticatedMember
          ? {
              uid: "member-1",
              email: "member@example.com",
              displayName: "Member One",
              providerIds: ["password"],
              isMember: true,
            }
          : null,
        isInitialized: true,
        isLoading: false,
        isSyncing: false,
        hasError: false,
        errorMessage: undefined,
        lastSyncSucceededAt: undefined,
      },
    },
  });

describe("memberSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads member directory", async () => {
    (fetchAllMembers as jest.Mock).mockResolvedValueOnce([
      {
        uid: "member-1",
        displayName: "Alice",
        photoURL: null,
        createdAt: 100,
      },
      {
        uid: "member-2",
        displayName: "Bob",
        photoURL: "https://example.com/bob.jpg",
        createdAt: 200,
      },
    ]);

    const store = createTestStore();
    await store.dispatch(fetchMemberDirectory());

    const state = store.getState().member;
    expect(state.directory).toHaveLength(2);
    expect(state.hasDirectoryError).toBe(false);
    expect(state.isLoadingDirectory).toBe(false);
  });

  it("groups members into sorted directory sections", () => {
    const state = {
      member: {
        directory: [
          {
            uid: "member-1",
            displayName: "Sam Coe",
            photoURL: null,
            createdAt: 100,
            firstName: "Sam",
            lastName: "Coe",
            householdId: "household-coe",
            householdName: "The Coe Family",
            householdLastName: "Coe",
            isHeadOfHousehold: true,
          },
          {
            uid: "member-2",
            displayName: "Abby Coe",
            photoURL: null,
            createdAt: 101,
            firstName: "Abby",
            lastName: "Coe",
            householdId: "household-coe",
            householdName: "The Coe Family",
            householdLastName: "Coe",
            isHeadOfHousehold: false,
          },
          {
            uid: "member-3",
            displayName: "John Brown",
            photoURL: null,
            createdAt: 102,
            firstName: "John",
            lastName: "Brown",
            householdId: "household-brown",
            householdName: "Brown Household",
            householdLastName: "Brown",
            isHeadOfHousehold: true,
          },
          {
            uid: "member-4",
            displayName: "Aaron Anderson",
            photoURL: null,
            createdAt: 103,
            firstName: "Aaron",
            lastName: "Anderson",
          },
        ],
      },
    };

    const sections = selectGroupedDirectorySections(state as never);

    expect(sections).toEqual([
      expect.objectContaining({
        title: "Aaron Anderson",
        sortKey: "ANDERSON",
        letter: "A",
        isSingleMember: true,
        data: [
          expect.objectContaining({
            uid: "member-4",
          }),
        ],
      }),
      expect.objectContaining({
        title: "Brown Household",
        sortKey: "BROWN",
        letter: "B",
        isSingleMember: false,
        data: [
          expect.objectContaining({
            uid: "member-3",
          }),
        ],
      }),
      expect.objectContaining({
        title: "The Coe Family",
        sortKey: "COE",
        letter: "C",
        isSingleMember: false,
        data: [
          expect.objectContaining({
            uid: "member-1",
          }),
          expect.objectContaining({
            uid: "member-2",
          }),
        ],
      }),
    ]);
  });

  it("filters by household name and includes all members in that family", () => {
    const state = {
      member: {
        directory: [
          {
            uid: "member-1",
            displayName: "Sam Coe",
            photoURL: null,
            createdAt: 100,
            firstName: "Sam",
            lastName: "Coe",
            householdId: "household-coe",
            householdName: "The Coe Family",
            householdLastName: "Coe",
            isHeadOfHousehold: true,
          },
          {
            uid: "member-2",
            displayName: "Abby Coe",
            photoURL: null,
            createdAt: 101,
            firstName: "Abby",
            lastName: "Coe",
            householdId: "household-coe",
            householdName: "The Coe Family",
            householdLastName: "Coe",
            isHeadOfHousehold: false,
          },
          {
            uid: "member-3",
            displayName: "John Brown",
            photoURL: null,
            createdAt: 102,
            firstName: "John",
            lastName: "Brown",
          },
        ],
      },
    };

    const sections = selectFilteredDirectorySections(state as never, "coe");

    expect(sections).toHaveLength(1);
    expect(sections[0]?.data.map((member) => member.uid)).toEqual([
      "member-1",
      "member-2",
    ]);
  });

  it("filters by individual name and only keeps matching members within a family", () => {
    const state = {
      member: {
        directory: [
          {
            uid: "member-1",
            displayName: "Sam Coe",
            photoURL: null,
            createdAt: 100,
            firstName: "Sam",
            lastName: "Coe",
            householdId: "household-coe",
            householdName: "The Coe Family",
            householdLastName: "Coe",
            isHeadOfHousehold: true,
          },
          {
            uid: "member-2",
            displayName: "Abby Coe",
            photoURL: null,
            createdAt: 101,
            firstName: "Abby",
            lastName: "Coe",
            householdId: "household-coe",
            householdName: "The Coe Family",
            householdLastName: "Coe",
            isHeadOfHousehold: false,
          },
          {
            uid: "member-3",
            displayName: "John Brown",
            photoURL: null,
            createdAt: 102,
            firstName: "John",
            lastName: "Brown",
          },
        ],
      },
    };

    const sections = selectFilteredDirectorySections(state as never, "abby");

    expect(sections).toHaveLength(1);
    expect(sections[0]).toEqual(
      expect.objectContaining({
        title: "The Coe Family",
        isSingleMember: false,
        data: [
          expect.objectContaining({
            uid: "member-2",
          }),
        ],
      })
    );
  });

  it("loads today's prayer assignment when available", async () => {
    (fetchPrayerAssignment as jest.Mock).mockResolvedValueOnce({
      memberIds: ["member-2"],
      members: [{ uid: "member-2", displayName: "Bob", photoURL: null }],
      generatedAt: 100,
    });

    const store = createTestStore();
    await (
      store.dispatch as typeof store.dispatch &
        ((action: unknown) => Promise<unknown>)
    )(fetchDailyPrayerAssignment());

    const state = store.getState().member;
    expect(fetchPrayerAssignment).toHaveBeenCalledWith(
      "member-1",
      "2026-02-27"
    );
    expect(state.prayerAssignmentDate).toBe("2026-02-27");
    expect(state.isFallbackPrayerAssignment).toBe(false);
    expect(state.prayerAssignment?.members[0]?.displayName).toBe("Bob");
  });

  it("falls back to yesterday when today's assignment is missing", async () => {
    (fetchPrayerAssignment as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        memberIds: ["member-3"],
        members: [{ uid: "member-3", displayName: "Cara", photoURL: null }],
        generatedAt: 200,
      });

    const store = createTestStore();
    await (
      store.dispatch as typeof store.dispatch &
        ((action: unknown) => Promise<unknown>)
    )(fetchDailyPrayerAssignment());

    const state = store.getState().member;
    expect(getMountainTimeDate).toHaveBeenCalled();
    expect(getYesterdayMountainTimeDate).toHaveBeenCalled();
    expect(state.prayerAssignmentDate).toBe("2026-02-26");
    expect(state.isFallbackPrayerAssignment).toBe(true);
    expect(state.prayerAssignment?.members[0]?.displayName).toBe("Cara");
  });

  it("requests a new assignment when missing and generation is enabled", async () => {
    (fetchPrayerAssignment as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        memberIds: ["member-4"],
        members: [{ uid: "member-4", displayName: "Dan", photoURL: null }],
        generatedAt: 300,
      });
    (requestDailyPrayerAssignment as jest.Mock).mockResolvedValueOnce({
      created: true,
      date: "2026-02-27",
      memberCount: 1,
    });

    const store = createTestStore();
    await (
      store.dispatch as typeof store.dispatch &
        ((action: unknown) => Promise<unknown>)
    )(fetchDailyPrayerAssignment({ generateIfMissing: true }));

    const state = store.getState().member;
    expect(requestDailyPrayerAssignment).toHaveBeenCalledTimes(1);
    expect(fetchPrayerAssignment).toHaveBeenNthCalledWith(
      1,
      "member-1",
      "2026-02-27"
    );
    expect(fetchPrayerAssignment).toHaveBeenNthCalledWith(
      2,
      "member-1",
      "2026-02-27"
    );
    expect(state.prayerAssignmentDate).toBe("2026-02-27");
    expect(state.isFallbackPrayerAssignment).toBe(false);
    expect(state.prayerAssignment?.members[0]?.displayName).toBe("Dan");
  });

  it("sets prayer error when user is signed out", async () => {
    const store = createTestStore(false);
    await (
      store.dispatch as typeof store.dispatch &
        ((action: unknown) => Promise<unknown>)
    )(fetchDailyPrayerAssignment());

    const state = store.getState().member;
    expect(state.hasPrayerError).toBe(true);
    expect(state.prayerAssignment).toBeNull();
  });

  it("clears stale prayer assignment data when a new fetch starts and fails", async () => {
    const store = createTestStore();

    (fetchPrayerAssignment as jest.Mock).mockResolvedValueOnce({
      memberIds: ["member-2"],
      members: [{ uid: "member-2", displayName: "Bob", photoURL: null }],
      generatedAt: 100,
    });
    await (
      store.dispatch as typeof store.dispatch &
        ((action: unknown) => Promise<unknown>)
    )(fetchDailyPrayerAssignment());

    (fetchPrayerAssignment as jest.Mock).mockRejectedValueOnce(
      new Error("Network failed")
    );
    await (
      store.dispatch as typeof store.dispatch &
        ((action: unknown) => Promise<unknown>)
    )(fetchDailyPrayerAssignment());

    const state = store.getState().member;
    expect(state.hasPrayerError).toBe(true);
    expect(state.prayerAssignment).toBeNull();
    expect(state.prayerAssignmentDate).toBeNull();
    expect(state.isFallbackPrayerAssignment).toBe(false);
  });
});

/* eslint-enable unicorn/no-null */
