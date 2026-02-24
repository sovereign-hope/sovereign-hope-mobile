import {
  parsePassageString,
  getWeekNumber,
  getDayInWeek,
  weekDateToDate,
  dayOfYearToDate,
  getDayOfYearIndices,
} from "../utils";

describe("parsePassageString", () => {
  describe("single verse references", () => {
    it('parses "John 3:16"', () => {
      const result = parsePassageString("John 3:16");

      expect(result.book).toBe("John");
      expect(result.startChapter).toBe("3");
      expect(result.startVerse).toBe("16");
      expect(result.endVerse).toBe("16");
      expect(result.endChapter).toBe("3");
      expect(result.isMemory).toBe(false);
    });

    it('parses "Psalm 23:1"', () => {
      const result = parsePassageString("Psalm 23:1");

      expect(result.book).toBe("Psalm");
      expect(result.startChapter).toBe("23");
      expect(result.startVerse).toBe("1");
    });

    it('parses "Romans 8:28"', () => {
      const result = parsePassageString("Romans 8:28");

      expect(result.book).toBe("Romans");
      expect(result.startChapter).toBe("8");
      expect(result.startVerse).toBe("28");
      expect(result.endVerse).toBe("28");
    });
  });

  describe("verse ranges", () => {
    it('parses "John 3:16-17" (same chapter)', () => {
      const result = parsePassageString("John 3:16-17");

      expect(result.book).toBe("John");
      expect(result.startChapter).toBe("3");
      expect(result.endChapter).toBe("3");
      expect(result.startVerse).toBe("16");
      expect(result.endVerse).toBe("17");
    });

    it('parses "Genesis 1:1-2:3" (cross chapter)', () => {
      const result = parsePassageString("Genesis 1:1-2:3");

      expect(result.book).toBe("Genesis");
      expect(result.startChapter).toBe("1");
      expect(result.endChapter).toBe("2");
      expect(result.startVerse).toBe("1");
      expect(result.endVerse).toBe("3");
    });

    it('parses "Matthew 5:1-12"', () => {
      const result = parsePassageString("Matthew 5:1-12");

      expect(result.book).toBe("Matthew");
      expect(result.startChapter).toBe("5");
      expect(result.endChapter).toBe("5");
      expect(result.startVerse).toBe("1");
      expect(result.endVerse).toBe("12");
    });
  });

  describe("chapter references", () => {
    it('parses "John 3" (whole chapter)', () => {
      const result = parsePassageString("John 3");

      expect(result.book).toBe("John");
      expect(result.startChapter).toBe("3");
      expect(result.endChapter).toBe("3");
      expect(result.startVerse).toBe("");
      expect(result.endVerse).toBe("");
    });

    it('parses "Genesis 1-2" (chapter range)', () => {
      const result = parsePassageString("Genesis 1-2");

      expect(result.book).toBe("Genesis");
      expect(result.startChapter).toBe("1");
      expect(result.endChapter).toBe("2");
      expect(result.startVerse).toBe("");
      expect(result.endVerse).toBe("");
    });

    it('parses "Matthew 5-7" (Sermon on the Mount)', () => {
      const result = parsePassageString("Matthew 5-7");

      expect(result.book).toBe("Matthew");
      expect(result.startChapter).toBe("5");
      expect(result.endChapter).toBe("7");
    });
  });

  describe("numbered books", () => {
    // Note: The current implementation concatenates without a space
    // These tests verify actual behavior
    it('parses "1 John 1:1"', () => {
      const result = parsePassageString("1 John 1:1");

      // Current implementation: book = firstToken + secondToken (no space)
      expect(result.book).toBe("1John");
      expect(result.startChapter).toBe("1");
      expect(result.startVerse).toBe("1");
    });

    it('parses "2 Chronicles 7:14"', () => {
      const result = parsePassageString("2 Chronicles 7:14");

      expect(result.book).toBe("2Chronicles");
      expect(result.startChapter).toBe("7");
      expect(result.startVerse).toBe("14");
    });

    it('parses "1 Corinthians 13"', () => {
      const result = parsePassageString("1 Corinthians 13");

      expect(result.book).toBe("1Corinthians");
      expect(result.startChapter).toBe("13");
    });

    it('parses "2 Timothy 3:16-17"', () => {
      const result = parsePassageString("2 Timothy 3:16-17");

      expect(result.book).toBe("2Timothy");
      expect(result.startChapter).toBe("3");
      expect(result.startVerse).toBe("16");
      expect(result.endVerse).toBe("17");
    });
  });

  describe("with heading (memory verses)", () => {
    it("includes heading when provided", () => {
      const result = parsePassageString("John 3:16", "For God So Loved");

      expect(result.heading).toBe("For God So Loved");
      expect(result.isMemory).toBe(true);
    });

    it("heading is undefined when not provided", () => {
      const result = parsePassageString("John 3:16");

      expect(result.heading).toBeUndefined();
      expect(result.isMemory).toBe(false);
    });

    it("sets isMemory to true when heading exists", () => {
      const result = parsePassageString("Romans 8:28", "God Works All Things");

      expect(result.isMemory).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = parsePassageString("");

      expect(result.book).toBe("");
      expect(result.startChapter).toBe("");
    });

    it("handles whitespace", () => {
      const result = parsePassageString("  John 3:16  ");

      expect(result.book).toBe("John");
      expect(result.startChapter).toBe("3");
    });

    it("handles book name only", () => {
      const result = parsePassageString("John");

      expect(result.book).toBe("John");
      // No chapter/verse info
    });
  });
});

