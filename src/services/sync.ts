/* eslint-disable unicorn/no-null, @typescript-eslint/no-use-before-define, @typescript-eslint/no-unnecessary-type-assertion */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseError } from "firebase/app";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "src/config/firebase";
import { applyNotificationSchedule } from "src/services/notificationSchedule";

export interface SyncSettingsShape {
  enableNotifications: boolean;
  notificationTime: string;
  readingFontSize: number;
  readingBackgroundColor: string | null;
  showChildrensPlan: boolean;
  enableChurchCenterDeepLink: boolean;
  subscribedPlans: Array<string>;
}

export type SyncSettingsField = keyof SyncSettingsShape;

type SyncSettingsFieldValue<T extends SyncSettingsField = SyncSettingsField> = {
  value: SyncSettingsShape[T];
  updatedAt: number;
};

type RemoteSettingsDoc = {
  [K in SyncSettingsField]?: SyncSettingsFieldValue<K>;
};

interface RemoteUserDoc {
  createdAt?: Timestamp;
  displayName?: string | null;
  email?: string | null;
  lastSyncTimestamp?: Timestamp;
  migrationVersion?: number;
  settings?: RemoteSettingsDoc;
  dismissedNotifications?: {
    ids: Array<string>;
    updatedAt: number;
  };
}

interface RemoteProgressDoc {
  weeks: Array<{
    days: Array<{
      isCompleted: boolean;
    }>;
  }>;
  lastUpdated?: Timestamp;
}

export interface LocalProgressDoc {
  planId: string;
  weeks: Array<{
    days: Array<{
      isCompleted: boolean;
    }>;
  }>;
}

interface LocalSnapshot {
  settings: SyncSettingsShape;
  settingsUpdatedAt: Record<SyncSettingsField, number>;
  dismissedNotificationIDs: Array<string>;
  dismissedNotificationsUpdatedAt: number;
  progressDocs: Array<LocalProgressDoc>;
}

interface RemoteSnapshot {
  userDoc: RemoteUserDoc | null;
  progressDocs: Array<LocalProgressDoc>;
}

const STORAGE_KEYS = {
  settingsMeta: "@sync/settingsUpdatedAt",
  dismissedNotificationsUpdatedAt: "@sync/dismissedNotificationsUpdatedAt",
  pendingPush: "@sync/pendingPush",
} as const;

const SETTINGS_STORAGE_KEYS: Record<SyncSettingsField, string> = {
  enableNotifications: "@settings/enableNotifications",
  notificationTime: "@settings/notificationTime",
  readingFontSize: "@settings/readingFontSize",
  readingBackgroundColor: "@settings/readingBackgroundColor",
  showChildrensPlan: "@settings/showChildrensPlan",
  enableChurchCenterDeepLink: "@settings/enableChurchCenterDeepLink",
  subscribedPlans: "@settings/subscribedPlans",
};

const DEFAULT_SETTINGS: SyncSettingsShape = {
  enableNotifications: true,
  notificationTime: "8:00 AM",
  readingFontSize: 13,
  readingBackgroundColor: null,
  showChildrensPlan: true,
  enableChurchCenterDeepLink: false,
  subscribedPlans: [],
};

let activeSyncPromise: Promise<boolean> | null = null;

export const getSyncSettingsFieldStorageKey = (
  field: SyncSettingsField
): string => SETTINGS_STORAGE_KEYS[field];

export const markSettingsFieldUpdated = async (
  field: SyncSettingsField,
  updatedAt: number = Date.now()
): Promise<void> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.settingsMeta);
  const current = parseJson<Record<string, number>>(raw) ?? {};
  current[field] = updatedAt;
  await AsyncStorage.setItem(
    STORAGE_KEYS.settingsMeta,
    JSON.stringify(current)
  );
};

export const markDismissedNotificationsUpdated = async (
  updatedAt: number = Date.now()
): Promise<void> => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.dismissedNotificationsUpdatedAt,
    updatedAt.toString()
  );
};

export const queuePendingSyncRetry = async (): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.pendingPush, "true");
};

export const clearPendingSyncRetry = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEYS.pendingPush);
};

