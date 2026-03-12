import { BIBLE_BOOKS } from "src/constants/bibleBooks";

export type ParsedVerse = {
  bookId: string;
  chapter: number;
  verse: number;
};

/**
 * Map ESV 1-indexed book number to 3-letter book ID.
 * BIBLE_BOOKS is canonically ordered: index 0 = book 1 (GEN).
 */
export const bookNumberToId = (bookNumber: number): string | undefined =>
  BIBLE_BOOKS[bookNumber - 1]?.id;

/**
 * Parse a verse-text element ID to extract verse info.
 * Accepts both prose IDs (`v{BB}{CCC}{VVV}_...`) and poetry IDs
 * (`p{BB}{CCC}{VVV}_...`).
 * e.g. "v43003016_01-1" → { bookId: "JHN", chapter: 3, verse: 16 }
 *      "p30001002_05-1" → { bookId: "AMO", chapter: 1, verse: 2 }
 */
export const parseVerseId = (pId: string): ParsedVerse | undefined => {
  const match = pId.match(/^[pv](\d{2})(\d{3})(\d{3})/);
  if (!match) {
    return undefined;
  }

  const bookNumber = Number.parseInt(match[1], 10);
  const chapter = Number.parseInt(match[2], 10);
  const verse = Number.parseInt(match[3], 10);
  const bookId = bookNumberToId(bookNumber);

  if (!bookId || chapter === 0 || verse === 0) {
    return undefined;
  }

  return { bookId, chapter, verse };
};

/**
 * Build a lookup key: "JHN:3:16"
 */
export const buildVerseKey = (
  bookId: string,
  chapter: number,
  verse: number
): string => `${bookId}:${chapter}:${verse}`;
