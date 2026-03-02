import AsyncStorage from "@react-native-async-storage/async-storage";
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

  const dateParts = args.nextReviewDate.split("-");
  if (dateParts.length < 3) {
    return;
  }
  const [yearString, monthString, dayString] = dateParts;
  const { hour, minute } = parseNotificationTime(args.notificationTime);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to practice your memory verse: ${args.verseReference}`,
      subtitle: "Tap to continue your memory verse audio practice.",
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      year: Number.parseInt(yearString, 10),
      month: Number.parseInt(monthString, 10),
      day: Number.parseInt(dayString, 10),
      hour,
      minute,
      repeats: false,
    },
  });

  await AsyncStorage.setItem(MEMORY_AUDIO_NOTIFICATION_ID_KEY, notificationId);
};
