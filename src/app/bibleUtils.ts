import {
  BIBLE_BOOKS,
  getBookByNameOrAbbreviation,
  getBookById,
} from "src/constants/bibleBooks";
import type { BibleBook } from "src/constants/bibleBooks";
import type {
  BibleLocation,
  BibleRange,
  BibleReference,
} from "src/types/bible";

/**
 * Extract the book name from the beginning of a passage string.
 * Returns the matched BibleBook and the remaining text (chapter:verse part).
 */
const extractBookName = (
  input: string
): { book: BibleBook | undefined; remainder: string } => {
  const tokens = input.split(/\s+/);

  // Try numbered book first: "1 John 3:16" -> tokens = ["1", "John", "3:16"]
  if (tokens.length >= 2 && /^\d$/.test(tokens[0])) {
    // Try "1 John" (with space)
    const numberedName = `${tokens[0]} ${tokens[1]}`;
    const book = getBookByNameOrAbbreviation(numberedName);
    if (book) {
      return { book, remainder: tokens.slice(2).join(" ") };
    }

    // Try "1John" (concatenated, as existing parser produces)
    const concatenated = `${tokens[0]}${tokens[1]}`;
    const bookConcat = getBookByNameOrAbbreviation(concatenated);
    if (bookConcat) {
      return { book: bookConcat, remainder: tokens.slice(2).join(" ") };
    }
  }

  // Try multi-word book names first (longest match wins): "Song of Solomon 2:1"
  // Must come before single-word to avoid "Song" matching and leaving "of Solomon 2:1"
  for (let i = Math.min(tokens.length, 4); i >= 2; i--) {
    const candidate = tokens.slice(0, i).join(" ");
    const book = getBookByNameOrAbbreviation(candidate);
    if (book) {
      return { book, remainder: tokens.slice(i).join(" ") };
    }
  }

  // Try single-word book name: "John 3:16" or "Genesis 1"
  if (tokens.length > 0) {
    const book = getBookByNameOrAbbreviation(tokens[0]);
    if (book) {
      return { book, remainder: tokens.slice(1).join(" ") };
    }
  }

  return { book: undefined, remainder: input };
};

/**
 * Parse "3:16" or "3" into a BibleReference.
 * For single-chapter books, a bare number is treated as a verse.
 */
const parseChapterVerse = (
  book: BibleBook,
  input: string
): BibleReference | undefined => {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const parts = trimmed.split(":");

  if (parts.length === 1) {
    const num = Number.parseInt(parts[0], 10);
    if (Number.isNaN(num)) {
      return undefined;
    }

    if (book.isSingleChapter) {
      // "Jude 5" means chapter 1, verse 5
      return { bookId: book.id, chapter: 1, verse: num };
    }

    // "John 3" means chapter 3
    return { bookId: book.id, chapter: num };
  }

  if (parts.length === 2) {
    const chapter = Number.parseInt(parts[0], 10);
    const verse = Number.parseInt(parts[1], 10);
    if (Number.isNaN(chapter) || Number.isNaN(verse)) {
      return undefined;
    }
    return { bookId: book.id, chapter, verse };
  }

  return undefined;
};

/**
 * Parse the end portion of a range given the start reference.
 * Handles: "17" (same chapter verse), "4:2" (different chapter), "5" (chapter if no start verse)
 */
