import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

const MEMORY_AUDIO_NOTIFICATION_ID_KEY = "@memoryAudio/reviewNotificationId";
const DEFAULT_NOTIFICATION_HOUR = 8;
const DEFAULT_NOTIFICATION_MINUTE = 0;

const toNumberInRange = (
  value: string,
  min: number,
  max: number
): number | undefined => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    return undefined;
  }
  return parsed;
};

const parseNotificationTime = (
  time: string
): { hour: number; minute: number } => {
  const match = /^(\d{1,2}):(\d{2})\s?(am|pm)$/i.exec(time.trim());
  if (!match) {
    return {
      hour: DEFAULT_NOTIFICATION_HOUR,
      minute: DEFAULT_NOTIFICATION_MINUTE,
    };
  }

  const hourToken = toNumberInRange(match[1], 1, 12);
  const minuteToken = toNumberInRange(match[2], 0, 59);
  if (hourToken === undefined || minuteToken === undefined) {
    return {
      hour: DEFAULT_NOTIFICATION_HOUR,
      minute: DEFAULT_NOTIFICATION_MINUTE,
    };
  }

  let hour = hourToken;
  const minute = minuteToken;
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hour !== 12) {
    hour += 12;
  }

  if (ampm === "AM" && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
};

const parseIsoDate = (
  value: string
): { year: number; month: number; day: number } | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const year = toNumberInRange(match[1], 1970, 9999);
  const month = toNumberInRange(match[2], 1, 12);
  const day = toNumberInRange(match[3], 1, 31);
  if (year === undefined || month === undefined || day === undefined) {
    return undefined;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return { year, month, day };
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

export const scheduleMemoryAudioReviewNotification = async (args: {
  verseReference: string;
  nextReviewDate: string;
  notificationTime: string;
  enableNotifications: boolean;
}): Promise<void> => {
  const existingNotificationId = await AsyncStorage.getItem(
    MEMORY_AUDIO_NOTIFICATION_ID_KEY
  );
  if (existingNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(
      existingNotificationId
    );
  }

  if (!args.enableNotifications) {
    await AsyncStorage.removeItem(MEMORY_AUDIO_NOTIFICATION_ID_KEY);
    return;
  }

  const nextReviewDate = parseIsoDate(args.nextReviewDate);
  if (!nextReviewDate) {
    await AsyncStorage.removeItem(MEMORY_AUDIO_NOTIFICATION_ID_KEY);
    return;
  }

  const { hour, minute } = parseNotificationTime(args.notificationTime);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to practice your memory verse: ${args.verseReference}`,
      subtitle: "Tap to continue your memory verse audio practice.",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      year: nextReviewDate.year,
      month: nextReviewDate.month,
      day: nextReviewDate.day,
      hour,
      minute,
      repeats: false,
    },
  });

  await AsyncStorage.setItem(MEMORY_AUDIO_NOTIFICATION_ID_KEY, notificationId);
};
