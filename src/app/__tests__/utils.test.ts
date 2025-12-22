import {
  parsePassageString,
  getWeekNumber,
  getDayInWeek,
  weekDateToDate,
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
