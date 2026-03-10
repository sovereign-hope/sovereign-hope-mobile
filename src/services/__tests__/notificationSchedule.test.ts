import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  applyNotificationSchedule,
  scheduleMemoryAudioReviewNotification,
} from "src/services/notificationSchedule";

describe("notificationSchedule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      Notifications.cancelAllScheduledNotificationsAsync as jest.Mock
    ).mockImplementation(async () => {});
    (
      Notifications.cancelScheduledNotificationAsync as jest.Mock
    ).mockImplementation(async () => {});
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
      "new-notification-id"
    );
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("");
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(async () => {});
    (AsyncStorage.setItem as jest.Mock).mockImplementation(async () => {});
  });

  it("falls back to 8:00 AM when notification time is malformed", async () => {
    await applyNotificationSchedule(true, "not-a-time");

    const firstCall = (Notifications.scheduleNotificationAsync as jest.Mock)
      .mock.calls[0] as [{ trigger: { hour: number; minute: number } }];
    expect(firstCall[0].trigger.hour).toBe(8);
    expect(firstCall[0].trigger.minute).toBe(0);
  });

  it("parses valid 12-hour notification time", async () => {
    await applyNotificationSchedule(true, "12:45 PM");

    const firstCall = (Notifications.scheduleNotificationAsync as jest.Mock)
      .mock.calls[0] as [{ trigger: { hour: number; minute: number } }];
    expect(firstCall[0].trigger.hour).toBe(12);
    expect(firstCall[0].trigger.minute).toBe(45);
  });

  it("removes stale review notification id when next review date is invalid", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("stale-id");

    await scheduleMemoryAudioReviewNotification({
      verseReference: "John 3:16",
      nextReviewDate: "2026-13-40",
      notificationTime: "9:00 AM",
      enableNotifications: true,
    });

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "stale-id"
    );
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "@memoryAudio/reviewNotificationId"
    );
  });

  it("schedules review notification with fallback time when saved time is invalid", async () => {
    await scheduleMemoryAudioReviewNotification({
      verseReference: "Psalm 119:105",
      nextReviewDate: "2026-04-15",
      notificationTime: "??",
      enableNotifications: true,
    });

    const firstCall = (Notifications.scheduleNotificationAsync as jest.Mock)
      .mock.calls[0] as [
      {
        trigger: {
          year: number;
          month: number;
          day: number;
          hour: number;
          minute: number;
          repeats: boolean;
        };
      }
    ];
    expect(firstCall[0].trigger.year).toBe(2026);
    expect(firstCall[0].trigger.month).toBe(4);
    expect(firstCall[0].trigger.day).toBe(15);
    expect(firstCall[0].trigger.hour).toBe(8);
    expect(firstCall[0].trigger.minute).toBe(0);
    expect(firstCall[0].trigger.repeats).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@memoryAudio/reviewNotificationId",
      "new-notification-id"
    );
  });
});
