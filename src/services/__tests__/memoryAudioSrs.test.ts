import {
  applySrsOutcome,
  calculateNextReviewDate,
  createInitialSrsEntry,
} from "src/services/memoryAudioSrs";

describe("memoryAudioSrs", () => {
  it("advances intervals on completion", () => {
    const result = calculateNextReviewDate(
      0,
      "completed",
      new Date("2026-01-01T12:00:00")
    );
    expect(result.nextInterval).toBe(1);
    expect(result.nextDate).toBe("2026-01-02");
  });

  it("compresses intervals on abandonment", () => {
    const result = calculateNextReviewDate(
      14,
      "abandoned",
      new Date("2026-01-01T12:00:00")
    );
    expect(result.nextInterval).toBe(7);
    expect(result.nextDate).toBe("2026-01-08");
  });

  it("handles year rollover dates", () => {
    const result = calculateNextReviewDate(
      1,
      "completed",
      new Date("2026-12-31T12:00:00")
    );
    expect(result.nextInterval).toBe(3);
    expect(result.nextDate).toBe("2027-01-03");
  });

  it("handles leap year boundaries", () => {
    const result = calculateNextReviewDate(
      1,
      "completed",
      new Date("2028-02-28T12:00:00")
    );
    expect(result.nextInterval).toBe(3);
    expect(result.nextDate).toBe("2028-03-02");
  });

  it("only advances once per day on repeated completions", () => {
    const firstCompletion = applySrsOutcome(
      createInitialSrsEntry("Psalm 119:105", new Date("2026-02-27T12:00:00")),
      "Psalm 119:105",
      "completed",
      new Date("2026-02-27T12:00:00")
    );
    const secondCompletion = applySrsOutcome(
      firstCompletion,
      "Psalm 119:105",
      "completed",
      new Date("2026-02-27T16:00:00")
    );

    expect(firstCompletion.currentInterval).toBe(1);
    expect(secondCompletion.currentInterval).toBe(1);
    expect(secondCompletion.totalCompletions).toBe(2);
  });
});
