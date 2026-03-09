import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config/firebase";
import type {
  ReadingPlan,
  ReadingPlanWeek,
  ReadingPlanDay,
} from "../../../shared/types";

function createEmptyPlan(): ReadingPlan {
  return {
    id: "",
    title: "",
    description: "",
    weeks: Array.from({ length: 52 }, () => ({
      days: Array.from({ length: 7 }, () => ({
        reading: [],
        memory: { passage: "", heading: "" },
      })),
    })),
  };
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface UndoPassage {
  weekIndex: number;
  dayIndex: number;
  passageIndex: number;
  passage: string;
}

export function ReadingPlanEditorPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const isNew = !planId;

  const [plan, setPlan] = useState<ReadingPlan>(createEmptyPlan);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Undo state for passage removal
  const [undoPassage, setUndoPassage] = useState<UndoPassage | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Cleanup undo timer
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!planId) return;
    getDoc(doc(db, "readingPlans", planId))
      .then((snap) => {
        if (snap.exists()) {
          setPlan({ id: snap.id, ...snap.data() } as ReadingPlan);
        }
      })
      .catch((err) => console.error("Failed to load plan:", err))
      .finally(() => setIsLoading(false));
  }, [planId]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const updateDay = useCallback(
    (
      weekIndex: number,
      dayIndex: number,
      updates: Partial<ReadingPlanDay>,
    ) => {
      setPlan((prev) => {
        const weeks = [...prev.weeks];
        const week = {
          ...weeks[weekIndex],
          days: [...weeks[weekIndex].days],
        };
        week.days[dayIndex] = { ...week.days[dayIndex], ...updates };
        weeks[weekIndex] = week;
        return { ...prev, weeks };
      });
      markDirty();
    },
    [markDirty],
  );

  const addPassage = useCallback(
    (weekIndex: number, dayIndex: number) => {
      const day = plan.weeks[weekIndex].days[dayIndex];
      updateDay(weekIndex, dayIndex, { reading: [...day.reading, ""] });
    },
    [plan, updateDay],
  );

  const updatePassage = useCallback(
    (
      weekIndex: number,
      dayIndex: number,
      passageIndex: number,
      value: string,
    ) => {
      const day = plan.weeks[weekIndex].days[dayIndex];
      const reading = [...day.reading];
      reading[passageIndex] = value;
      updateDay(weekIndex, dayIndex, { reading });
    },
    [updateDay],
  );

  const removePassage = useCallback(
    (weekIndex: number, dayIndex: number, passageIndex: number) => {
      const day = plan.weeks[weekIndex].days[dayIndex];
      const removedPassage = day.reading[passageIndex];
      const reading = day.reading.filter((_, i) => i !== passageIndex);
      updateDay(weekIndex, dayIndex, { reading });

      // Set up undo
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoPassage({
        weekIndex,
        dayIndex,
        passageIndex,
        passage: removedPassage,
      });
      undoTimerRef.current = setTimeout(() => {
        setUndoPassage(null);
      }, 5000);
    },
    [updateDay],
  );

  const handleUndo = useCallback(() => {
    if (!undoPassage) return;
    const { weekIndex, dayIndex, passageIndex, passage } = undoPassage;
    setPlan((prev) => {
      const weeks = [...prev.weeks];
      const week = { ...weeks[weekIndex], days: [...weeks[weekIndex].days] };
      const day = { ...week.days[dayIndex] };
      const reading = [...day.reading];
      reading.splice(passageIndex, 0, passage);
      day.reading = reading;
      week.days[dayIndex] = day;
      weeks[weekIndex] = week;
      return { ...prev, weeks };
    });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoPassage(null);
  }, [undoPassage]);

  const handleSave = async () => {
    if (!plan.id.trim()) {
      setSaveMessage("Plan ID is required");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const saveReadingPlan = httpsCallable(functions, "saveReadingPlan");
      await saveReadingPlan({ plan });
      setSaveMessage("Plan saved");
      setIsDirty(false);
      if (isNew) {
        navigate(`/reading-plans/${plan.id}`, { replace: true });
      }
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportJson = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as ReadingPlan;
        if (!imported.weeks || !Array.isArray(imported.weeks)) {
          throw new Error("Invalid plan format: missing weeks array");
        }
        setPlan(imported);
        setIsDirty(true);
        setSaveMessage("Imported — review and save");
      } catch (err) {
        setSaveMessage(
          err instanceof Error ? err.message : "Failed to import",
        );
      }
    };
    input.click();
  }, []);

  if (isLoading) {
    return <div className="text-gray-500">Loading plan...</div>;
  }

  const weekHasContent = (week: ReadingPlanWeek) =>
    week.days.some(
      (d) => d.reading.length > 0 || d.memory.passage || d.memory.heading,
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">
          {isNew ? "Create Reading Plan" : `Editing ${plan.title || planId}`}
        </h2>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          <button
            onClick={handleImportJson}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Import JSON
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            saveMessage.includes("saved") || saveMessage.includes("Imported")
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {saveMessage}
        </div>
      )}

      {/* Plan metadata */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Plan ID
            </label>
            <input
              type="text"
              value={plan.id}
              onChange={(e) => {
                setPlan({ ...plan, id: e.target.value });
                markDirty();
              }}
              disabled={!isNew}
              placeholder='e.g., "2026" or "2026.1"'
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use year (e.g., 2026) or year.1 for multi-year plans
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={plan.title}
              onChange={(e) => {
                setPlan({ ...plan, title: e.target.value });
                markDirty();
              }}
              placeholder="e.g., Two Year Bible"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <input
            type="text"
            value={plan.description}
            onChange={(e) => {
              setPlan({ ...plan, description: e.target.value });
              markDirty();
            }}
            placeholder="Brief description of the reading plan"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-700">
          Weeks ({plan.weeks.length})
        </h3>

        {plan.weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="rounded-lg border border-gray-200 bg-white"
          >
            <button
              onClick={() =>
                setExpandedWeek(
                  expandedWeek === weekIndex ? null : weekIndex,
                )
              }
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">
                Week {weekIndex + 1}
                {weekHasContent(week) && (
                  <span className="ml-2 text-xs text-green-600">✓</span>
                )}
              </span>
              <span className="text-gray-400">
                {expandedWeek === weekIndex ? "▲" : "▼"}
              </span>
            </button>

            {expandedWeek === weekIndex && (
              <div className="space-y-4 border-t border-gray-200 p-4">
                {/* Undo banner */}
                {undoPassage && undoPassage.weekIndex === weekIndex && (
                  <div className="flex items-center justify-between rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <span>
                      Removed &ldquo;
                      {undoPassage.passage.length > 30
                        ? undoPassage.passage.slice(0, 30) + "…"
                        : undoPassage.passage || "empty passage"}
                      &rdquo;
                    </span>
                    <button
                      onClick={handleUndo}
                      className="font-medium text-amber-700 hover:text-amber-900"
                    >
                      Undo
                    </button>
                  </div>
                )}

                {week.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-xs font-medium text-gray-500">
                        {DAY_LABELS[dayIndex]}
                      </span>
                      <button
                        onClick={() => addPassage(weekIndex, dayIndex)}
                        className="text-xs text-brand-600 hover:text-brand-800"
                      >
                        + Add Passage
                      </button>
                    </div>

                    {day.reading.map((passage, pIndex) => (
                      <div key={pIndex} className="ml-12 flex gap-2">
                        <input
                          type="text"
                          value={passage}
                          onChange={(e) =>
                            updatePassage(
                              weekIndex,
                              dayIndex,
                              pIndex,
                              e.target.value,
                            )
                          }
                          placeholder="e.g., Matthew 1:1-25"
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() =>
                            removePassage(weekIndex, dayIndex, pIndex)
                          }
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    {/* Memory verse */}
                    <div className="ml-12 flex gap-2">
                      <input
                        type="text"
                        value={day.memory.passage}
                        onChange={(e) =>
                          updateDay(weekIndex, dayIndex, {
                            memory: {
                              ...day.memory,
                              passage: e.target.value,
                            },
                          })
                        }
                        placeholder="Memory passage"
                        className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={day.memory.heading}
                        onChange={(e) =>
                          updateDay(weekIndex, dayIndex, {
                            memory: {
                              ...day.memory,
                              heading: e.target.value,
                            },
                          })
                        }
                        placeholder="Memory heading"
                        className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
