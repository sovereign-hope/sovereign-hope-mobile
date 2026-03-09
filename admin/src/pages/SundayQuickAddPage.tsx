import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config/firebase";
import type { ReadingPlan } from "../../../shared/types";
import {
  getCurrentWeekIndex,
  getSundayDate,
  getWeekIndexForDate,
} from "../utils/weekIndex";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3);
}

const SUNDAY_INDEX = 6;
const QUARTER_LABELS = ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"];

function parsePassages(value: string): Array<string> {
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const MONTH_NAMES: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse flexible date strings: "January 4", "Jan 4", "1/4", "1/4/2026" */
function parseFlexibleDate(raw: string, fallbackYear: number): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // "1/4" or "1/4/2026"
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1;
    const day = parseInt(slashMatch[2], 10);
    const year = slashMatch[3]
      ? parseInt(slashMatch[3], 10) < 100
        ? 2000 + parseInt(slashMatch[3], 10)
        : parseInt(slashMatch[3], 10)
      : fallbackYear;
    return new Date(year, month, day);
  }

  // "January 4" or "Jan 4" (optional comma, optional year)
  const nameMatch = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?$/);
  if (nameMatch) {
    const month = MONTH_NAMES[nameMatch[1].toLowerCase()];
    if (month === undefined) return null;
    const day = parseInt(nameMatch[2], 10);
    const year = nameMatch[3] ? parseInt(nameMatch[3], 10) : fallbackYear;
    return new Date(year, month, day);
  }

  return null;
}

interface PastedSunday {
  weekIndex: number;
  passages: Array<string>;
  dateLabel: string;
}

