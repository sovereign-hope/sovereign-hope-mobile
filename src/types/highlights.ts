export type HighlightColor = "yellow" | "green" | "blue" | "pink" | "orange";

export type Highlight = {
  /** Locally-generated ID (becomes Firestore document ID on sync) */
  id: string;
  /** ESV book ID, e.g. "JHN" */
  bookId: string;
  /** Chapter number */
  chapter: number;
  /** First verse in the highlighted range */
  startVerse: number;
  /** Last verse in the highlighted range (same as startVerse for single verse) */
  endVerse: number;
  /** Highlight color name */
  color: HighlightColor;
  /** Unix timestamp (ms) */
  createdAt: number;
  /** Unix timestamp (ms) */
  updatedAt: number;
};

/**
 * Lookup map for fast rendering: "JHN:3:16" → HighlightColor
 * Built from the highlights array for O(1) verse lookups during render.
 */
export type HighlightLookup = Record<string, HighlightColor>;
