/* eslint-disable unicorn/no-null */
import { getDoc, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  fetchAllMembers,
  fetchPrayerAssignment,
  getMountainTimeDate,
  getYesterdayMountainTimeDate,
  requestDailyPrayerAssignment,
} from "src/services/members";

jest.mock("src/config/firebase", () => ({
  getFirebaseFirestore: jest.fn(() => ({})),
  getFirebaseFunctions: jest.fn(() => ({})),
}));

describe("members service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("formats Mountain Time date strings", () => {
    const referenceDate = new Date("2026-02-27T18:00:00.000Z");
    expect(getMountainTimeDate(referenceDate)).toBe("2026-02-27");
    expect(getMountainTimeDate(referenceDate, -1)).toBe("2026-02-26");
    expect(getYesterdayMountainTimeDate(referenceDate)).toBe("2026-02-26");
  });

  it("maps all members from Firestore documents", async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [
        {
          id: "member-1",
          data: () => ({
            displayName: "Alice",
            photoURL: null,
            createdAt: { toMillis: () => 111 },
            firstName: "Alice",
            lastName: "Anderson",
            householdId: "household-1",
            householdName: "The Anderson Family",
            householdLastName: "Anderson",
            isHeadOfHousehold: true,
          }),
        },
        {
          id: "member-2",
          data: () => ({
            uid: "member-2",
            displayName: "Bob",
            photoURL: "https://example.com/bob.jpg",
            createdAt: { toMillis: () => 222 },
            firstName: "Bob",
            lastName: "Baker",
            householdId: null,
            householdName: null,
            householdLastName: null,
            isHeadOfHousehold: false,
          }),
        },
      ],
    });

    const result = await fetchAllMembers();

    expect(result).toEqual([
      {
        uid: "member-1",
        displayName: "Alice",
        photoURL: null,
        createdAt: 111,
        firstName: "Alice",
        lastName: "Anderson",
        householdId: "household-1",
        householdName: "The Anderson Family",
        householdLastName: "Anderson",
        isHeadOfHousehold: true,
      },
      {
        uid: "member-2",
        displayName: "Bob",
        photoURL: "https://example.com/bob.jpg",
        createdAt: 222,
        firstName: "Bob",
        lastName: "Baker",
        householdId: null,
        householdName: null,
        householdLastName: null,
        isHeadOfHousehold: false,
      },
    ]);
  });

  it("returns null when prayer assignment document is missing", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => false,
    });

    const result = await fetchPrayerAssignment("member-1", "2026-02-27");

    expect(result).toBeNull();
  });

  it("maps prayer assignment and falls back to memberIds when denormalized members missing", async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        memberIds: ["member-2", "member-3"],
        generatedAt: { toMillis: () => 333 },
      }),
    });

    const result = await fetchPrayerAssignment("member-1", "2026-02-27");

    expect(result).toEqual({
      memberIds: ["member-2", "member-3"],
      members: [
        { uid: "member-2", displayName: "Church member", photoURL: null },
        { uid: "member-3", displayName: "Church member", photoURL: null },
      ],
      generatedAt: 333,
    });
  });

  it("requests today's assignment via callable function", async () => {
    const callableMock = jest.fn().mockResolvedValueOnce({
      data: { created: true, date: "2026-02-27", memberCount: 3 },
    });
    (httpsCallable as jest.Mock).mockReturnValueOnce(callableMock);

    const result = await requestDailyPrayerAssignment();

    expect(httpsCallable).toHaveBeenCalledTimes(1);
    expect(callableMock).toHaveBeenCalledWith({});
    expect(result).toEqual({
      created: true,
      date: "2026-02-27",
      memberCount: 3,
    });
  });
});

/* eslint-enable unicorn/no-null */
