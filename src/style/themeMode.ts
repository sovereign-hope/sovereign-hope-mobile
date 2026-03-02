export interface ThemeModeSettings {
  overrideSystemTheme: boolean;
  darkModeEnabled: boolean;
  darkModeScheduleEnabled: boolean;
  darkModeScheduleStartMinutes: number;
  darkModeScheduleEndMinutes: number;
}

const MINUTES_PER_DAY = 24 * 60;

export const normalizeMinutes = (minutes: number): number => {
  const normalized = Math.floor(minutes) % MINUTES_PER_DAY;
  return normalized < 0 ? normalized + MINUTES_PER_DAY : normalized;
};

export const dateToMinutesOfDay = (date: Date): number =>
  normalizeMinutes(date.getHours() * 60 + date.getMinutes());

export const minutesOfDayToDate = (minutes: number): Date => {
  const date = new Date();
  const normalizedMinutes = normalizeMinutes(minutes);
  const hours = Math.floor(normalizedMinutes / 60);
  const mins = normalizedMinutes % 60;
  date.setHours(hours, mins, 0, 0);
  return date;
};

export const formatMinutesOfDay = (minutes: number): string =>
  minutesOfDayToDate(minutes).toLocaleTimeString("en-US", {
    hour12: true,
    hour: "numeric",
    minute: "numeric",
  });

export const isMinuteInRange = (
  currentMinute: number,
  startMinute: number,
  endMinute: number
): boolean => {
  const current = normalizeMinutes(currentMinute);
  const start = normalizeMinutes(startMinute);
  const end = normalizeMinutes(endMinute);

  // Equal values represent "all day" dark mode.
  if (start === end) {
    return true;
  }

  // Regular daytime window.
  if (start < end) {
    return current >= start && current < end;
  }

  // Overnight window crossing midnight.
  return current >= start || current < end;
};

export const resolveThemeColorScheme = (
  systemColorScheme: "light" | "dark",
  settings: ThemeModeSettings,
  now: Date = new Date()
): "light" | "dark" => {
  if (!settings.overrideSystemTheme) {
    return systemColorScheme;
  }

  if (!settings.darkModeScheduleEnabled) {
    return settings.darkModeEnabled ? "dark" : "light";
  }

  return isMinuteInRange(
    dateToMinutesOfDay(now),
    settings.darkModeScheduleStartMinutes,
    settings.darkModeScheduleEndMinutes
  )
    ? "dark"
    : "light";
};
