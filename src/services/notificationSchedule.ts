import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

const DEFAULT_NOTIFICATION_HOUR = 8;
const DEFAULT_NOTIFICATION_MINUTE = 0;

const parseNotificationTime = (
  time: string
): { hour: number; minute: number } => {
  const match = time.trim().match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)$/iu);
  if (!match) {
    return {
      hour: DEFAULT_NOTIFICATION_HOUR,
      minute: DEFAULT_NOTIFICATION_MINUTE,
    };
  }

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  const isHourOutOfBounds = hour < 1 || hour > 12;
  const isMinuteOutOfBounds = minute < 0 || minute > 59;
  if (isHourOutOfBounds || isMinuteOutOfBounds) {
    return {
      hour: DEFAULT_NOTIFICATION_HOUR,
      minute: DEFAULT_NOTIFICATION_MINUTE,
    };
  }

  if (ampm === "PM" && hour !== 12) {
    hour += 12;
  }

  if (ampm === "AM" && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
};

export const applyNotificationSchedule = async (
  enableNotifications: boolean,
  notificationTime: string
): Promise<void> => {
  if (!enableNotifications) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  const { hour, minute } = parseNotificationTime(notificationTime);

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Read now to stay on track with your Bible reading plan!",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      repeats: true,
      hour,
      minute,
    },
  });
};
