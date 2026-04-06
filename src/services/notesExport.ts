import { formatVerseReference, getBookName } from "src/app/bibleUtils";
import { BIBLE_BOOKS } from "src/constants/bibleBooks";
import type { Note } from "src/types/notes";

const bookOrder = new Map(BIBLE_BOOKS.map((book, index) => [book.id, index]));

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

type ParagraphStyleKind =
  | "title"
  | "subtitle"
  | "timestamp"
  | "bookHeading"
  | "passageHeading";

type TextStyleKind = "subtitle" | "timestamp" | "metadata";

type StyleRange<TKind extends string> = {
  kind: TKind;
  startIndex: number;
  endIndex: number;
};

export type NotesExportDocument = {
  text: string;
  paragraphStyles: StyleRange<ParagraphStyleKind>[];
  textStyles: StyleRange<TextStyleKind>[];
};

const getBookOrder = (bookId: string): number =>
  bookOrder.get(bookId) ?? Number.POSITIVE_INFINITY;

const formatReadableDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = monthLabels[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();

  return `${month} ${day}, ${year}`;
};

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

const createDocumentBuilder = () => {
  const paragraphStyles: NotesExportDocument["paragraphStyles"] = [];
  const textStyles: NotesExportDocument["textStyles"] = [];
  let text = "";

  const appendParagraph = (
    value: string,
    options?: {
      paragraphStyle?: ParagraphStyleKind;
      textStyle?: TextStyleKind;
    }
  ) => {
    const startIndex = text.length + 1;
    text += value;
    const textEndIndex = text.length + 1;
    text += "\n";
    const paragraphEndIndex = text.length + 1;

    if (options?.paragraphStyle) {
      paragraphStyles.push({
        kind: options.paragraphStyle,
        startIndex,
        endIndex: paragraphEndIndex,
      });
    }

    if (options?.textStyle) {
      textStyles.push({
        kind: options.textStyle,
        startIndex,
        endIndex: textEndIndex,
      });
    }
  };

  const appendParagraphBlock = (value: string) => {
    const lines = value.split("\n");
    for (const line of lines) {
      appendParagraph(line);
    }
  };

  const appendBlankLine = (count = 1) => {
    text += "\n".repeat(count);
  };

  return {
    appendBlankLine,
    appendParagraph,
    appendParagraphBlock,
    build: (): NotesExportDocument => ({
      text,
      paragraphStyles,
      textStyles,
    }),
  };
};

const renderNoteMetadata = (note: Note): string => {
  const createdDate = formatReadableDate(note.createdAt);
  const updatedDate = formatReadableDate(note.updatedAt);

  if (createdDate === updatedDate) {
    return `Added ${createdDate}`;
  }

  return `Added ${createdDate} • Updated ${updatedDate}`;
};

export const buildNotesExportDocument = (
  notes: Note[],
  options?: { now?: number }
): NotesExportDocument => {
  const now = options?.now ?? Date.now();
  const builder = createDocumentBuilder();

  builder.appendParagraph("Bible Notes", { paragraphStyle: "title" });
  builder.appendParagraph("From the Sovereign Hope app", {
    paragraphStyle: "subtitle",
    textStyle: "subtitle",
  });
  builder.appendParagraph(`Last updated ${formatReadableTimestamp(now)}`, {
    paragraphStyle: "timestamp",
    textStyle: "timestamp",
  });
  builder.appendBlankLine();

  if (notes.length === 0) {
    builder.appendParagraph("No notes yet.");
    return builder.build();
  }

  const sortedNotes = [...notes].sort(compareNotes);
  const notesByBook = new Map<string, Note[]>();

  for (const note of sortedNotes) {
    const bookNotes = notesByBook.get(note.bookId) ?? [];
    bookNotes.push(note);
    notesByBook.set(note.bookId, bookNotes);
  }

  let isFirstBook = true;
  for (const [bookId, bookNotes] of notesByBook.entries()) {
    if (!isFirstBook) {
      builder.appendBlankLine();
    }

    builder.appendParagraph(getBookName(bookId), {
      paragraphStyle: "bookHeading",
    });
    builder.appendBlankLine();

    let isFirstNote = true;
    for (const note of bookNotes) {
      if (!isFirstNote) {
        builder.appendBlankLine();
      }

      builder.appendParagraph(
        formatVerseReference(
          note.bookId,
          note.chapter,
          note.startVerse,
          note.endVerse
        ),
        { paragraphStyle: "passageHeading" }
      );
      builder.appendParagraph(renderNoteMetadata(note), {
        textStyle: "metadata",
      });
      builder.appendBlankLine();
      builder.appendParagraphBlock(note.text);

      isFirstNote = false;
    }

    isFirstBook = false;
  }

  return builder.build();
};

export const renderNotesExport = (
  notes: Note[],
  options?: { now?: number }
): string => {
  return buildNotesExportDocument(notes, options).text.trimEnd();
};
