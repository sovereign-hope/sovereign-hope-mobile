/* eslint-disable unicorn/no-null */
import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "src/redux/authSlice";
import {
  fetchDailyPrayerAssignment,
  fetchMemberDirectory,
  memberReducer,
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
