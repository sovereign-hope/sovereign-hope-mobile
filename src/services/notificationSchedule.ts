import * as Notifications from "expo-notifications";
import { SchedulableTriggerInputTypes } from "expo-notifications";

const parseNotificationTime = (
  time: string
): { hour: number; minute: number } => {
  let hour = Number.parseInt(time.split(":")[0] ?? "8", 10);
  const minute = Number.parseInt(time.split(":")[1]?.split(" ")[0] ?? "0", 10);
  const ampm = time.split(":")[1]?.split(" ")[1] ?? "AM";

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
