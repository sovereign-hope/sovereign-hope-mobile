import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../config/firebase";
import type { ReadingPlan } from "../../../shared/types";

function countPassages(plan: ReadingPlan): number {
  return plan.weeks.reduce(
    (sum, w) =>
      sum + w.days.reduce((s, d) => s + d.reading.filter(Boolean).length, 0),
    0,
  );
}

function hasMemoryVerses(plan: ReadingPlan): boolean {
  return plan.weeks.some((w) => w.days.some((d) => Boolean(d.memory.passage)));
}

export function ReadingPlanListPage() {
  const [plans, setPlans] = useState<Array<ReadingPlan>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    getDocs(collection(db, "readingPlans"))
      .then((snap) => {
        setPlans(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as ReadingPlan)
            .sort((a, b) => b.id.localeCompare(a.id)),
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load plans");
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="text-gray-500">Loading plans...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Reading Plans</h2>
        <Link
          to="/reading-plans/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Create New Plan
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Plan
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Weeks
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Passages
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Memory Verses
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => {
              const isCurrent = plan.id.startsWith(String(currentYear));
              const passages = countPassages(plan);
              const hasMemory = hasMemoryVerses(plan);

              return (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/reading-plans/${plan.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-800"
                      >
                        {plan.title || plan.id}
                      </Link>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          isCurrent
                            ? "bg-brand-50 text-brand-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {plan.id}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3 text-sm text-gray-500">
                    {plan.description || "—"}
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-700">
                    {plan.weeks.length}
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-700">
                    {passages}
                  </td>
                  <td className="px-5 py-3 text-center text-sm">
                    {hasMemory ? (
                      <span className="text-green-600">&#10003;</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-sm">
                    <Link
                      to={`/reading-plans/${plan.id}`}
                      className="text-brand-600 hover:text-brand-800"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {plans.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  No reading plans found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
