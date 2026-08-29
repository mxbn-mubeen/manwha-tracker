import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from './features/dashboard/Dashboard';
import { LibraryPage } from './features/manhwa/Library';
import { AddManhwaPage } from './features/manhwa/AddManhwa';
import { ManhwaDetailPage } from './features/manhwa-detail/ManhwaDetail';
import { SettingsPage } from './features/settings/Settings';
import { SourcesPage } from './features/sources/SourcesPage';

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/add" element={<AddManhwaPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/manhwa/:id" element={<ManhwaDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
