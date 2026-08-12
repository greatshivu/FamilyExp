import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import TransactionsPage from "@/pages/TransactionsPage";
import NotesPage from "@/pages/NotesPage";
import FarmUpdatesPage from "@/pages/FarmUpdatesPage";
import CategoriesPage from "@/pages/CategoriesPage";
import ReportsPage from "@/pages/ReportsPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminAccountsPage from "@/pages/AdminAccountsPage";
import AdminDeletionsPage from "@/pages/AdminDeletionsPage";
import AppLayout from "@/components/AppLayout";
import AuditLogs from "@/pages/AuditLogs";
import GlobalLoader from "@/components/GlobalLoader";

function Protected({ children, adminOnly = false }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F0]">
        <div className="text-[#5C635F]">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <GlobalLoader />
        <Routes>
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/transactions" element={<Protected><TransactionsPage /></Protected>} />
          <Route path="/notes" element={<Protected><NotesPage /></Protected>} />
          <Route path="/farm-updates" element={<Protected><FarmUpdatesPage /></Protected>} />
          <Route path="/categories" element={<Protected><CategoriesPage /></Protected>} />
          <Route path="/reports" element={<Protected><ReportsPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/admin/accounts" element={<Protected adminOnly><AdminAccountsPage /></Protected>} />
          <Route path="/admin/deletions" element={<Protected adminOnly><AdminDeletionsPage /></Protected>} />
          <Route path="/audits" element={<Protected adminOnly><AuditLogs /></Protected>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
