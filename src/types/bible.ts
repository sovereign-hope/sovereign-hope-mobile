/**
 * A specific Bible reference: book + chapter, optionally with a verse.
 */
export type BibleReference = {
  bookId: string;
  chapter: number;
  verse?: number;
};

/**
 * A range of Bible text, from a start reference to an optional end reference.
 * If `end` is omitted, the range is a single point (one verse or one chapter).
 */
export type BibleRange = {
  start: BibleReference;
  end?: BibleReference;
};

/**
 * A lightweight Bible location used for browse-mode navigation.
 * Always represents a whole chapter (no verse granularity).
 */
export type BibleLocation = {
  bookId: string;
  chapter: number;
};

/** The default Bible location when no saved state exists */
export const DEFAULT_BIBLE_LOCATION: BibleLocation = {
  bookId: "GEN",
  chapter: 1,
};
