import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import type { FirebaseUserRecord } from "../../../shared/types";

export function MemberListPage() {
  const [users, setUsers] = useState<Array<FirebaseUserRecord>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "members" | "admins">("all");
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    const listUsers = httpsCallable<unknown, { users: Array<FirebaseUserRecord> }>(
      functions,
      "listFirebaseUsers",
    );

    listUsers()
      .then((result) => setUsers(result.data.users))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === "internal" || msg.includes("INTERNAL")) {
          setError(
            "Cloud Function error. Make sure functions are deployed: npm run deploy:functions",
          );
        } else {
          setError(msg);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q),
      );
    }

    if (filter === "members") {
      result = result.filter((u) => u.customClaims?.isMember);
    } else if (filter === "admins") {
      result = result.filter(
        (u) => u.customClaims?.isAdmin || u.customClaims?.admin,
      );
    }

    return result;
  }, [users, search, filter]);

  const handleToggleMember = async (user: FirebaseUserRecord) => {
    const isMember = user.customClaims?.isMember ?? false;
    const key = `${user.uid}-member`;

    setBusy((prev) => ({ ...prev, [key]: "saving" }));
    setRowError((prev) => {
      const next = { ...prev };
      delete next[user.uid];
      return next;
    });

    try {
      const setMemberClaim = httpsCallable(functions, "setMemberClaim");
      await setMemberClaim({
        uid: user.uid,
        isMember: !isMember,
        displayName: user.displayName || user.email || "Member",
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                customClaims: {
                  ...u.customClaims,
                  isMember: !isMember,
                },
              }
            : u,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setRowError((prev) => ({ ...prev, [user.uid]: msg }));
    } finally {
      setBusy((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleToggleAdmin = async (user: FirebaseUserRecord) => {
    const isAdmin =
      user.customClaims?.isAdmin ?? user.customClaims?.admin ?? false;
    const key = `${user.uid}-admin`;

    setBusy((prev) => ({ ...prev, [key]: "saving" }));
    setRowError((prev) => {
      const next = { ...prev };
      delete next[user.uid];
      return next;
    });

    try {
      const setAdminClaim = httpsCallable(functions, "setAdminClaim");
      await setAdminClaim({ uid: user.uid, isAdmin: !isAdmin });

      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid
            ? {
                ...u,
                customClaims: {
                  ...u.customClaims,
                  isAdmin: !isAdmin,
                },
              }
            : u,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update";
      setRowError((prev) => ({ ...prev, [user.uid]: msg }));
    } finally {
      setBusy((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading users...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Members</h2>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">Everyone</option>
          <option value="members">Members</option>
          <option value="admins">Admins</option>
        </select>
        <span className="self-center text-sm text-gray-500">
          {filteredUsers.length} {filteredUsers.length === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Member
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Admin
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => {
              const isMember = user.customClaims?.isMember ?? false;
              const isAdmin =
                user.customClaims?.isAdmin ?? user.customClaims?.admin ?? false;
              const memberBusy = !!busy[`${user.uid}-member`];
              const adminBusy = !!busy[`${user.uid}-admin`];

              return (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">
                    {user.displayName || "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {user.email || "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleToggleMember(user)}
                      disabled={memberBusy}
                      role="switch"
                      aria-checked={isMember}
                      aria-label={`Toggle member status for ${user.displayName || user.email || user.uid}`}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${
                        isMember ? "bg-green-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                          isMember ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleToggleAdmin(user)}
                      disabled={adminBusy}
                      role="switch"
                      aria-checked={isAdmin}
                      aria-label={`Toggle admin status for ${user.displayName || user.email || user.uid}`}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50 ${
                        isAdmin ? "bg-blue-500" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                          isAdmin ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    {rowError[user.uid] ? (
                      <span className="text-xs text-red-600">
                        {rowError[user.uid]}
                      </span>
                    ) : (
                      <Link
                        to={`/members/${user.uid}`}
                        className="text-brand-600 hover:text-brand-800"
                      >
                        Details
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
