import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardPage } from './features/dashboard/Dashboard';
import { LibraryPage } from './features/manhwa/Library';
import { AddManhwaPage } from './features/manhwa/AddManhwa';
import { ManhwaDetailPage } from './features/manhwa-detail/ManhwaDetail';
import { StatsPage } from './features/stats/StatsPage';
import { SettingsPage } from './features/settings/Settings';
import { SourcesPage } from './features/sources/SourcesPage';
import { ResetPasswordPage } from './features/auth/ResetPasswordPage';

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route
              path="/add"
              element={
                <ProtectedRoute requireAdmin>
                  <AddManhwaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sources"
              element={
                <ProtectedRoute requireAdmin>
                  <SourcesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute>
                  <StatsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/manhwa/:id" element={<ManhwaDetailPage />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppShell>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