export const syncRemoteSettingsFieldWrite = async <T extends SyncSettingsField>(
  field: T,
  value: SyncSettingsShape[T],
  updatedAt: number = Date.now()
): Promise<void> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return;
  }

  try {
    await setDoc(
      doc(getFirebaseFirestore(), "users", user.uid),
      {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        settings: {
          [field]: {
            value,
            updatedAt,
          },
        },
        migrationVersion: 1,
        lastSyncTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
    await clearPendingSyncRetry();
  } catch (error) {
    console.warn("Failed to sync settings field", field, error);
    await queuePendingSyncRetry();
  }
};

export const syncRemoteDismissedNotificationsWrite = async (
  dismissedNotificationIDs: Array<string>,
  updatedAt: number = Date.now()
): Promise<void> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return;
  }

  try {
    await setDoc(
      doc(getFirebaseFirestore(), "users", user.uid),
      {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        dismissedNotifications: {
          ids: dedupeStrings(dismissedNotificationIDs),
          updatedAt,
        },
        migrationVersion: 1,
        lastSyncTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
    await clearPendingSyncRetry();
  } catch (error) {
    console.warn("Failed to sync dismissed notifications", error);
    await queuePendingSyncRetry();
  }
};

export const syncRemoteReadingPlanProgressWrite = async (
  planId: string,
  progressDoc: LocalProgressDoc["weeks"]
): Promise<void> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return;
  }

  try {
    await setDoc(
      doc(getFirebaseFirestore(), "users", user.uid, "progress", planId),
      {
        weeks: progressDoc,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    await setDoc(
      doc(getFirebaseFirestore(), "users", user.uid),
      {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        migrationVersion: 1,
        lastSyncTimestamp: serverTimestamp(),
      },
      { merge: true }
    );
    await clearPendingSyncRetry();
  } catch (error) {
    console.warn("Failed to sync reading progress", planId, error);
    await queuePendingSyncRetry();
  }
};

export const runFullSyncCycle = async (): Promise<boolean> => {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      return false;
    }

    const localSnapshot = await readLocalSnapshot();
    const remoteSnapshot = await readRemoteSnapshot(user.uid);
    const mergedSnapshot = mergeLocalAndRemote(localSnapshot, remoteSnapshot);

    await writeMergedLocalSnapshot(mergedSnapshot);
    await pushMergedSnapshotToRemote(
      user.uid,
      user.email,
      user.displayName,
      mergedSnapshot
    );

    await clearPendingSyncRetry();
    return true;
  })()
    .catch(async (error) => {
      const code = (error as FirebaseError)?.code;
      if (code !== "permission-denied") {
        console.warn("Sync cycle failed", error);
      }
      await queuePendingSyncRetry();
      return false;
    })
    .finally(() => {
      activeSyncPromise = null;
    });

  return activeSyncPromise;
};

export const clearLocalSyncedData = async (): Promise<void> => {
  const allKeys = await AsyncStorage.getAllKeys();
  const readingPlanProgressKeys = allKeys.filter((key) =>
    key.startsWith("@readingPlanState")
  );
  const keysToClear = [
    ...Object.values(SETTINGS_STORAGE_KEYS),
    "@dismissedNotifications",
    STORAGE_KEYS.settingsMeta,
    STORAGE_KEYS.dismissedNotificationsUpdatedAt,
    STORAGE_KEYS.pendingPush,
    ...readingPlanProgressKeys,
  ];
  if (keysToClear.length > 0) {
    await AsyncStorage.multiRemove(dedupeStrings(keysToClear));
  }
};

export const deleteRemoteUserData = async (uid: string): Promise<void> => {
  const db = getFirebaseFirestore();
  const progressCollectionRef = collection(db, "users", uid, "progress");
  const progressSnapshot = await getDocs(progressCollectionRef);

  if (!progressSnapshot.empty) {
    const batch = writeBatch(db);
    progressSnapshot.docs.forEach((progressDoc) => {
      batch.delete(progressDoc.ref);
    });
    await batch.commit();
  }

  await deleteDoc(doc(db, "users", uid));
};

const readRemoteSnapshot = async (uid: string): Promise<RemoteSnapshot> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  const progressCollectionRef = collection(db, "users", uid, "progress");
  const progressSnapshot = await getDocs(progressCollectionRef);
  const progressDocs: Array<LocalProgressDoc> = progressSnapshot.docs
    .map((progressDoc) => ({
      planId: progressDoc.id,
      weeks: (progressDoc.data() as RemoteProgressDoc).weeks ?? [],
    }))
    .filter((progressDoc) => Array.isArray(progressDoc.weeks));

  return {
    userDoc: userSnap.exists() ? (userSnap.data() as RemoteUserDoc) : null,
    progressDocs,
  };
};

