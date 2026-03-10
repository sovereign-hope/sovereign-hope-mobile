import {
  parsePassageStringToRange,
  formatBibleLocation,
  formatBibleRange,
  buildEsvQueryFromLocation,
  esvChapterArrayToLocation,
  getNextChapter,
  getPreviousChapter,
  passageToLocation,
} from "../bibleUtils";
import {
  BIBLE_BOOKS,
  getBookByNameOrAbbreviation,
  getBookById,
} from "src/constants/bibleBooks";

// ─── Book Metadata ───────────────────────────────────────────────

describe("bibleBooks metadata", () => {
  it("contains exactly 66 books", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
  });

  it("has 39 OT books and 27 NT books", () => {
    const ot = BIBLE_BOOKS.filter((b) => b.testament === "old");
    const nt = BIBLE_BOOKS.filter((b) => b.testament === "new");
    expect(ot).toHaveLength(39);
    expect(nt).toHaveLength(27);
  });

  it("marks single-chapter books correctly", () => {
    const singleChapter = BIBLE_BOOKS.filter((b) => b.isSingleChapter);
    const names = singleChapter.map((b) => b.name).sort();
    expect(names).toEqual(
      ["2 John", "3 John", "Jude", "Obadiah", "Philemon"].sort()
    );
    for (const book of singleChapter) {
      expect(book.chapterCount).toBe(1);
    }
  });
});

// ─── Book Lookup ─────────────────────────────────────────────────

describe("getBookByNameOrAbbreviation", () => {
  it("finds by full name", () => {
    expect(getBookByNameOrAbbreviation("Genesis")?.id).toBe("GEN");
    expect(getBookByNameOrAbbreviation("Revelation")?.id).toBe("REV");
  });

  it("finds by full name case-insensitively", () => {
    expect(getBookByNameOrAbbreviation("genesis")?.id).toBe("GEN");
    expect(getBookByNameOrAbbreviation("JOHN")?.id).toBe("JHN");
  });

  it("finds numbered books with space", () => {
    expect(getBookByNameOrAbbreviation("1 John")?.id).toBe("1JN");
    expect(getBookByNameOrAbbreviation("2 Chronicles")?.id).toBe("2CH");
    expect(getBookByNameOrAbbreviation("1 Corinthians")?.id).toBe("1CO");
  });

  it("finds numbered books without space (concatenated)", () => {
    expect(getBookByNameOrAbbreviation("1John")?.id).toBe("1JN");
    expect(getBookByNameOrAbbreviation("2Timothy")?.id).toBe("2TI");
    expect(getBookByNameOrAbbreviation("1Corinthians")?.id).toBe("1CO");
  });

  it("finds by abbreviation", () => {
    expect(getBookByNameOrAbbreviation("Gen")?.id).toBe("GEN");
    expect(getBookByNameOrAbbreviation("Rev")?.id).toBe("REV");
    expect(getBookByNameOrAbbreviation("Ps")?.id).toBe("PSA");
  });

  it("finds by ID", () => {
    expect(getBookByNameOrAbbreviation("GEN")?.id).toBe("GEN");
    expect(getBookByNameOrAbbreviation("1jn")?.id).toBe("1JN");
  });

  it("returns undefined for unknown input", () => {
    expect(getBookByNameOrAbbreviation("NotABook")).toBeUndefined();
    expect(getBookByNameOrAbbreviation("")).toBeUndefined();
  });
});

describe("getBookById", () => {
  it("finds by canonical ID", () => {
    expect(getBookById("GEN")?.name).toBe("Genesis");
    expect(getBookById("REV")?.name).toBe("Revelation");
    expect(getBookById("1JN")?.name).toBe("1 John");
  });

  it("returns undefined for unknown ID", () => {
    expect(getBookById("XYZ")).toBeUndefined();
  });
});

// ─── Parsing ─────────────────────────────────────────────────────