/** Parse TSV from Google Sheets clipboard. Returns matched Sundays. */
function parsePastedSundays(
  text: string,
  year: number,
  maxWeeks: number,
): { entries: Array<PastedSunday>; skipped: Array<string> } {
  const entries: Array<PastedSunday> = [];
  const skipped: Array<string> = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split on tab (Google Sheets) or 2+ spaces (fallback)
    const parts = trimmed.includes("\t")
      ? trimmed.split("\t")
      : trimmed.split(/\s{2,}/);

    if (parts.length < 2) {
      skipped.push(trimmed);
      continue;
    }

    const dateStr = parts[0].trim();
    const passageStr = parts.slice(1).join("; ").trim();

    // Skip header rows
    if (/^(date|sunday|passage)/i.test(dateStr) || /^passage$/i.test(passageStr)) {
      continue;
    }

    const date = parseFlexibleDate(dateStr, year);
    if (!date) {
      skipped.push(trimmed);
      continue;
    }

    const weekIndex = getWeekIndexForDate(year, date);
    if (weekIndex < 0 || weekIndex >= maxWeeks) {
      skipped.push(trimmed);
      continue;
    }

    const passages = passageStr
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    if (passages.length > 0) {
      entries.push({
        weekIndex,
        passages,
        dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
  }

  return { entries, skipped };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SundayEntry {
  weekIndex: number;
  date: Date;
  quarter: number;
  passages: Array<string>;
}

export function SundayQuickAddPage() {
  const [plans, setPlans] = useState<Array<ReadingPlan>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeQuarter, setActiveQuarter] = useState(() => getQuarter(new Date()));
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteRevision, setPasteRevision] = useState(0);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const currentWeekRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    getDocs(collection(db, "readingPlans"))
      .then((snap) => {
        setPlans(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as ReadingPlan)
            .sort((a, b) => b.id.localeCompare(a.id)),
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  const currentYear = new Date().getFullYear();
  const currentWeekIndex = getCurrentWeekIndex(currentYear);

  const currentYearPlans = useMemo(
    () => plans.filter((p) => p.id.startsWith(String(currentYear))),
    [plans, currentYear],
  );

  const maxWeeks = useMemo(
    () => Math.max(0, ...currentYearPlans.map((p) => p.weeks.length)),
    [currentYearPlans],
  );

  // Build all Sundays for the year
  const allSundays = useMemo(() => {
    if (currentYearPlans.length === 0) return [];
    const sundays: Array<SundayEntry> = [];

    for (let wi = 0; wi < maxWeeks; wi++) {
      const sundayDate = getSundayDate(currentYear, wi);
      if (sundayDate.getFullYear() !== currentYear) continue;

      let passages: Array<string> = [];
      for (const plan of currentYearPlans) {
        const day = plan.weeks[wi]?.days[SUNDAY_INDEX];
        const reading = day?.reading.filter(Boolean) ?? [];
        if (reading.length > 0) {
          passages = reading;
          break;
        }
      }

      sundays.push({
        weekIndex: wi,
        date: sundayDate,
        quarter: getQuarter(sundayDate),
        passages,
      });
    }

    return sundays;
  }, [currentYearPlans, currentYear, maxWeeks]);

  const visibleSundays = useMemo(
    () => allSundays.filter((s) => s.quarter === activeQuarter),
    [allSundays, activeQuarter],
  );

  // Scroll to current week when switching to its quarter
  useEffect(() => {
    if (activeQuarter === getQuarter(new Date())) {
      // Small delay to let DOM render
      requestAnimationFrame(() => {
        currentWeekRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    }
  }, [activeQuarter]);

  const handleSaveAll = useCallback(async () => {
    if (currentYearPlans.length === 0) return;

    // Collect edits from ALL inputs (not just visible quarter)
    const edits: Array<{ weekIndex: number; passages: Array<string> }> = [];
    for (const { weekIndex, passages: existing } of allSundays) {
      const input = inputRefs.current[weekIndex];
      if (!input) continue;

      const next = parsePassages(input.value);
      const changed =
        next.length !== existing.length ||
        next.some((p, i) => p !== existing[i]);
      if (changed) {
        edits.push({ weekIndex, passages: next });
      }
    }

    if (edits.length === 0) return;

    setStatus("saving");
    setErrorMsg("");

    try {
      const saveReadingPlan = httpsCallable(functions, "saveReadingPlan");
      const currentYearIds = new Set(currentYearPlans.map((p) => p.id));

      const updatedPlans = plans.map((plan) => {
        if (!currentYearIds.has(plan.id)) return plan;

        let changed = false;
        const weeks = [...plan.weeks];

        for (const { weekIndex, passages } of edits) {
          if (weekIndex >= weeks.length) continue;
          changed = true;
          const week = { ...weeks[weekIndex], days: [...weeks[weekIndex].days] };
          week.days[SUNDAY_INDEX] = {
            ...week.days[SUNDAY_INDEX],
            reading: passages,
          };
          weeks[weekIndex] = week;
        }

        return changed ? { ...plan, weeks } : plan;
      });

      const plansToSave = updatedPlans.filter((plan, i) => plan !== plans[i]);
      await Promise.all(
        plansToSave.map((plan) => saveReadingPlan({ plan })),
      );

      setPlans(updatedPlans);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
    }
  }, [plans, currentYearPlans, allSundays]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, visibleIdx: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const nextSunday = visibleSundays[visibleIdx + 1];
        if (nextSunday) {
          inputRefs.current[nextSunday.weekIndex]?.focus();
        } else {
          e.currentTarget.blur();
        }
      }
    },
    [visibleSundays],
  );

  const handlePasteApply = useCallback(async () => {
    if (!pasteText.trim() || currentYearPlans.length === 0) return;

    const { entries, skipped } = parsePastedSundays(pasteText, currentYear, maxWeeks);
    if (entries.length === 0) {
      setStatus("error");
      setErrorMsg("No valid date/passage rows found");
      return;
    }

    setStatus("saving");
    setErrorMsg("");

    try {
      const saveReadingPlan = httpsCallable(functions, "saveReadingPlan");
      const currentYearIds = new Set(currentYearPlans.map((p) => p.id));

      const updatedPlans = plans.map((plan) => {
        if (!currentYearIds.has(plan.id)) return plan;

        let changed = false;
        const weeks = [...plan.weeks];

        for (const { weekIndex, passages } of entries) {
          if (weekIndex >= weeks.length) continue;
          changed = true;
          const week = { ...weeks[weekIndex], days: [...weeks[weekIndex].days] };
          week.days[SUNDAY_INDEX] = {
            ...week.days[SUNDAY_INDEX],
            reading: passages,
          };
          weeks[weekIndex] = week;
        }

        return changed ? { ...plan, weeks } : plan;
      });

      const plansToSave = updatedPlans.filter((plan, i) => plan !== plans[i]);
      await Promise.all(plansToSave.map((plan) => saveReadingPlan({ plan })));

      setPlans(updatedPlans);
      setPasteRevision((r) => r + 1);
      setShowPaste(false);
      setPasteText("");
      setStatus("saved");
      setErrorMsg(
        skipped.length > 0
          ? `Saved ${entries.length} Sundays (${skipped.length} rows skipped)`
          : "",
      );
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
    }
  }, [pasteText, plans, currentYearPlans, currentYear, maxWeeks]);

  if (isLoading) {
    return <div className="text-gray-500">Loading plans...</div>;
  }

  if (currentYearPlans.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">
          Sunday Quick-Add
        </h2>
        <p className="text-sm text-gray-500">
          No {currentYear} reading plans found. Create one first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Sunday Quick-Add
          </h2>
          <p className="text-sm text-gray-500">
            Separate passages with semicolons. Saves to{" "}
            {currentYearPlans.length}{" "}
            {currentYear} plan{currentYearPlans.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status === "saved" && (
            <span className="text-sm text-green-600">Saved</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">{errorMsg}</span>
          )}
          <button
            onClick={() => setShowPaste((v) => !v)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Paste from Spreadsheet
          </button>
          <button
            onClick={handleSaveAll}
            disabled={status === "saving"}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Quarter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {QUARTER_LABELS.map((label, q) => (
          <button
            key={q}
            onClick={() => setActiveQuarter(q)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeQuarter === q
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Paste from spreadsheet panel */}
      {showPaste && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Paste rows from Google Sheets
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              Two columns: date and passage(s). Dates like &ldquo;January 4&rdquo;, &ldquo;Jan 4&rdquo;, or &ldquo;1/4&rdquo; all work.
            </p>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"January 4\tGalatians 5:25-6:5\nJanuary 11\tGenesis 12:1-20"}
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setShowPaste(false);
                setPasteText("");
              }}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handlePasteApply}
              disabled={status === "saving" || !pasteText.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {status === "saving" ? "Saving..." : "Apply & Save"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-28 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Passages
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleSundays.map(({ weekIndex, date, passages }, idx) => {
              const isCurrent = weekIndex === currentWeekIndex;
              const isPast = weekIndex < currentWeekIndex;

              return (
                <tr
                  key={weekIndex}
                  ref={isCurrent ? currentWeekRef : undefined}
                  className={
                    isCurrent
                      ? "bg-blue-50"
                      : isPast
                        ? "opacity-50"
                        : undefined
                  }
                >
                  <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                    {formatDate(date)}
                    {isCurrent && (
                      <span className="ml-1.5 text-xs text-blue-600">
                        This week
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      key={`${weekIndex}-${pasteRevision}`}
                      ref={(el) => {
                        inputRefs.current[weekIndex] = el;
                      }}
                      type="text"
                      defaultValue={passages.join("; ")}
                      placeholder="e.g. Romans 8:1-11; Psalm 23"
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      disabled={status === "saving"}
                      className="w-full rounded border border-gray-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-600 focus:ring-1 focus:ring-brand-600 disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