const pushMergedSnapshotToRemote = async (
  uid: string,
  email: string | null,
  displayName: string | null,
  snapshot: LocalSnapshot
): Promise<void> => {
  const db = getFirebaseFirestore();
  const userRef = doc(db, "users", uid);

  const remoteSettingsPayload: Record<
    string,
    { value: unknown; updatedAt: number }
  > = {};
  (Object.keys(snapshot.settings) as Array<SyncSettingsField>).forEach(
    (field) => {
      remoteSettingsPayload[field] = {
        value: snapshot.settings[field],
        updatedAt: snapshot.settingsUpdatedAt[field] ?? Date.now(),
      };
    }
  );

  await setDoc(
    userRef,
    {
      createdAt: serverTimestamp(),
      email: email ?? null,
      displayName: displayName ?? null,
      migrationVersion: 1,
      settings: remoteSettingsPayload,
      dismissedNotifications: {
        ids: dedupeStrings(snapshot.dismissedNotificationIDs),
        updatedAt: snapshot.dismissedNotificationsUpdatedAt,
      },
      lastSyncTimestamp: serverTimestamp(),
    },
    { merge: true }
  );

  for (const progressDoc of snapshot.progressDocs) {
    await setDoc(
      doc(db, "users", uid, "progress", progressDoc.planId),
      {
        weeks: progressDoc.weeks,
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
  }
};

const writeMergedLocalSnapshot = async (
  snapshot: LocalSnapshot
): Promise<void> => {
  const settingsWrites: Array<[string, string]> = [];

  (Object.keys(snapshot.settings) as Array<SyncSettingsField>).forEach(
    (field) => {
      const key = SETTINGS_STORAGE_KEYS[field];
      const value = snapshot.settings[field];
      if (field === "subscribedPlans") {
        settingsWrites.push([key, (value as Array<string>).join(",")]);
        return;
      }
      if (field === "readingBackgroundColor") {
        if (value === null) {
          return;
        }
        settingsWrites.push([key, String(value)]);
        return;
      }
      if (typeof value === "boolean") {
        settingsWrites.push([key, value.toString()]);
        return;
      }
      settingsWrites.push([key, String(value)]);
    }
  );

  if (settingsWrites.length > 0) {
    await AsyncStorage.multiSet(settingsWrites);
  }
  if (snapshot.settings.readingBackgroundColor === null) {
    await AsyncStorage.removeItem(SETTINGS_STORAGE_KEYS.readingBackgroundColor);
  }

  await AsyncStorage.setItem(
    STORAGE_KEYS.settingsMeta,
    JSON.stringify(snapshot.settingsUpdatedAt)
  );
  await AsyncStorage.setItem(
    "@dismissedNotifications",
    JSON.stringify(dedupeStrings(snapshot.dismissedNotificationIDs))
  );
  await AsyncStorage.setItem(
    STORAGE_KEYS.dismissedNotificationsUpdatedAt,
    snapshot.dismissedNotificationsUpdatedAt.toString()
  );

  for (const progressDoc of snapshot.progressDocs) {
    await AsyncStorage.setItem(
      `@readingPlanState${progressDoc.planId}`,
      JSON.stringify({ weeks: progressDoc.weeks })
    );
  }

  await applyNotificationSchedule(
    snapshot.settings.enableNotifications,
    snapshot.settings.notificationTime
  );
};

const mergeLocalAndRemote = (
  localSnapshot: LocalSnapshot,
  remoteSnapshot: RemoteSnapshot
): LocalSnapshot => {
  const remoteUserDoc = remoteSnapshot.userDoc;
  const remoteSettings = remoteUserDoc?.settings ?? {};

  const mergedSettings: SyncSettingsShape = { ...localSnapshot.settings };
  const mergedSettingsUpdatedAt: Record<SyncSettingsField, number> = {
    ...localSnapshot.settingsUpdatedAt,
  };
  const mergedSettingsRecord = mergedSettings as Record<
    SyncSettingsField,
    SyncSettingsShape[SyncSettingsField]
  >;

  (Object.keys(DEFAULT_SETTINGS) as Array<SyncSettingsField>).forEach(
    (field) => {
      const localValue = localSnapshot.settings[field];
      const localUpdatedAt = localSnapshot.settingsUpdatedAt[field] ?? 0;
      const remoteField = remoteSettings[field] as
        | SyncSettingsFieldValue
        | undefined;
      const remoteUpdatedAt = remoteField?.updatedAt ?? 0;

      if (remoteUpdatedAt > localUpdatedAt && remoteField) {
        mergedSettingsRecord[field] =
          remoteField.value as SyncSettingsShape[typeof field];
        mergedSettingsUpdatedAt[field] = remoteUpdatedAt;
        return;
      }

      mergedSettingsRecord[field] =
        localValue as SyncSettingsShape[typeof field];
      mergedSettingsUpdatedAt[field] =
        localUpdatedAt ||
        remoteUpdatedAt ||
        ensureDefaultUpdatedAt(localUpdatedAt);
    }
  );

  const remoteDismissed = remoteUserDoc?.dismissedNotifications?.ids ?? [];
  const localDismissed = localSnapshot.dismissedNotificationIDs ?? [];
  const mergedDismissed = dedupeStrings([
    ...localDismissed,
    ...remoteDismissed,
  ]);
  const mergedDismissedUpdatedAt = Math.max(
    localSnapshot.dismissedNotificationsUpdatedAt,
    remoteUserDoc?.dismissedNotifications?.updatedAt ?? 0,
    Date.now()
  );

  const progressMap = new Map<string, LocalProgressDoc>();
  for (const localProgressDoc of localSnapshot.progressDocs) {
    progressMap.set(localProgressDoc.planId, localProgressDoc);
  }

  for (const remoteProgressDoc of remoteSnapshot.progressDocs) {
    const localProgressDoc = progressMap.get(remoteProgressDoc.planId);
    if (!localProgressDoc) {
      progressMap.set(remoteProgressDoc.planId, remoteProgressDoc);
      continue;
    }

    progressMap.set(remoteProgressDoc.planId, {
      planId: remoteProgressDoc.planId,
      weeks: unionMergeReadingProgress(
        localProgressDoc.weeks,
        remoteProgressDoc.weeks
      ),
    });
  }

  return {
    settings: mergedSettings,
    settingsUpdatedAt: mergedSettingsUpdatedAt,
    dismissedNotificationIDs: mergedDismissed,
    dismissedNotificationsUpdatedAt: mergedDismissedUpdatedAt,
    progressDocs: [...progressMap.values()],
  };
};

const unionMergeReadingProgress = (
  localWeeks: LocalProgressDoc["weeks"],
  remoteWeeks: LocalProgressDoc["weeks"]
): LocalProgressDoc["weeks"] => {
  const weekCount = Math.max(localWeeks.length, remoteWeeks.length);
  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const localWeek = localWeeks[weekIndex];
    const remoteWeek = remoteWeeks[weekIndex];
    const dayCount = Math.max(
      localWeek?.days.length ?? 0,
      remoteWeek?.days.length ?? 0
    );

    return {
      days: Array.from({ length: dayCount }, (_, dayIndex) => ({
        isCompleted:
          Boolean(localWeek?.days[dayIndex]?.isCompleted) ||
          Boolean(remoteWeek?.days[dayIndex]?.isCompleted),
      })),
    };
  });
};

