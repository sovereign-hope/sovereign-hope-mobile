import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../config/firebase";
import { getCurrentWeekIndex, getTodayDayIndex } from "../utils/weekIndex";
import type { ReadingPlan } from "../../../shared/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DashboardPage() {
  const [plans, setPlans] = useState<Array<ReadingPlan>>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOverview() {
      try {
        const [plansSnap, membersSnap] = await Promise.all([
          getDocs(collection(db, "readingPlans")),
          getDocs(collection(db, "members")),
        ]);
        setPlans(
          plansSnap.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as ReadingPlan,
          ),
        );
        setMemberCount(membersSnap.size);

        let linked = 0;
        membersSnap.docs.forEach((doc) => {
          if (doc.data().uid) linked++;
        });
        setRegisteredCount(linked);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchOverview();
  }, []);

  if (isLoading) {
    return <div className="text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  const currentYear = new Date().getFullYear();
  const currentPlans = plans.filter((p) =>
    p.id.startsWith(String(currentYear)),
  );
  const weekIndex = getCurrentWeekIndex(currentYear);
  const todayDayIndex = getTodayDayIndex();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">
            Reading Plans ({currentYear})
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-800">
            {currentPlans.length}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">All Plans</div>
          <div className="mt-1 text-2xl font-semibold text-gray-800">
            {plans.length}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">Registered Members</div>
          <div className="mt-1 text-2xl font-semibold text-gray-800">
            {registeredCount ?? "—"}{" "}
            <span className="text-base font-normal text-gray-400">
              / {memberCount ?? "—"}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-400">with app accounts</div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="text-sm text-gray-500">This Week</div>
          <div className="mt-1 text-2xl font-semibold text-gray-800">
            Week {weekIndex + 1}
          </div>
          <div className="mt-1 text-xs text-gray-400">of 52</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/sunday-quick-add"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Add Sunday Readings
        </Link>
        <Link
          to="/reading-plans/new"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Create Reading Plan
        </Link>
        <Link
          to="/members"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Members
        </Link>
      </div>

      {/* This week's reading */}
      {currentPlans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            This Week&rsquo;s Readings
          </h3>
          {currentPlans.map((plan) => {
            const week = plan.weeks[weekIndex];
            if (!week) return null;
            return (
              <div
                key={plan.id}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                  <div className="text-sm font-medium text-gray-800">
                    {plan.title}
                  </div>
                  <Link
                    to={`/reading-plans/${plan.id}`}
                    className="text-xs text-brand-600 hover:text-brand-800"
                  >
                    Edit
                  </Link>
                </div>
                <div className="grid grid-cols-7 divide-x divide-gray-100">
                  {week.days.map((day, dayIdx) => {
                    const isToday = dayIdx === todayDayIndex;
                    const passages = day.reading.filter(Boolean);
                    return (
                      <div
                        key={dayIdx}
                        className={`px-3 py-3 ${isToday ? "bg-blue-50" : ""}`}
                      >
                        <div
                          className={`text-xs font-medium ${isToday ? "text-blue-700" : "text-gray-400"}`}
                        >
                          {DAY_LABELS[dayIdx]}
                        </div>
                        {passages.length > 0 ? (
                          <div className="mt-1 text-xs text-gray-700">
                            {passages.join("; ")}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-gray-300">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current plans list */}
      {currentPlans.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-3">
            <h3 className="text-sm font-medium text-gray-700">
              Current Reading Plans
            </h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {currentPlans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <Link
                    to={`/reading-plans/${plan.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-800"
                  >
                    {plan.title}
                  </Link>
                  {plan.description && (
                    <div className="text-xs text-gray-500">
                      {plan.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {plan.weeks.length} weeks
                  </div>
                </div>
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {plan.id}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
