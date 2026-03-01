import { applyNotificationSchedule } from "src/services/notificationSchedule";
import * as Notifications from "expo-notifications";

const getScheduledTime = (): { hour: number; minute: number } => {
  const scheduleMock = Notifications.scheduleNotificationAsync as unknown as {
    mock: { calls: Array<[unknown]> };
  };
  const maybePayload = scheduleMock.mock.calls[0]?.[0] as
    | { trigger?: unknown }
    | undefined;
  const trigger = maybePayload?.trigger as
    | { hour?: number; minute?: number }
    | undefined;

  return {
    hour: trigger?.hour ?? Number.NaN,
    minute: trigger?.minute ?? Number.NaN,
  };
};

describe("notificationSchedule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("schedules notifications for valid 12-hour times", async () => {
    await applyNotificationSchedule(true, "9:30 PM");

    expect(
      Notifications.cancelAllScheduledNotificationsAsync
    ).toHaveBeenCalledTimes(1);
    expect(getScheduledTime()).toEqual({ hour: 21, minute: 30 });
  });

  it("accepts lowercase am/pm values", async () => {
    await applyNotificationSchedule(true, "12:05 am");

    expect(getScheduledTime()).toEqual({ hour: 0, minute: 5 });
  });

  it("falls back to default time for malformed inputs", async () => {
    await applyNotificationSchedule(true, "99:99 PM");

    expect(getScheduledTime()).toEqual({ hour: 8, minute: 0 });
  });

  it("cancels notifications when disabled", async () => {
    await applyNotificationSchedule(false, "9:30 PM");

    expect(
      Notifications.cancelAllScheduledNotificationsAsync
    ).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