describe("parsePassageStringToRange", () => {
  describe("whole chapter references", () => {
    it('parses "John 3"', () => {
      const result = parsePassageStringToRange("John 3");
      expect(result).toEqual({
        start: { bookId: "JHN", chapter: 3 },
      });
    });

    it('parses "Genesis 1"', () => {
      const result = parsePassageStringToRange("Genesis 1");
      expect(result).toEqual({
        start: { bookId: "GEN", chapter: 1 },
      });
    });

    it('parses "1 John 1"', () => {
      const result = parsePassageStringToRange("1 John 1");
      expect(result).toEqual({
        start: { bookId: "1JN", chapter: 1 },
      });
    });

    it('parses "1 Corinthians 13"', () => {
      const result = parsePassageStringToRange("1 Corinthians 13");
      expect(result).toEqual({
        start: { bookId: "1CO", chapter: 13 },
      });
    });
  });

  describe("single verse references", () => {
    it('parses "John 3:16"', () => {
      const result = parsePassageStringToRange("John 3:16");
      expect(result).toEqual({
        start: { bookId: "JHN", chapter: 3, verse: 16 },
      });
    });

    it('parses "Romans 8:28"', () => {
      const result = parsePassageStringToRange("Romans 8:28");
      expect(result).toEqual({
        start: { bookId: "ROM", chapter: 8, verse: 28 },
      });
    });
  });

  describe("verse ranges (same chapter)", () => {
    it('parses "John 3:16-17"', () => {
      const result = parsePassageStringToRange("John 3:16-17");
      expect(result).toEqual({
        start: { bookId: "JHN", chapter: 3, verse: 16 },
        end: { bookId: "JHN", chapter: 3, verse: 17 },
      });
    });

    it('parses "Matthew 5:1-12"', () => {
      const result = parsePassageStringToRange("Matthew 5:1-12");
      expect(result).toEqual({
        start: { bookId: "MAT", chapter: 5, verse: 1 },
        end: { bookId: "MAT", chapter: 5, verse: 12 },
      });
    });
  });

  describe("cross-chapter ranges", () => {
    it('parses "Genesis 1:1-2:3"', () => {
      const result = parsePassageStringToRange("Genesis 1:1-2:3");
      expect(result).toEqual({
        start: { bookId: "GEN", chapter: 1, verse: 1 },
        end: { bookId: "GEN", chapter: 2, verse: 3 },
      });
    });

    it('parses "Genesis 1-2" (chapter range)', () => {
      const result = parsePassageStringToRange("Genesis 1-2");
      expect(result).toEqual({
        start: { bookId: "GEN", chapter: 1 },
        end: { bookId: "GEN", chapter: 2 },
      });
    });
  });

  describe("single-chapter books", () => {
    it('parses "Jude 5-7" as verse range in chapter 1', () => {
      const result = parsePassageStringToRange("Jude 5-7");
      expect(result).toEqual({
        start: { bookId: "JUD", chapter: 1, verse: 5 },
        end: { bookId: "JUD", chapter: 1, verse: 7 },
      });
    });

    it('parses "Philemon 1-7" as verse range in chapter 1', () => {
      const result = parsePassageStringToRange("Philemon 1-7");
      expect(result).toEqual({
        start: { bookId: "PHM", chapter: 1, verse: 1 },
        end: { bookId: "PHM", chapter: 1, verse: 7 },
      });
    });

    it('parses "Obadiah 10" as verse 10 in chapter 1', () => {
      const result = parsePassageStringToRange("Obadiah 10");
      expect(result).toEqual({
        start: { bookId: "OBA", chapter: 1, verse: 10 },
      });
    });

    it('parses "Jude" as chapter 1', () => {
      const result = parsePassageStringToRange("Jude");
      expect(result).toEqual({
        start: { bookId: "JUD", chapter: 1 },
      });
    });
  });

  describe("numbered books", () => {
    it('parses "2 Timothy 3:16-17"', () => {
      const result = parsePassageStringToRange("2 Timothy 3:16-17");
      expect(result).toEqual({
        start: { bookId: "2TI", chapter: 3, verse: 16 },
        end: { bookId: "2TI", chapter: 3, verse: 17 },
      });
    });

    it('parses "1 Peter 2:9"', () => {
      const result = parsePassageStringToRange("1 Peter 2:9");
      expect(result).toEqual({
        start: { bookId: "1PE", chapter: 2, verse: 9 },
      });
    });

    it('parses "3 John 1:4"', () => {
      const result = parsePassageStringToRange("3 John 1:4");
      expect(result).toEqual({
        start: { bookId: "3JN", chapter: 1, verse: 4 },
      });
    });
  });

  describe("edge cases", () => {
    it("returns undefined for empty string", () => {
      expect(parsePassageStringToRange("")).toBeUndefined();
    });

    it("returns undefined for unknown book", () => {
      expect(parsePassageStringToRange("FakeBook 1:1")).toBeUndefined();
    });

    it("handles extra whitespace", () => {
      const result = parsePassageStringToRange("  John   3:16  ");
      expect(result?.start.bookId).toBe("JHN");
      expect(result?.start.chapter).toBe(3);
      expect(result?.start.verse).toBe(16);
    });
  });
});

// ─── Formatting ──────────────────────────────────────────────────

describe("formatBibleLocation", () => {
  it('formats "Genesis 1"', () => {
    expect(formatBibleLocation({ bookId: "GEN", chapter: 1 })).toBe(
      "Genesis 1"
    );
  });

  it('formats "1 John 3"', () => {
    expect(formatBibleLocation({ bookId: "1JN", chapter: 3 })).toBe("1 John 3");
  });

  it("formats single-chapter book as just the name", () => {
    expect(formatBibleLocation({ bookId: "JUD", chapter: 1 })).toBe("Jude");
    expect(formatBibleLocation({ bookId: "PHM", chapter: 1 })).toBe("Philemon");
  });

  it("handles unknown bookId", () => {
    expect(formatBibleLocation({ bookId: "XYZ", chapter: 1 })).toBe(
      "Unknown 1"
    );
  });
});

