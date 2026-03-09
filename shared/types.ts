// Canonical type definitions shared between mobile app and admin dashboard.
// Mobile app types in src/redux/readingPlanSlice.ts and src/services/members.ts
// should eventually import from here.

export interface ReadingPlanDay {
  reading: Array<string>;
  memory: {
    passage: string;
    heading: string;
  };
}

export interface ReadingPlanWeek {
  days: Array<ReadingPlanDay>;
}

export interface ReadingPlan {
  id: string;
  weeks: Array<ReadingPlanWeek>;
  title: string;
  description: string;
}

export interface ReadingPlanProgressState {
  weeks: Array<{
    days: Array<{
      isCompleted: boolean;
    }>;
  }>;
}

export interface MemberProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: number;
  email?: string | null;
  planningCenterPersonId?: string | null;
}

export interface FirebaseUserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  customClaims: {
    isMember?: boolean;
    isAdmin?: boolean;
    admin?: boolean;
  } | null;
}
