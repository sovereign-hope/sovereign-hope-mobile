import { getDateFromTimeString } from "src/screens/SettingsScreen/timeParsing";

describe("getDateFromTimeString", () => {
  const fallback = new Date(2026, 2, 5, 9, 15, 22, 100);

  it("parses AM times", () => {
    const parsed = getDateFromTimeString("9:30 AM", fallback);

    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
    expect(parsed.getSeconds()).toBe(0);
    expect(parsed.getMilliseconds()).toBe(0);
  });

  it("parses PM times", () => {
    const parsed = getDateFromTimeString("9:30 PM", fallback);

    expect(parsed.getHours()).toBe(21);
    expect(parsed.getMinutes()).toBe(30);
  });

  it("handles 12:xx AM/PM correctly", () => {
    expect(getDateFromTimeString("12:00 AM", fallback).getHours()).toBe(0);
    expect(getDateFromTimeString("12:00 PM", fallback).getHours()).toBe(12);
  });

  it("accepts lowercase am/pm", () => {
    const parsed = getDateFromTimeString("7:05 pm", fallback);

    expect(parsed.getHours()).toBe(19);
    expect(parsed.getMinutes()).toBe(5);
  });

  it("returns fallback date for malformed or out-of-range values", () => {
    const malformed = [
      "",
      "9:30",
      "9:30 ZZ",
      "00:10 AM",
      "13:10 PM",
      "11:60 AM",
      "hello",
    ];

    for (const value of malformed) {
      expect(getDateFromTimeString(value, fallback)).toBe(fallback);
    }
  });
});