describe("formatBibleRange", () => {
  it('formats "John 3:16"', () => {
    expect(
      formatBibleRange({
        start: { bookId: "JHN", chapter: 3, verse: 16 },
      })
    ).toBe("John 3:16");
  });

  it('formats "John 3:16-17"', () => {
    expect(
      formatBibleRange({
        start: { bookId: "JHN", chapter: 3, verse: 16 },
        end: { bookId: "JHN", chapter: 3, verse: 17 },
      })
    ).toBe("John 3:16-17");
  });

  it('formats "Genesis 1:1-2:3"', () => {
    expect(
      formatBibleRange({
        start: { bookId: "GEN", chapter: 1, verse: 1 },
        end: { bookId: "GEN", chapter: 2, verse: 3 },
      })
    ).toBe("Genesis 1:1-2:3");
  });

  it('formats "Genesis 1-2" (chapter range)', () => {
    expect(
      formatBibleRange({
        start: { bookId: "GEN", chapter: 1 },
        end: { bookId: "GEN", chapter: 2 },
      })
    ).toBe("Genesis 1-2");
  });

  it('formats "Jude 5" (single-chapter book)', () => {
    expect(
      formatBibleRange({
        start: { bookId: "JUD", chapter: 1, verse: 5 },
      })
    ).toBe("Jude 5");
  });
});

// ─── ESV Query Building ──────────────────────────────────────────

describe("buildEsvQueryFromLocation", () => {
  it("builds query for Genesis 1", () => {
    expect(buildEsvQueryFromLocation({ bookId: "GEN", chapter: 1 })).toBe(
      "Genesis 1"
    );
  });

  it("builds query for 1 John 3", () => {
    expect(buildEsvQueryFromLocation({ bookId: "1JN", chapter: 3 })).toBe(
      "1 John 3"
    );
  });

  it("returns empty for unknown bookId", () => {
    expect(buildEsvQueryFromLocation({ bookId: "XYZ", chapter: 1 })).toBe("");
  });
});

// ─── ESV Chapter Array Conversion ────────────────────────────────

describe("esvChapterArrayToLocation", () => {
  it("converts Genesis 2 (book 1, chapter 2, verse 1)", () => {
    // ESV verse ID: bookIndex(1) * 1000000 + chapter(2) * 1000 + verse(1)
    const result = esvChapterArrayToLocation([1_002_001]);
    expect(result).toEqual({ bookId: "GEN", chapter: 2 });
  });

  it("converts Revelation 1 (book 66, chapter 1)", () => {
    const result = esvChapterArrayToLocation([66_001_001]);
    expect(result).toEqual({ bookId: "REV", chapter: 1 });
  });

  it("returns undefined for empty array", () => {
    expect(esvChapterArrayToLocation([])).toBeUndefined();
  });

  it("returns undefined for invalid book index", () => {
    // Book index 0 or 67+ are invalid
    expect(esvChapterArrayToLocation([0])).toBeUndefined();
    expect(esvChapterArrayToLocation([67_001_001])).toBeUndefined();
  });
});

// ─── Chapter Navigation ──────────────────────────────────────────

describe("getNextChapter", () => {
  it("advances within same book", () => {
    expect(getNextChapter({ bookId: "GEN", chapter: 1 })).toEqual({
      bookId: "GEN",
      chapter: 2,
    });
  });

  it("crosses to next book at end of current book", () => {
    // Genesis has 50 chapters
    expect(getNextChapter({ bookId: "GEN", chapter: 50 })).toEqual({
      bookId: "EXO",
      chapter: 1,
    });
  });

  it("returns undefined at end of Revelation", () => {
    expect(getNextChapter({ bookId: "REV", chapter: 22 })).toBeUndefined();
  });
});

describe("getPreviousChapter", () => {
  it("goes back within same book", () => {
    expect(getPreviousChapter({ bookId: "GEN", chapter: 5 })).toEqual({
      bookId: "GEN",
      chapter: 4,
    });
  });

  it("crosses to previous book at chapter 1", () => {
    // Exodus chapter 1 -> Genesis chapter 50
    expect(getPreviousChapter({ bookId: "EXO", chapter: 1 })).toEqual({
      bookId: "GEN",
      chapter: 50,
    });
  });

  it("returns undefined at Genesis 1", () => {
    expect(getPreviousChapter({ bookId: "GEN", chapter: 1 })).toBeUndefined();
  });
});

// ─── Passage to Location ─────────────────────────────────────────

describe("passageToLocation", () => {
  it("converts standard passage", () => {
    expect(passageToLocation({ book: "John", startChapter: "3" })).toEqual({
      bookId: "JHN",
      chapter: 3,
    });
  });

  it("converts numbered book (concatenated form)", () => {
    expect(passageToLocation({ book: "1John", startChapter: "2" })).toEqual({
      bookId: "1JN",
      chapter: 2,
    });
  });

  it("handles single-chapter book with empty chapter", () => {
    expect(passageToLocation({ book: "Jude", startChapter: "" })).toEqual({
      bookId: "JUD",
      chapter: 1,
    });
  });

  it("returns undefined for unknown book", () => {
    expect(
      passageToLocation({ book: "FakeBook", startChapter: "1" })
    ).toBeUndefined();
  });
});
