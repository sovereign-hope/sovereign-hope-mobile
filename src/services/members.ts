/* eslint-disable unicorn/no-null */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  getFirebaseFirestore,
  getFirebaseFunctions,
} from "src/config/firebase";

export interface MemberProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: number;
  firstName?: string | null;
  lastName?: string | null;
  householdId?: string | null;
  householdName?: string | null;
  householdLastName?: string | null;
  isHeadOfHousehold?: boolean;
}

export interface PrayerMember {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface PrayerAssignment {
  memberIds: Array<string>;
  members: Array<PrayerMember>;
  generatedAt: number;
}

interface RequestPrayerAssignmentResponse {
  created: boolean;
  date: string;
  memberCount?: number;
}

// Keep in sync with functions/index.js MOUNTAIN_TIME_ZONE
const MOUNTAIN_TIME_ZONE = "America/Boise";

const timestampToMilliseconds = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  const maybeTimestamp = value as { toMillis?: () => number } | null;
  if (maybeTimestamp && typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis();
  }

  return Date.now();
};

const getMountainDateParts = (
  referenceDate: Date
): { year: number; month: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MOUNTAIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
};

export const getMountainTimeDate = (
  referenceDate = new Date(),
  dayOffset = 0
): string => {
  const { year, month, day } = getMountainDateParts(referenceDate);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + dayOffset);
  return utcDate.toISOString().slice(0, 10);
};

export const fetchAllMembers = async (): Promise<Array<MemberProfile>> => {
  const firestore = getFirebaseFirestore();
  const membersQuery = query(
    collection(firestore, "members"),
    orderBy("displayName", "asc")
  );
  const snapshot = await getDocs(membersQuery);

  return snapshot.docs.map((memberDoc) => {
    const data = memberDoc.data() as {
      uid?: string;
      displayName?: string;
      photoURL?: string | null;
      createdAt?: unknown;
      firstName?: string | null;
      lastName?: string | null;
      householdId?: string | null;
      householdName?: string | null;
      householdLastName?: string | null;
      isHeadOfHousehold?: boolean;
    };

    return {
      uid: data.uid ?? memberDoc.id,
      displayName: data.displayName ?? "Church member",
      photoURL: data.photoURL ?? null,
      createdAt: timestampToMilliseconds(data.createdAt),
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      householdId: data.householdId ?? null,
      householdName: data.householdName ?? null,
      householdLastName: data.householdLastName ?? null,
      isHeadOfHousehold: data.isHeadOfHousehold ?? false,
    };
  });
};

export const fetchPrayerAssignment = async (
  uid: string,
  date: string
): Promise<PrayerAssignment | null> => {
  const firestore = getFirebaseFirestore();
  const assignmentRef = doc(
    firestore,
    "prayerAssignments",
    date,
    "assignments",
    uid
  );
  const assignmentDoc = await getDoc(assignmentRef);

  if (!assignmentDoc.exists()) {
    return null;
  }

  const data = assignmentDoc.data() as {
    memberIds?: Array<string>;
    members?: Array<{
      uid?: string;
      displayName?: string;
      photoURL?: string | null;
    }>;
    generatedAt?: unknown;
  };

  const fallbackMembers = (data.memberIds ?? []).map((memberId) => ({
    uid: memberId,
    displayName: "Church member",
    photoURL: null,
  }));

  return {
    memberIds: data.memberIds ?? [],
    members:
      data.members?.map((member) => ({
        uid: member.uid ?? "",
        displayName: member.displayName ?? "Church member",
        photoURL: member.photoURL ?? null,
      })) ?? fallbackMembers,
    generatedAt: timestampToMilliseconds(data.generatedAt),
  };
};

export const getYesterdayMountainTimeDate = (
  referenceDate = new Date()
): string => getMountainTimeDate(referenceDate, -1);

export const requestDailyPrayerAssignment =
  async (): Promise<RequestPrayerAssignmentResponse> => {
    const firebaseFunctions = getFirebaseFunctions();
    const requestAssignment = httpsCallable<
      Record<string, never>,
      RequestPrayerAssignmentResponse
    >(firebaseFunctions, "requestDailyPrayerAssignment");
    const result = await requestAssignment({});
    return result.data;
  };

/* eslint-enable unicorn/no-null */
