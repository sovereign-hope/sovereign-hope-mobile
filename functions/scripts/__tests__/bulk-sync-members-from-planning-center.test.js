jest.mock(
  "firebase-admin",
  () => ({
    apps: [],
    credential: {
      cert: jest.fn(),
      applicationDefault: jest.fn(),
    },
    initializeApp: jest.fn(),
    auth: jest.fn(),
    firestore: jest.fn(),
  }),
  { virtual: true }
);

const {
  buildCandidatesFromList,
} = require("../bulk-sync-members-from-planning-center.cjs");

describe("bulk-sync-members-from-planning-center", () => {
  it("maps household metadata and derives household last name from the head of household", () => {
    const people = [
      {
        id: "person-1",
        type: "Person",
        attributes: {
          name: "Sam Coe",
          first_name: "Sam",
          last_name: "Coe",
          avatar: "https://example.com/sam.jpg",
        },
        links: {
          self: "https://api.planningcenteronline.com/people/v2/people/person-1",
        },
        relationships: {
          emails: {
            data: [{ id: "email-1" }],
          },
          households: {
            data: [{ id: "household-1" }],
          },
          household_memberships: {
            data: [{ id: "membership-1" }],
          },
        },
      },
      {
        id: "person-2",
        type: "Person",
        attributes: {
          name: "Abby Coe",
          first_name: "Abby",
          last_name: "Coe",
        },
        links: {
          self: "https://api.planningcenteronline.com/people/v2/people/person-2",
        },
        relationships: {
          emails: {
            data: [{ id: "email-2" }],
          },
          households: {
            data: [{ id: "household-1" }],
          },
          household_memberships: {
            data: [{ id: "membership-2" }],
          },
        },
      },
    ];

    const includedResources = [
      {
        id: "email-1",
        type: "Email",
        attributes: {
          address: "sam@example.com",
          primary: true,
          blocked: false,
        },
      },
      {
        id: "email-2",
        type: "Email",
        attributes: {
          address: "abby@example.com",
          primary: true,
          blocked: false,
        },
      },
      {
        id: "household-1",
        type: "Household",
        attributes: {
          name: "The Coe Family",
        },
      },
      {
        id: "membership-1",
        type: "HouseholdMembership",
        attributes: {
          primary_contact: true,
        },
        relationships: {
          household: {
            data: {
              id: "household-1",
            },
          },
        },
      },
      {
        id: "membership-2",
        type: "HouseholdMembership",
        attributes: {
          primary_contact: false,
        },
        relationships: {
          household: {
            data: {
              id: "household-1",
            },
          },
        },
      },
    ];

    expect(buildCandidatesFromList(people, includedResources, 0)).toEqual([
      {
        email: "sam@example.com",
        personId: "person-1",
        displayName: "Sam Coe",
        photoURL: "https://example.com/sam.jpg",
        personApiUrl:
          "https://api.planningcenteronline.com/people/v2/people/person-1",
        firstName: "Sam",
        lastName: "Coe",
        householdId: "household-1",
        householdName: "The Coe Family",
        householdLastName: "Coe",
        isHeadOfHousehold: true,
      },
      {
        email: "abby@example.com",
        personId: "person-2",
        displayName: "Abby Coe",
        photoURL: null,
        personApiUrl:
          "https://api.planningcenteronline.com/people/v2/people/person-2",
        firstName: "Abby",
        lastName: "Coe",
        householdId: "household-1",
        householdName: "The Coe Family",
        householdLastName: "Coe",
        isHeadOfHousehold: false,
      },
    ]);
  });
});
