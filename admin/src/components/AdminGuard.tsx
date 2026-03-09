import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { logOut } from "../config/firebase";
import { LoginPage } from "../pages/LoginPage";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 gap-4">
        <h1 className="text-xl font-semibold text-gray-800">Access Denied</h1>
        <p className="text-gray-600">
          The account {user.email} doesn&rsquo;t have admin access. Contact a
          church admin for help.
        </p>
        <button
          onClick={() => logOut()}
          className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