const parseEndReference = (
  book: BibleBook,
  start: BibleReference,
  endPart: string
): BibleReference | undefined => {
  const trimmed = endPart.trim();
  const parts = trimmed.split(":");

  if (parts.length === 2) {
    // "4:2" — explicit chapter:verse
    const chapter = Number.parseInt(parts[0], 10);
    const verse = Number.parseInt(parts[1], 10);
    if (Number.isNaN(chapter) || Number.isNaN(verse)) {
      return undefined;
    }
    return { bookId: book.id, chapter, verse };
  }

  if (parts.length === 1) {
    const num = Number.parseInt(parts[0], 10);
    if (Number.isNaN(num)) {
      return undefined;
    }

    if (start.verse !== undefined) {
      // Start has a verse, so end number is a verse in the same chapter
      // "John 3:16-17" -> end is verse 17 in chapter 3
      return { bookId: book.id, chapter: start.chapter, verse: num };
    }

    if (book.isSingleChapter) {
      // "Jude 5-7" -> verses 5-7 in chapter 1
      return { bookId: book.id, chapter: 1, verse: num };
    }

    // No start verse, so end number is a chapter
    // "Genesis 1-2" -> chapters 1 to 2
    return { bookId: book.id, chapter: num };
  }

  return undefined;
};

const formatReference = (book: BibleBook, ref: BibleReference): string => {
  if (book.isSingleChapter) {
    if (ref.verse !== undefined) {
      return `${book.name} ${ref.verse}`;
    }
    return book.name;
  }

  if (ref.verse !== undefined) {
    return `${book.name} ${ref.chapter}:${ref.verse}`;
  }

  return `${book.name} ${ref.chapter}`;
};

/**
 * Parse a passage string like "1 John 3:16-17" into a structured BibleRange.
 * Handles numbered books ("1 John", "2 Chronicles"), single-chapter books
 * ("Jude 5-7"), and cross-chapter ranges ("Genesis 1:1-2:3").
 *
 * Returns undefined for malformed or unrecognizable references.
 */
export const parsePassageStringToRange = (
  passage: string
): BibleRange | undefined => {
  const trimmed = passage.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const { book, remainder } = extractBookName(trimmed);
  if (!book) {
    return undefined;
  }

  // No chapter/verse info — treat as chapter 1
  if (remainder.length === 0) {
    return {
      start: { bookId: book.id, chapter: 1 },
    };
  }

  // Split on hyphen for range: "3:16-4:2" or "3-5" or "3:16-17"
  const rangeParts = remainder.split("-");
  const startPart = rangeParts[0];
  const endPart = rangeParts.length > 1 ? rangeParts[1] : undefined;

  const start = parseChapterVerse(book, startPart);
  if (!start) {
    return undefined;
  }

  if (!endPart) {
    return { start };
  }

  const end = parseEndReference(book, start, endPart);
  return { start, end };
};

/**
 * Format a BibleLocation as a display string: "Genesis 1", "1 John 3"
 */
export const formatBibleLocation = (location: BibleLocation): string => {
  const book = getBookById(location.bookId);
  if (!book) {
    return `Unknown ${location.chapter}`;
  }

  if (book.isSingleChapter) {
    return book.name;
  }

  return `${book.name} ${location.chapter}`;
};

/**
 * Format a BibleRange as a display string.
 * Examples: "John 3:16", "John 3:16-17", "Genesis 1:1-2:3", "Genesis 1-2"
 */
export const formatBibleRange = (range: BibleRange): string => {
  const book = getBookById(range.start.bookId);
  if (!book) {
    return "Unknown";
  }

  const startStr = formatReference(book, range.start);

  if (!range.end) {
    return startStr;
  }

  const { end } = range;

  // Same chapter, verse range
  if (
    end.chapter === range.start.chapter &&
    range.start.verse !== undefined &&
    end.verse !== undefined
  ) {
    return `${startStr}-${end.verse}`;
  }

  // Different chapter
  if (end.verse !== undefined) {
    return `${startStr}-${end.chapter}:${end.verse}`;
  }

  return `${startStr}-${end.chapter}`;
};

/**
 * Build an ESV API query string from a BibleLocation (whole chapter).
 * Example: { bookId: "GEN", chapter: 1 } -> "Genesis 1"
 */
export const buildEsvQueryFromLocation = (location: BibleLocation): string => {
  const book = getBookById(location.bookId);
  if (!book) {
    return "";
  }

  return `${book.name} ${location.chapter}`;
};

