import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminGuard } from "./components/AdminGuard";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ReadingPlanListPage } from "./pages/ReadingPlanListPage";
import { ReadingPlanEditorPage } from "./pages/ReadingPlanEditorPage";
import { SundayQuickAddPage } from "./pages/SundayQuickAddPage";
import { MemberListPage } from "./pages/MemberListPage";
import { MemberDetailPage } from "./pages/MemberDetailPage";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AdminGuard>
          <Layout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/reading-plans" element={<ReadingPlanListPage />} />
              <Route
                path="/reading-plans/new"
                element={<ReadingPlanEditorPage />}
              />
              <Route
                path="/reading-plans/:planId"
                element={<ReadingPlanEditorPage />}
              />
              <Route
                path="/sunday-quick-add"
                element={<SundayQuickAddPage />}
              />
              <Route path="/members" element={<MemberListPage />} />
              <Route path="/members/:uid" element={<MemberDetailPage />} />
            </Routes>
          </Layout>
        </AdminGuard>
      </BrowserRouter>
    </AuthProvider>
  );
}
