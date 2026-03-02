import {
  dateToMinutesOfDay,
  isMinuteInRange,
  normalizeMinutes,
  resolveThemeColorScheme,
} from "../themeMode";

describe("themeMode", () => {
  describe("normalizeMinutes", () => {
    it("normalizes positive overflow", () => {
      expect(normalizeMinutes(1500)).toBe(60);
    });

    it("normalizes negative values", () => {
      expect(normalizeMinutes(-30)).toBe(1410);
    });
  });

  describe("isMinuteInRange", () => {
    it("handles same-day ranges", () => {
      expect(isMinuteInRange(600, 540, 1020)).toBe(true);
      expect(isMinuteInRange(520, 540, 1020)).toBe(false);
    });

    it("handles overnight ranges", () => {
      expect(isMinuteInRange(60, 1260, 420)).toBe(true);
      expect(isMinuteInRange(1000, 1260, 420)).toBe(false);
    });
  });

  describe("resolveThemeColorScheme", () => {
    it("follows system when override is disabled", () => {
      expect(
        resolveThemeColorScheme("dark", {
          overrideSystemTheme: false,
          darkModeEnabled: false,
          darkModeScheduleEnabled: false,
          darkModeScheduleStartMinutes: 1260,
          darkModeScheduleEndMinutes: 420,
        })
      ).toBe("dark");
    });

    it("uses manual dark mode when override is enabled without schedule", () => {
      expect(
        resolveThemeColorScheme("light", {
          overrideSystemTheme: true,
          darkModeEnabled: true,
          darkModeScheduleEnabled: false,
          darkModeScheduleStartMinutes: 1260,
          darkModeScheduleEndMinutes: 420,
        })
      ).toBe("dark");
    });

    it("uses schedule when enabled", () => {
      const now = new Date();
      now.setHours(22, 0, 0, 0);

      expect(
        resolveThemeColorScheme(
          "light",
          {
            overrideSystemTheme: true,
            darkModeEnabled: false,
            darkModeScheduleEnabled: true,
            darkModeScheduleStartMinutes: 1260,
            darkModeScheduleEndMinutes: 420,
          },
          now
        )
      ).toBe("dark");
    });
  });

  describe("dateToMinutesOfDay", () => {
    it("converts a date to minutes", () => {
      const date = new Date();
      date.setHours(1, 15, 0, 0);

      expect(dateToMinutesOfDay(date)).toBe(75);
    });
  });
});
