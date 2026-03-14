export type Note = {
  /** Locally-generated ID (becomes Firestore document ID on sync) */
  id: string;
  /** ESV book ID, e.g. "JHN" */
  bookId: string;
  /** Chapter number */
  chapter: number;
  /** First verse in the noted range */
  startVerse: number;
  /** Last verse in the noted range (same as startVerse for single verse) */
  endVerse: number;
  /** User's note text */
  text: string;
  /** Unix timestamp (ms) */
  createdAt: number;
  /** Unix timestamp (ms) */
  updatedAt: number;
};
