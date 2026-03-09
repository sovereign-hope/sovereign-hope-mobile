/**
 * Week-index utilities matching the mobile app's getDayOfYearIndices algorithm.
 *
 * The mobile app defines week 0 as starting on the Monday of the week
 * containing January 1st (which may be in the previous year).
 * dayIndex 0 = Monday, dayIndex 6 = Sunday.
 *
 * Uses Date.UTC for day counting to avoid DST errors.
 */

/** Jan 1's Monday-based day-of-week offset (Mon=0 … Sun=6). */
function getStartOffset(year: number): number {
  const jan1DayOfWeek = new Date(year, 0, 1).getDay();
  return jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;
}

/** Current week index (matches mobile app's getDayOfYearIndices). */
export function getCurrentWeekIndex(year: number): number {
  const today = new Date();
  const daysSinceJan1 = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(year, 0, 1)) /
      86_400_000,
  );
  const absoluteDayIndex = daysSinceJan1 + getStartOffset(year);
  return Math.floor(absoluteDayIndex / 7);
}

/** Sunday date for a given week index (matches mobile app's dayOfYearToDate). */
export function getSundayDate(year: number, weekIndex: number): Date {
  const absoluteDayIndex = weekIndex * 7 + 6; // 6 = Sunday
  const daysSinceJan1 = absoluteDayIndex - getStartOffset(year);
  return new Date(year, 0, 1 + daysSinceJan1);
}

/** Week index for a specific date (inverse of getSundayDate). */
export function getWeekIndexForDate(year: number, date: Date): number {
  const daysSinceJan1 = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(year, 0, 1)) /
      86_400_000,
  );
  const absoluteDayIndex = daysSinceJan1 + getStartOffset(year);
  return Math.floor(absoluteDayIndex / 7);
}

/** Monday-based day index for today (0=Mon, 6=Sun). */
export function getTodayDayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}
