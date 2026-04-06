import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../config/firebase";
import type {
  MemberProfile,
  ReadingPlanProgressState,
} from "../../../shared/types";

interface PcoSearchResult {
  docId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  firstName: string | null;
  lastName: string | null;
  planningCenterPersonId: string;
}

export function MemberDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [progress, setProgress] = useState<Record<string, ReadingPlanProgressState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPcoLinked, setIsPcoLinked] = useState(false);

  // PCO linking state
  const [pcoSearch, setPcoSearch] = useState("");
  const [pcoResults, setPcoResults] = useState<Array<PcoSearchResult>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  const loadMemberData = useCallback(async () => {
    if (!uid) return;

    try {
      const memberQuery = await getDocs(
        query(collection(db, "members"), where("uid", "==", uid)),
      );
      if (!memberQuery.empty) {
        const d = memberQuery.docs[0];
        const data = d.data();
        setMember({ uid: data.uid, ...data } as MemberProfile);
        setIsPcoLinked(data.source === "planning_center" || !!data.planningCenterPersonId);
      } else {
        setMember(null);
        setIsPcoLinked(false);
      }

      const progressSnap = await getDocs(
        collection(db, "users", uid, "progress"),
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
  }, [uid]);

  useEffect(() => {
    loadMemberData();
  }, [loadMemberData]);

  const handlePcoSearch = async () => {
    if (!pcoSearch.trim()) return;
    setIsSearching(true);
    setLinkError("");
    setPcoResults([]);

    try {
      const searchFn = httpsCallable<
        { query: string },
        { results: Array<PcoSearchResult> }
      >(functions, "searchUnlinkedPcoMembers");
      const result = await searchFn({ query: pcoSearch.trim() });
      setPcoResults(result.data.results);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setLinkError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (pcoDocId: string) => {
    if (!uid) return;
    setIsLinking(true);
    setLinkError("");
    setLinkSuccess("");

    try {
      const linkFn = httpsCallable<
        { uid: string; pcoDocId: string },
        { success: boolean; displayName: string | null }
      >(functions, "linkMemberToPcoRecord");
      const result = await linkFn({ uid, pcoDocId });

      setLinkSuccess(
        `Linked to ${result.data.displayName || "Planning Center record"}.`,
      );
      setPcoResults([]);
      setPcoSearch("");

      // Reload member data to reflect the link.
      setIsLoading(true);
      await loadMemberData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Link failed";
      setLinkError(msg);
    } finally {
      setIsLinking(false);
    }
  };

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
                {new Date(
                  typeof member.createdAt === "object" &&
                  member.createdAt !== null &&
                  "seconds" in member.createdAt
                    ? (member.createdAt as unknown as { seconds: number }).seconds * 1000
                    : member.createdAt,
                ).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {member.planningCenterPersonId && (
              <p>Planning Center ID: {member.planningCenterPersonId}</p>
            )}
            <p className="flex items-center gap-2">
              Planning Center:{" "}
              {isPcoLinked ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Linked
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Not linked
                </span>
              )}
            </p>
          </div>
        )}
        {!member && (
          <p className="mt-2 text-sm text-gray-500">
            No member profile linked.
          </p>
        )}
      </div>

      {/* PCO Linking Section — shown when not linked */}
      {!isPcoLinked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">
            Link to Planning Center
          </h3>
          <p className="mt-1 text-xs text-amber-700">
            Search for this person's Planning Center record to link their profile
            data (name, photo, household).
          </p>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={pcoSearch}
              onChange={(e) => setPcoSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePcoSearch();
              }}
              placeholder="Search by name or email..."
              className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={handlePcoSearch}
              disabled={isSearching || !pcoSearch.trim()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {linkError && (
            <p className="mt-2 text-xs text-red-600">{linkError}</p>
          )}
          {linkSuccess && (
            <p className="mt-2 text-xs text-green-700">{linkSuccess}</p>
          )}

          {pcoResults.length > 0 && (
            <ul className="mt-3 divide-y divide-amber-200 rounded-lg border border-amber-200 bg-white">
              {pcoResults.map((result) => (
                <li
                  key={result.docId}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {result.photoURL ? (
                      <img
                        src={result.photoURL}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                        ?
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {result.displayName || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {result.email || "No email"} &middot; PCO{" "}
                        {result.planningCenterPersonId}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLink(result.docId)}
                    disabled={isLinking}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLinking ? "Linking..." : "Link"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pcoResults.length === 0 && !isSearching && pcoSearch && !linkError && (
            <p className="mt-2 text-xs text-amber-700">
              No unlinked Planning Center records found. Try a different search
              term, or ensure the member exists in Planning Center.
            </p>
          )}
        </div>
      )}

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