const readLocalSnapshot = async (): Promise<LocalSnapshot> => {
  const allKeys = await AsyncStorage.getAllKeys();
  const readingPlanProgressKeys = allKeys.filter((key) =>
    key.startsWith("@readingPlanState")
  );
  const rawSettingsMeta = await AsyncStorage.getItem(STORAGE_KEYS.settingsMeta);
  const settingsMetaRaw =
    parseJson<Record<string, number>>(rawSettingsMeta) ??
    ({} as Record<string, number>);
  const rawDismissedNotificationsUpdatedAt = await AsyncStorage.getItem(
    STORAGE_KEYS.dismissedNotificationsUpdatedAt
  );
  const dismissedNotificationsUpdatedAt = Number.parseInt(
    rawDismissedNotificationsUpdatedAt ?? "0",
    10
  );

  const settings = await readLocalSettings();
  const progressKeyValuePairs =
    readingPlanProgressKeys.length > 0
      ? await AsyncStorage.multiGet(readingPlanProgressKeys)
      : [];
  const progressDocs: Array<LocalProgressDoc> = progressKeyValuePairs
    .map(([key, rawValue]) => {
      const planId = key.replace("@readingPlanState", "");
      const parsed = parseJson<{ weeks?: LocalProgressDoc["weeks"] }>(rawValue);
      return {
        planId,
        weeks: parsed?.weeks ?? [],
      };
    })
    .filter((doc_) => doc_.planId.length > 0);

  const dismissedNotificationIDs = parseJson<Array<string>>(
    await AsyncStorage.getItem("@dismissedNotifications")
  );

  return {
    settings,
    settingsUpdatedAt: {
      enableNotifications: settingsMetaRaw.enableNotifications ?? 0,
      notificationTime: settingsMetaRaw.notificationTime ?? 0,
      readingFontSize: settingsMetaRaw.readingFontSize ?? 0,
      readingBackgroundColor: settingsMetaRaw.readingBackgroundColor ?? 0,
      showChildrensPlan: settingsMetaRaw.showChildrensPlan ?? 0,
      enableChurchCenterDeepLink:
        settingsMetaRaw.enableChurchCenterDeepLink ?? 0,
      subscribedPlans: settingsMetaRaw.subscribedPlans ?? 0,
    },
    dismissedNotificationIDs: dedupeStrings(dismissedNotificationIDs ?? []),
    dismissedNotificationsUpdatedAt:
      Number.isNaN(dismissedNotificationsUpdatedAt) ||
      dismissedNotificationsUpdatedAt <= 0
        ? 0
        : dismissedNotificationsUpdatedAt,
    progressDocs,
  };
};

