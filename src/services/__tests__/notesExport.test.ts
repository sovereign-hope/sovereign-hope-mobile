import { renderNotesExport } from "../notesExport";
import type { Note } from "src/types/notes";

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: "note-1",
  bookId: "JHN",
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  text: "For God so loved the world.",
  createdAt: Date.UTC(2026, 3, 1, 12),
  updatedAt: Date.UTC(2026, 3, 2, 12),
  ...overrides,
});

describe("renderNotesExport", () => {
  it("renders a stable empty-state export", () => {
    expect(renderNotesExport([], { now: Date.UTC(2026, 3, 6, 21, 10) })).toBe(
      [
        "Sovereign Hope Notes",
        "Last synced: 2026-04-06T21:10:00.000Z",
        "No notes yet.",
      ].join("\n\n")
    );
  });

  it("renders notes across multiple books in canonical order", () => {
    const exportText = renderNotesExport(
      [
        makeNote({
          id: "note-john",
          bookId: "JHN",
          chapter: 1,
          startVerse: 1,
          text: "In the beginning was the Word.",
        }),
        makeNote({
          id: "note-genesis",
          bookId: "GEN",
          chapter: 1,
          startVerse: 1,
          text: "In the beginning, God created.",
        }),
        makeNote({
          id: "note-acts",
          bookId: "ACT",
          chapter: 2,
          startVerse: 42,
          text: "They devoted themselves to the apostles' teaching.",
        }),
      ],
      { now: Date.UTC(2026, 3, 6, 20, 32) }
    );

    expect(exportText).toContain("Genesis\n\nGenesis 1:1");
    expect(exportText).toContain("John\n\nJohn 1:1");
    expect(exportText).toContain("Acts\n\nActs 2:42");
    expect(exportText.indexOf("Genesis\n\nGenesis 1:1")).toBeLessThan(
      exportText.indexOf("John\n\nJohn 1:1")
    );
    expect(exportText.indexOf("John\n\nJohn 1:1")).toBeLessThan(
      exportText.indexOf("Acts\n\nActs 2:42")
    );
  });

  it("renders verse ranges and deterministic timestamps", () => {
    expect(
      renderNotesExport(
        [
          makeNote({
            id: "note-range",
            endVerse: 18,
            createdAt: Date.UTC(2026, 0, 2, 9, 30),
            updatedAt: Date.UTC(2026, 2, 5, 18, 45),
            text: "Jesus did not come to condemn the world.",
          }),
        ],
        { now: Date.UTC(2026, 3, 6, 22, 0) }
      )
    ).toBe(
      [
        "Sovereign Hope Notes",
        "Last synced: 2026-04-06T22:00:00.000Z",
        [
          "John",
          [
            "John 3:16-18",
            "Created: 2026-01-02",
            "Updated: 2026-03-05",
            "",
            "Jesus did not come to condemn the world.",
          ].join("\n"),
        ].join("\n\n"),
      ].join("\n\n")
    );
  });
});
