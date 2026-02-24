const getZeroBasedIsoWeekDay = (date: Date) => (date.getDay() + 6) % 7;
const getIsoWeekDay = (date: Date) => getZeroBasedIsoWeekDay(date) + 1;

export type Passage = {
  book: string;
  startChapter: string;
  endChapter: string;
  startVerse: string;
  endVerse: string;
  isMemory: boolean;
  heading?: string;
};

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

export const getWeekNumber = (
  d: Date
): { year: number; week: number; isStartOfNewYear: boolean } => {
  // Copy date so don't modify original
  const today = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  today.setUTCDate(today.getUTCDate() + 4 - (today.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  let weekNo = Math.ceil(
    // eslint-disable-next-line unicorn/numeric-separators-style
    ((today.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  // In this case, the year has already changed but it will still show the last week of the previous year
  let isStartOfNewYear = false;
  if (weekNo === 52 && yearStart.getUTCFullYear() !== d.getUTCFullYear()) {
    weekNo = 1;
    isStartOfNewYear = true;
  }

  // Return array of year and week number
  return { year: d.getUTCFullYear(), week: weekNo, isStartOfNewYear };
};

// FOR TESTING
// export const getWeekNumber = (
//   d: Date
// ): { year: number; week: number; isStartOfNewYear: boolean } => {
//   // Copy date so don't modify original
//   const today = new Date(Date.UTC(2025, 1, 1));
//   // Set to nearest Thursday: current date + 4 - current day number
//   // Make Sunday's day number 7
//   today.setUTCDate(today.getUTCDate() + 4 - (today.getUTCDay() || 7));
//   // Get first day of year
//   const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
//   // Calculate full weeks to nearest Thursday
//   let weekNo = Math.ceil(
//     // eslint-disable-next-line unicorn/numeric-separators-style
//     ((today.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
//   );

//   // In this case, the year has already changed but it will still show the last week of the previous year
//   let isStartOfNewYear = false;
//   if (weekNo === 52 && yearStart.getUTCFullYear() !== d.getUTCFullYear()) {
//     weekNo = 1;
//     isStartOfNewYear = true;
//   }

//   // Return array of year and week number
//   return { year: d.getUTCFullYear(), week: weekNo, isStartOfNewYear };
// };

export const getDayInWeek = (): number => {
  const today = new Date();
  const day = today.getDay();
  const { isStartOfNewYear } = getWeekNumber(today);

  if (isStartOfNewYear) return 1;

  return day === 0 ? 7 : day;
};

/**
 * Convert week/day indices to display date string.
 * Uses day-of-week alignment where week 0 starts on the Monday of the week
 * containing January 1st, and dayIndex 0 = Monday.
 *
 * @param year - The calendar year
 * @param weekIndex - 0-based week index
 * @param dayIndex - 0-based day index within the week (0=Monday, 6=Sunday)
 * @returns Formatted date string like "1/1" or "12/31"
 */
export const dayOfYearToDate = (
  year: number,
  weekIndex: number,
  dayIndex: number
): string => {
  // Calculate the day-of-week offset for January 1st
  // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want: Monday = 0, Tuesday = 1, ..., Sunday = 6
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay();
  const startOffset = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;

  // Calculate days since January 1st
  const absoluteDayIndex = weekIndex * 7 + dayIndex;
  const daysSinceJan1 = absoluteDayIndex - startOffset;

  const date = new Date(year, 0, 1 + daysSinceJan1);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

/**
 * Get current week and day indices using day-of-week alignment.
 * Week 0 starts on the Monday of the week containing January 1st.
 * dayIndex 0 = Monday, dayIndex 6 = Sunday.
 *
 * @param d - The date to calculate indices for
 * @returns Object with year, weekIndex (0-based), and dayIndex (0-based, Monday=0)
 */
export const getDayOfYearIndices = (
  d: Date
): { year: number; weekIndex: number; dayIndex: number } => {
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  // Calculate days since January 1st (using UTC to avoid DST issues)
  const startOfYear = Date.UTC(year, 0, 1);
  const currentDate = Date.UTC(year, month, day);
  const daysSinceJan1 = Math.floor(
    (currentDate - startOfYear) / (1000 * 60 * 60 * 24)
  );

  // Calculate the day-of-week offset for January 1st
  // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want: Monday = 0, Tuesday = 1, ..., Sunday = 6
  const jan1 = new Date(year, 0, 1);
  const jan1DayOfWeek = jan1.getDay();
  const startOffset = jan1DayOfWeek === 0 ? 6 : jan1DayOfWeek - 1;

  // Apply offset to get absolute day index
  const absoluteDayIndex = daysSinceJan1 + startOffset;

  return {
    year,
    weekIndex: Math.floor(absoluteDayIndex / 7),
    dayIndex: absoluteDayIndex % 7,
  };
};

export const parsePassageString = (
  passage: string,
  heading?: string
): Passage => {
  const splitPassage = passage.trim()?.split(" ");
  if (splitPassage?.length === 0) {
    return {
      book: "",
      startChapter: "",
      endChapter: "",
      startVerse: "",
      endVerse: "",
      isMemory: false,
      heading,
    };
  }

  const firstToken: string | undefined = splitPassage[0];
  const secondToken: string | undefined = splitPassage[1];
  const thirdToken: string | undefined = splitPassage[2];

  const book =
    splitPassage.length > 2 ? `${firstToken}${secondToken}` : firstToken;

  const range =
    splitPassage.length > 2 ? thirdToken?.split("-") : secondToken?.split("-");
  if (!range || range.length === 0) {
    return {
      book,
      startChapter: "",
      endChapter: "",
      startVerse: "",
      endVerse: "",
      isMemory: false,
      heading,
    };
  }

  const startPassage = range[0];
  const endPassage = range.length > 1 ? range[1] : startPassage;

  const startPassageArray = startPassage?.split(":");
  if (startPassageArray?.length === 0) {
    return {
      book,
      startChapter: "",
      endChapter: "",
      startVerse: "",
      endVerse: "",
      isMemory: false,
      heading,
    };
  }

  const startPassageChapter = startPassageArray[0];
  const startPassageVerse =
    startPassageArray.length > 1 ? startPassageArray[1] : "";

  const endPassageArray = endPassage?.split(":");
  if (endPassageArray?.length === 0) {
    return {
      book,
      startChapter: startPassageChapter,
      endChapter: "",
      startVerse: startPassageVerse,
      endVerse: "",
      isMemory: false,
      heading,
    };
  }

  const endPassageChapter =
    endPassageArray.length > 1 || startPassageVerse.length === 0
      ? endPassageArray[0]
      : startPassageChapter;
  const endPassageVerse =
    endPassageArray.length > 1
      ? endPassageArray[1]
      : startPassageVerse.length > 0
      ? endPassageArray[0]
      : "";

  return {
    book,
    startChapter: startPassageChapter,
    endChapter: endPassageChapter,
    startVerse: startPassageVerse,
    endVerse: endPassageVerse,
    isMemory: !!heading,
    heading,
  };
};