/**
 * Build an ESV API query string from a BibleRange.
 * Examples: "John 3:16-17", "Genesis 1:1-2:3", "1 John 1"
 */
/**
 * Convert ESV API `next_chapter` / `prev_chapter` arrays into a BibleLocation.
 * The ESV API returns these as arrays of verse IDs.
 * The verse ID encodes book, chapter, verse as: bookIndex * 1000000 + chapter * 1000 + verse
 */
export const esvChapterArrayToLocation = (
  chapterArray: number[]
): BibleLocation | undefined => {
  if (!chapterArray || chapterArray.length === 0) {
    return undefined;
  }

  const verseId = chapterArray[0];
  const bookIndex = Math.floor(verseId / 1_000_000);
  const chapter = Math.floor((verseId % 1_000_000) / 1000);

  // ESV book indices are 1-based and match canonical order
  const book = BIBLE_BOOKS[bookIndex - 1];
  if (!book) {
    return undefined;
  }

  return { bookId: book.id, chapter };
};

/**
 * Get the next chapter location given a current location.
 * Returns undefined if at the end of the Bible.
 */
export const getNextChapter = (
  current: BibleLocation
): BibleLocation | undefined => {
  const book = getBookById(current.bookId);
  if (!book) {
    return undefined;
  }

  if (current.chapter < book.chapterCount) {
    return { bookId: current.bookId, chapter: current.chapter + 1 };
  }

  // Move to next book
  const currentIndex = BIBLE_BOOKS.findIndex((b) => b.id === current.bookId);
  if (currentIndex < 0 || currentIndex >= BIBLE_BOOKS.length - 1) {
    return undefined;
  }

  const nextBook = BIBLE_BOOKS[currentIndex + 1];
  return { bookId: nextBook.id, chapter: 1 };
};

/**
 * Get the previous chapter location given a current location.
 * Returns undefined if at the beginning of the Bible.
 */
export const getPreviousChapter = (
  current: BibleLocation
): BibleLocation | undefined => {
  if (current.chapter > 1) {
    return { bookId: current.bookId, chapter: current.chapter - 1 };
  }

  // Move to previous book's last chapter
  const currentIndex = BIBLE_BOOKS.findIndex((b) => b.id === current.bookId);
  if (currentIndex <= 0) {
    return undefined;
  }

  const prevBook = BIBLE_BOOKS[currentIndex - 1];
  return { bookId: prevBook.id, chapter: prevBook.chapterCount };
};

/**
 * Extract a BibleLocation (chapter-level) from a Passage object.
 * Used for "Open in Bible" from plan mode.
 */
export const passageToLocation = (passage: {
  book: string;
  startChapter: string;
}): BibleLocation | undefined => {
  const book = getBookByNameOrAbbreviation(passage.book);
  if (!book) {
    return undefined;
  }

  const chapter = Number.parseInt(passage.startChapter, 10);
  if (Number.isNaN(chapter) || chapter < 1) {
    return book.isSingleChapter ? { bookId: book.id, chapter: 1 } : undefined;
  }

  return { bookId: book.id, chapter };
};

const AUDIO_URL_REGEX = /https:\/\/audio\.esv\.org\/[^\s")]+\.mp3/;

/** Extract the ESV audio URL from passage HTML, if present. */
export const extractAudioUrl = (html: string | undefined): string | undefined =>
  html?.match(AUDIO_URL_REGEX)?.[0];

/** Resolve a 3-letter book ID (e.g. "JHN") to its display name, falling back to the raw ID. */
export const getBookName = (bookId: string): string =>
  getBookById(bookId)?.name ?? bookId;

/** Format a verse reference like "John 3:16" or "John 3:16-18". */
export const formatVerseReference = (
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string => {
  const bookName = getBookName(bookId);
  const range =
    startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
  return `${bookName} ${chapter}:${range}`;
};