describe("getWeekNumber", () => {
  it("returns week 1 for early January", () => {
    // January 2, 2026 is a Friday - should be week 1
    const result = getWeekNumber(new Date("2026-01-02"));
    expect(result.week).toBe(1);
    expect(result.year).toBe(2026);
  });

  it("returns correct week for mid-year", () => {
    // June 15, 2026 should be around week 24-25
    const result = getWeekNumber(new Date("2026-06-15"));
    expect(result.week).toBeGreaterThan(20);
    expect(result.week).toBeLessThan(30);
  });

  it("handles year-end correctly", () => {
    const result = getWeekNumber(new Date("2026-12-28"));
    expect(result.week).toBeGreaterThan(50);
  });

  it("returns isStartOfNewYear flag", () => {
    const result = getWeekNumber(new Date("2026-01-01"));
    expect(result).toHaveProperty("isStartOfNewYear");
  });
});

describe("getDayInWeek", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 7 for Sunday (converted from 0)", () => {
    // January 4, 2026 is a Sunday
    jest.setSystemTime(new Date("2026-01-04T12:00:00"));
    expect(getDayInWeek()).toBe(7);
  });

  it("returns 1 for Monday", () => {
    // January 5, 2026 is a Monday
    jest.setSystemTime(new Date("2026-01-05T12:00:00"));
    expect(getDayInWeek()).toBe(1);
  });

  it("returns 5 for Friday", () => {
    // January 2, 2026 is a Friday
    jest.setSystemTime(new Date("2026-01-02T12:00:00"));
    expect(getDayInWeek()).toBe(5);
  });

  it("returns 6 for Saturday", () => {
    // January 3, 2026 is a Saturday
    jest.setSystemTime(new Date("2026-01-03T12:00:00"));
    expect(getDayInWeek()).toBe(6);
  });
});

describe("weekDateToDate", () => {
  it("returns a formatted date string", () => {
    const result = weekDateToDate(2026, 1, 1);
    // Should return a date string like "1/5" or similar format
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns different dates for different week days", () => {
    const monday = weekDateToDate(2026, 1, 1);
    const friday = weekDateToDate(2026, 1, 5);

    expect(monday).not.toBe(friday);
  });

  it("returns different dates for different weeks", () => {
    const week1 = weekDateToDate(2026, 1, 1);
    const week2 = weekDateToDate(2026, 2, 1);

    expect(week1).not.toBe(week2);
  });
});

describe("dayOfYearToDate", () => {
  // 2026: January 1st is Thursday (offset 3)
  // Week 0: Mon Dec 29, Tue Dec 30, Wed Dec 31, Thu Jan 1, Fri Jan 2, Sat Jan 3, Sun Jan 4

  it("returns 1/1 for week 0, day 3 (Thursday = Jan 1, 2026)", () => {
    expect(dayOfYearToDate(2026, 0, 3)).toBe("1/1");
  });

  it("returns 1/2 for week 0, day 4 (Friday = Jan 2, 2026)", () => {
    expect(dayOfYearToDate(2026, 0, 4)).toBe("1/2");
  });

  it("returns 1/4 for week 0, day 6 (Sunday = Jan 4, 2026)", () => {
    expect(dayOfYearToDate(2026, 0, 6)).toBe("1/4");
  });

  it("returns 1/5 for week 1, day 0 (Monday = Jan 5, 2026)", () => {
    expect(dayOfYearToDate(2026, 1, 0)).toBe("1/5");
  });

  it("returns 12/31 for week 52, day 3 (Thursday = Dec 31, 2026)", () => {
    // Dec 31, 2026 is a Thursday
    expect(dayOfYearToDate(2026, 52, 3)).toBe("12/31");
  });

  it("handles leap years correctly (Feb 29, 2024)", () => {
    // 2024: January 1st is Monday (offset 0)
    // Feb 29, 2024 is a Thursday = day 3
    // Days since Jan 1 = 59, absoluteDayIndex = 59, week = 8, day = 3
    expect(dayOfYearToDate(2024, 8, 3)).toBe("2/29");
  });

  it("returns 1/12 for week 2, day 0 (Monday = Jan 12, 2026)", () => {
    expect(dayOfYearToDate(2026, 2, 0)).toBe("1/12");
  });

  it("returns 1/29 for week 4, day 3 (Thursday = Jan 29, 2026)", () => {
    expect(dayOfYearToDate(2026, 4, 3)).toBe("1/29");
  });
});

