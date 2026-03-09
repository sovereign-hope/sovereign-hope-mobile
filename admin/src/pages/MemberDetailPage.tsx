import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import type {
  MemberProfile,
  ReadingPlanProgressState,
} from "../../../shared/types";

export function MemberDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [progress, setProgress] = useState<Record<string, ReadingPlanProgressState>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    async function loadMemberData() {
      try {
        // Load member profile (docs are keyed by Planning Center ID, not UID)
        const memberQuery = await getDocs(
          query(collection(db, "members"), where("uid", "==", uid!)),
        );
        if (!memberQuery.empty) {
          const d = memberQuery.docs[0];
          setMember({ uid: d.data().uid, ...d.data() } as MemberProfile);
        }

        // Load reading plan progress
        const progressSnap = await getDocs(
          collection(db, "users", uid!, "progress"),
        );
        const progressMap: Record<string, ReadingPlanProgressState> = {};
        progressSnap.forEach((d) => {
          progressMap[d.id] = d.data() as ReadingPlanProgressState;
        });
        setProgress(progressMap);
      } catch (err) {
        console.error("Failed to load member data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMemberData();
  }, [uid]);

  if (isLoading) {
    return <div className="text-gray-500">Loading member...</div>;
  }

  const progressEntries = Object.entries(progress);

  const getCompletionPercentage = (state: ReadingPlanProgressState): number => {
    let completed = 0;
    let total = 0;
    for (const week of state.weeks) {
      for (const day of week.days) {
        total++;
        if (day.isCompleted) completed++;
      }
    }
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/members")}
        className="text-sm text-brand-600 hover:text-brand-800"
      >
        &larr; Members
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-gray-800">
          {member?.displayName || uid}
        </h2>
        {member && (
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            {member.email && <p>Email: {member.email}</p>}
            <p>UID: {member.uid}</p>
            {member.createdAt && (
              <p>
                Joined:{" "}
                {new Date(member.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {member.planningCenterPersonId && (
              <p>Planning Center ID: {member.planningCenterPersonId}</p>
            )}
          </div>
        )}
        {!member && (
          <p className="mt-2 text-sm text-gray-500">
            No member profile linked.
          </p>
        )}
      </div>

      {/* Reading plan progress */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-medium text-gray-700">
            Reading Plan Progress
          </h3>
        </div>
        {progressEntries.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">
            No reading progress yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {progressEntries.map(([planId, state]) => {
              const pct = getCompletionPercentage(state);
              return (
                <li
                  key={planId}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="text-sm text-gray-800">
                    <span className="font-medium">{planId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{pct}%</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
