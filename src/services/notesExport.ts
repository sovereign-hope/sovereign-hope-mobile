import { formatVerseReference, getBookName } from "src/app/bibleUtils";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import type { Note } from "src/types/notes";

const bookOrder = new Map(BIBLE_BOOKS.map((book, index) => [book.id, index]));

const getBookOrder = (bookId: string): number =>
  bookOrder.get(bookId) ?? Number.POSITIVE_INFINITY;

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toISOString().slice(0, 10);

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const formatReadableTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = monthLabels[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hour24 = date.getUTCHours();
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${month} ${day}, ${year}, ${hour12}:${minute} ${meridiem} UTC`;
};

const compareNotes = (left: Note, right: Note): number =>
  getBookOrder(left.bookId) - getBookOrder(right.bookId) ||
  left.chapter - right.chapter ||
  left.startVerse - right.startVerse ||
  left.createdAt - right.createdAt ||
  left.updatedAt - right.updatedAt ||
  left.id.localeCompare(right.id);

const renderNoteBlock = (note: Note): string =>
  [
    formatVerseReference(
      note.bookId,
      note.chapter,
      note.startVerse,
      note.endVerse
    ),
    `Created: ${formatDate(note.createdAt)}`,
    `Updated: ${formatDate(note.updatedAt)}`,
    "",
    note.text,
  ].join("\n");

export const renderNotesExport = (
  notes: Note[],
  options?: { now?: number }
): string => {
  const now = options?.now ?? Date.now();
  const header = [
    "Bible Notes",
    "From the Sovereign Hope app",
    `Last updated: ${formatReadableTimestamp(now)}`,
  ];

  if (notes.length === 0) {
    return [...header, "No notes yet."].join("\n\n");
  }

  const sortedNotes = [...notes].sort(compareNotes);
  const notesByBook = new Map<string, Note[]>();

  for (const note of sortedNotes) {
    const bookNotes = notesByBook.get(note.bookId) ?? [];
    bookNotes.push(note);
    notesByBook.set(note.bookId, bookNotes);
  }

  const sections = [...notesByBook.entries()].map(([bookId, bookNotes]) =>
    [
      getBookName(bookId),
      ...bookNotes.map((note) => renderNoteBlock(note)),
    ].join("\n\n")
  );

  return [...header, ...sections].join("\n\n");
};
