import axios from "axios";
import { routes } from "src/redux/esvRoutes.constants";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";

interface EsvTextResponse {
  passages: string[];
}

/**
 * Build an ESV passage query string from a book ID, chapter, and verse range.
 * E.g. ("JHN", 3, 16, 18) → "John 3:16-18"
 */
const buildPassageQuery = (
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): string => {
  const bookName = BIBLE_BOOKS.find((b) => b.id === bookId)?.name ?? bookId;
  const range =
    startVerse === endVerse ? `${startVerse}` : `${startVerse}-${endVerse}`;
  return `${bookName} ${chapter}:${range}`;
};

/**
 * Fetch plain text for a verse range from the ESV API.
 * Returns the trimmed text, or an empty string on failure.
 */
export const fetchVersePlainText = async (
  bookId: string,
  chapter: number,
  startVerse: number,
  endVerse: number
): Promise<string> => {
  const query = buildPassageQuery(bookId, chapter, startVerse, endVerse);
  const response = await axios.get<EsvTextResponse>(
    routes.passagePlainText(query),
    { timeout: 10_000 }
  );
  return (response.data.passages?.[0] ?? "").trim();
};
