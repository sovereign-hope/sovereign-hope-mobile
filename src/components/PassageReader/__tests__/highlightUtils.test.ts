import { bookNumberToId, parseVerseId, buildVerseKey } from "../highlightUtils";

describe("highlightUtils", () => {
  describe("bookNumberToId", () => {
    it("maps book 1 to GEN", () => {
      expect(bookNumberToId(1)).toBe("GEN");
    });

    it("maps book 43 to JHN", () => {
      expect(bookNumberToId(43)).toBe("JHN");
    });

    it("maps book 66 to REV", () => {
      expect(bookNumberToId(66)).toBe("REV");
    });

    it("returns undefined for 0", () => {
      expect(bookNumberToId(0)).toBeUndefined();
    });

    it("returns undefined for out-of-range number", () => {
      expect(bookNumberToId(67)).toBeUndefined();
    });
  });

  describe("parseVerseId", () => {
    it("parses poetry ID with p prefix", () => {
      const result = parseVerseId("p43003016_01-1");
      expect(result).toEqual({ bookId: "JHN", chapter: 3, verse: 16 });
    });

    it("parses prose ID with v prefix", () => {
      const result = parseVerseId("v43003016_01-1");
      expect(result).toEqual({ bookId: "JHN", chapter: 3, verse: 16 });
    });

    it("parses Genesis 1:1", () => {
      const result = parseVerseId("v01001001_01-1");
      expect(result).toEqual({ bookId: "GEN", chapter: 1, verse: 1 });
    });

    it("parses Revelation 22:21", () => {
      const result = parseVerseId("p66022021_01-1");
      expect(result).toEqual({ bookId: "REV", chapter: 22, verse: 21 });
    });

    it("handles IDs without segment suffix", () => {
      const result = parseVerseId("v43003016");
      expect(result).toEqual({ bookId: "JHN", chapter: 3, verse: 16 });
    });

    it("returns undefined for non-matching format", () => {
      expect(parseVerseId("not-a-verse-id")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(parseVerseId("")).toBeUndefined();
    });

    it("returns undefined for chapter 0", () => {
      expect(parseVerseId("p01000001_01-1")).toBeUndefined();
    });

    it("returns undefined for verse 0", () => {
      expect(parseVerseId("p01001000_01-1")).toBeUndefined();
    });

    it("returns undefined for invalid book number", () => {
      expect(parseVerseId("p99001001_01-1")).toBeUndefined();
    });
  });

  describe("buildVerseKey", () => {
    it("builds a colon-separated key", () => {
      expect(buildVerseKey("JHN", 3, 16)).toBe("JHN:3:16");
    });

    it("works with single-digit values", () => {
      expect(buildVerseKey("GEN", 1, 1)).toBe("GEN:1:1");
    });
  });
});