const readLocalSettings = async (): Promise<SyncSettingsShape> => {
  const [
    enableNotifications,
    notificationTime,
    readingFontSize,
    readingBackgroundColor,
    showChildrensPlan,
    enableChurchCenterDeepLink,
    subscribedPlans,
  ] = await AsyncStorage.multiGet([
    SETTINGS_STORAGE_KEYS.enableNotifications,
    SETTINGS_STORAGE_KEYS.notificationTime,
    SETTINGS_STORAGE_KEYS.readingFontSize,
    SETTINGS_STORAGE_KEYS.readingBackgroundColor,
    SETTINGS_STORAGE_KEYS.showChildrensPlan,
    SETTINGS_STORAGE_KEYS.enableChurchCenterDeepLink,
    SETTINGS_STORAGE_KEYS.subscribedPlans,
  ]);

  const enableNotificationsValue = parseBoolean(
    enableNotifications[1],
    DEFAULT_SETTINGS.enableNotifications
  );
  const notificationTimeValue =
    typeof notificationTime[1] === "string" && notificationTime[1]
      ? notificationTime[1]
      : DEFAULT_SETTINGS.notificationTime;
  const readingFontSizeValue = Number.parseInt(
    readingFontSize[1] ?? String(DEFAULT_SETTINGS.readingFontSize),
    10
  );
  const showChildrensPlanValue = parseBoolean(
    showChildrensPlan[1],
    DEFAULT_SETTINGS.showChildrensPlan
  );
  const enableChurchCenterDeepLinkValue = parseBoolean(
    enableChurchCenterDeepLink[1],
    DEFAULT_SETTINGS.enableChurchCenterDeepLink
  );

  return {
    enableNotifications: enableNotificationsValue,
    notificationTime: notificationTimeValue,
    readingFontSize: Number.isNaN(readingFontSizeValue)
      ? DEFAULT_SETTINGS.readingFontSize
      : readingFontSizeValue,
    readingBackgroundColor:
      readingBackgroundColor[1] && readingBackgroundColor[1].length > 0
        ? readingBackgroundColor[1]
        : null,
    showChildrensPlan: showChildrensPlanValue,
    enableChurchCenterDeepLink: enableChurchCenterDeepLinkValue,
    subscribedPlans: parseSubscribedPlans(subscribedPlans[1]),
  };
};

const parseSubscribedPlans = (value: string | null): Array<string> => {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) {
    return fallback;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "boolean" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const dedupeStrings = (values: Array<string>): Array<string> => [
  ...new Set(values.filter((value) => value.length > 0)),
];

const ensureDefaultUpdatedAt = (value: number): number =>
  value > 0 ? value : Date.now();

/* eslint-enable unicorn/no-null, @typescript-eslint/no-use-before-define, @typescript-eslint/no-unnecessary-type-assertion */
