const SERVER_TIMESTAMP = { __type: "serverTimestamp" };

let mockDb;

jest.mock(
  "firebase-admin",
  () => {
    const firestore = jest.fn(() => mockDb);
    firestore.FieldValue = {
      serverTimestamp: jest.fn(() => SERVER_TIMESTAMP),
      increment: jest.fn((value) => ({ __type: "increment", value })),
    };

    return {
      apps: [{}],
      initializeApp: jest.fn(),
      auth: jest.fn(),
      firestore,
    };
  },
  { virtual: true }
);

jest.mock(
  "firebase-functions",
  () => {
    class HttpsError extends Error {
      constructor(code, message) {
        super(message);
        this.code = code;
      }
    }

    return {
      auth: {
        user: jest.fn(() => ({
          onDelete: jest.fn((handler) => handler),
          onCreate: jest.fn((handler) => handler),
        })),
      },
      https: {
        HttpsError,
        onCall: jest.fn((handler) => handler),
      },
      pubsub: {
        schedule: jest.fn(() => ({
          timeZone: jest.fn(() => ({
            onRun: jest.fn((handler) => handler),
          })),
        })),
      },
    };
  },
  { virtual: true }
);

const functionsModule = require("../index");

function createDocSnapshot(id, data) {
  return {
    id,
    data: () => data,
  };
}

describe("prayer assignment queue helpers", () => {
  const { buildSortedMemberQueue, pickFromQueue, updatePrayerQueueBatch } =
    functionsModule.__test__;

  beforeEach(() => {
    mockDb = undefined;
  });

  it("prioritizes members with the oldest lastPrayedFor timestamps", () => {
    const members = [
      { memberId: "member-1", linkedUid: "user-1", displayName: "Alice" },
      { memberId: "member-2", linkedUid: "user-2", displayName: "Bob" },
      { memberId: "member-3", linkedUid: null, displayName: "Carol" },
    ];
    const queueState = new Map([
      [
        "member-1",
        {
          lastPrayedFor: { toMillis: () => 300 },
        },
      ],
      [
        "member-2",
        {
          lastPrayedFor: { toMillis: () => 100 },
        },
      ],
    ]);

    const sortedQueue = buildSortedMemberQueue(
      members,
      queueState,
      (values) => [values[2], values[1], values[0]]
    );

    expect(sortedQueue.map((member) => member.memberId)).toEqual([
      "member-3",
      "member-2",
      "member-1",
    ]);
  });

  it("picks queue members without assigning the user to themselves or reusing untaken members", () => {
    const sortedQueue = [
      { memberId: "member-1", linkedUid: "user-1" },
      { memberId: "member-2", linkedUid: "user-2" },
      { memberId: "member-3", linkedUid: null },
      { memberId: "member-4", linkedUid: "user-4" },
    ];
    const takenToday = new Set(["member-2"]);

    const picked = pickFromQueue(
      sortedQueue,
      takenToday,
      "user-1",
      3,
      "member-1"
    );

    expect(picked.map((member) => member.memberId)).toEqual([
      "member-3",
      "member-4",
      "member-2",
    ]);
  });

  it("aggregates repeated queue updates into a single batch write per member", () => {
    const set = jest.fn();
    const batch = { set };
    mockDb = {
      collection: jest.fn(() => ({
        doc: jest.fn((memberId) => ({ id: memberId })),
      })),
    };

    updatePrayerQueueBatch(batch, mockDb, ["member-1", "member-2", "member-1"]);

    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenNthCalledWith(
      1,
      { id: "member-1" },
      {
        memberId: "member-1",
        lastPrayedFor: SERVER_TIMESTAMP,
        assignmentCount: { __type: "increment", value: 2 },
      },
      { merge: true }
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      { id: "member-2" },
      {
        memberId: "member-2",
        lastPrayedFor: SERVER_TIMESTAMP,
        assignmentCount: { __type: "increment", value: 1 },
      },
      { merge: true }
    );
  });
});

describe("prayer assignment functions", () => {
  beforeEach(() => {
    mockDb = undefined;
    jest.clearAllMocks();
  });

  it("skips scheduled generation when the day is already marked complete", async () => {
    const getParentDoc = jest.fn().mockResolvedValue({
      data: () => ({
        generationCompletedAt: { toMillis: () => 123 },
      }),
    });

    mockDb = {
      collection: jest.fn((name) => {
        if (name !== "prayerAssignments") {
          throw new Error(`Unexpected collection lookup: ${name}`);
        }

        return {
          doc: jest.fn(() => ({
            get: getParentDoc,
          })),
        };
      }),
    };

    await expect(
      functionsModule.generateDailyPrayerAssignments()
    ).resolves.toBeNull();

    expect(getParentDoc).toHaveBeenCalledTimes(1);
    expect(mockDb.collection).toHaveBeenCalledTimes(1);
  });

  it("creates on-demand assignments from the queue while respecting members already taken today", async () => {
    const existingAssignmentGet = jest.fn().mockResolvedValue({
      exists: false,
    });
    const assignmentRef = { id: "user-1", get: existingAssignmentGet };
    const assignmentsCollectionRef = {
      doc: jest.fn(() => assignmentRef),
      get: jest.fn().mockResolvedValue({
        docs: [
          createDocSnapshot("user-2", {
            memberIds: ["member-2"],
          }),
        ],
      }),
    };
    const parentDocRef = {
      collection: jest.fn(() => assignmentsCollectionRef),
    };
    const batch = {
      set: jest.fn(),
      create: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = {
      batch: jest.fn(() => batch),
      collection: jest.fn((name) => {
        if (name === "members") {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                createDocSnapshot("member-1", {
                  displayName: "Assignee",
                  linkedUid: "user-1",
                }),
                createDocSnapshot("member-2", {
                  displayName: "Taken First",
                  linkedUid: "user-2",
                }),
                createDocSnapshot("member-3", {
                  displayName: "Fresh One",
                }),
                createDocSnapshot("member-4", {
                  displayName: "Fresh Two",
                }),
                createDocSnapshot("member-5", {
                  displayName: "Fresh Three",
                }),
              ],
            }),
          };
        }

        if (name === "prayerAssignments") {
          return {
            doc: jest.fn(() => parentDocRef),
          };
        }

        if (name === "prayerQueue") {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                createDocSnapshot("member-2", {
                  lastPrayedFor: { toMillis: () => 100 },
                  assignmentCount: 4,
                }),
                createDocSnapshot("member-3", {
                  lastPrayedFor: { toMillis: () => 200 },
                  assignmentCount: 3,
                }),
                createDocSnapshot("member-4", {
                  lastPrayedFor: { toMillis: () => 300 },
                  assignmentCount: 2,
                }),
                createDocSnapshot("member-5", {
                  lastPrayedFor: { toMillis: () => 400 },
                  assignmentCount: 1,
                }),
              ],
            }),
            doc: jest.fn((memberId) => ({ id: memberId })),
          };
        }

        throw new Error(`Unexpected collection lookup: ${name}`);
      }),
    };

    const result = await functionsModule.requestDailyPrayerAssignment(
      {},
      {
        auth: {
          uid: "user-1",
          token: {
            isMember: true,
          },
        },
      }
    );

    expect(result).toEqual({
      created: true,
      date: expect.any(String),
      memberCount: 3,
    });
    expect(batch.create).toHaveBeenCalledWith(
      assignmentRef,
      expect.objectContaining({
        memberIds: ["member-3", "member-4", "member-5"],
      })
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });
});
