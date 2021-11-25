const getZeroBasedIsoWeekDay = (date: Date) => (date.getDay() + 6) % 7;
const getIsoWeekDay = (date: Date) => getZeroBasedIsoWeekDay(date) + 1;

export const weekDateToDate = (
  year: number,
  week: number,
  weekDay: number
): string => {
  const zeroBasedWeek = week - 1;
  const zeroBasedWeekDay = weekDay - 1;
  let days = zeroBasedWeek * 7 + zeroBasedWeekDay;

  // Dates start at 2017-01-01 and not 2017-01-00
  days += 1;

  const firstDayOfYear = new Date(year, 0, 1);
  const firstIsoWeekDay = getIsoWeekDay(firstDayOfYear);
  const zeroBasedFirstIsoWeekDay = getZeroBasedIsoWeekDay(firstDayOfYear);

  // If year begins with W52 or W53
  if (firstIsoWeekDay > 4) days += 8 - firstIsoWeekDay;
  // Else begins with W01
  else days -= zeroBasedFirstIsoWeekDay;

  const result = new Date(year, 0, days);
  return `${result.toLocaleDateString().split("/").slice(0, 2).join("/")}`;
};

export const getWeekNumber = (d: Date): number[] => {
  // Copy date so don't modify original
  const today = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  today.setUTCDate(today.getUTCDate() + 4 - (today.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(
    // eslint-disable-next-line unicorn/numeric-separators-style
    ((today.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  // Return array of year and week number
  return [d.getUTCFullYear(), weekNo];
};

export const getDayInWeek = (): number => {
  const today = new Date();
  const day = today.getDay();
  return day === 0 ? 7 : day;
};