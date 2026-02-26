import type { RootState } from "src/app/store";
import type { ReadingPlanProgressState } from "src/redux/readingPlanSlice";
import {
  SyncSettingsField,
  SyncSettingsShape,
  markDismissedNotificationsUpdated,
  markSettingsFieldUpdated,
  syncRemoteDismissedNotificationsWrite,
  syncRemoteReadingPlanProgressWrite,
  syncRemoteSettingsFieldWrite,
} from "src/services/sync";

export const writeThroughSettingsField = async <T extends SyncSettingsField>(
  field: T,
  value: SyncSettingsShape[T]
): Promise<void> => {
  const updatedAt = Date.now();
  await markSettingsFieldUpdated(field, updatedAt);
  await syncRemoteSettingsFieldWrite(field, value, updatedAt);
};

export const writeThroughDismissedNotifications = async (
  dismissedNotificationIDs: Array<string>
): Promise<void> => {
  const updatedAt = Date.now();
  await markDismissedNotificationsUpdated(updatedAt);
  await syncRemoteDismissedNotificationsWrite(
    dismissedNotificationIDs,
    updatedAt
  );
};

export const writeThroughReadingPlanProgress = async (
  state: RootState,
  readingPlanState: ReadingPlanProgressState
): Promise<void> => {
  const currentYear = new Date().getFullYear();
  const subscribedPlans =
    currentYear > 2024
      ? state.settings.subscribedPlans
      : [currentYear.toString()];
  const subscribedPlan = subscribedPlans[0];
  if (!subscribedPlan) {
    return;
  }
  await syncRemoteReadingPlanProgressWrite(
    subscribedPlan,
    readingPlanState.weeks
  );
};