describe("getDayOfYearIndices", () => {
  // Uses day-of-week alignment where Monday = 0, Sunday = 6
  // 2026: January 1st is Thursday (offset 3)
  // 2024: January 1st is Monday (offset 0)

  it("returns week 0, day 3 for January 1, 2026 (Thursday)", () => {
    const result = getDayOfYearIndices(new Date(2026, 0, 1));
    expect(result.weekIndex).toBe(0);
    expect(result.dayIndex).toBe(3); // Thursday
    expect(result.year).toBe(2026);
  });

  it("returns week 0, day 4 for January 2, 2026 (Friday)", () => {
    const result = getDayOfYearIndices(new Date(2026, 0, 2));
    expect(result.weekIndex).toBe(0);
    expect(result.dayIndex).toBe(4); // Friday
  });

  it("returns week 1, day 2 for January 7, 2026 (Wednesday)", () => {
    // Jan 7 is 6 days after Jan 1, absoluteDayIndex = 6 + 3 = 9
    // week = floor(9/7) = 1, day = 9 % 7 = 2
    const result = getDayOfYearIndices(new Date(2026, 0, 7));
    expect(result.weekIndex).toBe(1);
    expect(result.dayIndex).toBe(2); // Wednesday
  });

  it("returns week 1, day 3 for January 8, 2026 (Thursday)", () => {
    // Jan 8 is 7 days after Jan 1, absoluteDayIndex = 7 + 3 = 10
    // week = floor(10/7) = 1, day = 10 % 7 = 3
    const result = getDayOfYearIndices(new Date(2026, 0, 8));
    expect(result.weekIndex).toBe(1);
    expect(result.dayIndex).toBe(3); // Thursday
  });

  it("handles mid-year correctly (July 1, 2026 is Wednesday)", () => {
    // July 1, 2026: daysSinceJan1 = 181, absoluteDayIndex = 181 + 3 = 184
    // week = floor(184/7) = 26, day = 184 % 7 = 2
    const result = getDayOfYearIndices(new Date(2026, 6, 1));
    expect(result.weekIndex).toBe(26);
    expect(result.dayIndex).toBe(2); // Wednesday
  });

  it("handles year end correctly (December 31, 2026 is Thursday)", () => {
    // Dec 31, 2026: daysSinceJan1 = 364, absoluteDayIndex = 364 + 3 = 367
    // week = floor(367/7) = 52, day = 367 % 7 = 3
    const result = getDayOfYearIndices(new Date(2026, 11, 31));
    expect(result.weekIndex).toBe(52);
    expect(result.dayIndex).toBe(3); // Thursday
  });

  it("handles leap year correctly (Feb 29, 2024 is Thursday)", () => {
    // 2024: Jan 1 is Monday (offset 0)
    // Feb 29: daysSinceJan1 = 59, absoluteDayIndex = 59 + 0 = 59
    // week = floor(59/7) = 8, day = 59 % 7 = 3
    const result = getDayOfYearIndices(new Date(2024, 1, 29));
    expect(result.weekIndex).toBe(8);
    expect(result.dayIndex).toBe(3); // Thursday
  });

  it("handles leap year Dec 31 correctly (Dec 31, 2024 is Tuesday)", () => {
    // 2024: Jan 1 is Monday (offset 0)
    // Dec 31: daysSinceJan1 = 365, absoluteDayIndex = 365 + 0 = 365
    // week = floor(365/7) = 52, day = 365 % 7 = 1
    const result = getDayOfYearIndices(new Date(2024, 11, 31));
    expect(result.weekIndex).toBe(52);
    expect(result.dayIndex).toBe(1); // Tuesday
  });

  it("handles different times of day consistently", () => {
    const morning = getDayOfYearIndices(new Date(2026, 0, 15, 6, 0, 0));
    const evening = getDayOfYearIndices(new Date(2026, 0, 15, 22, 0, 0));

    expect(morning.weekIndex).toBe(evening.weekIndex);
    expect(morning.dayIndex).toBe(evening.dayIndex);
  });

  it("returns week 1, day 0 for January 5, 2026 (Monday)", () => {
    // First Monday of 2026
    const result = getDayOfYearIndices(new Date(2026, 0, 5));
    expect(result.weekIndex).toBe(1);
    expect(result.dayIndex).toBe(0); // Monday
  });
});
