import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/Dashboard';
import { LibraryPage } from '@/pages/Library';
import { AddManhwaPage } from '@/pages/AddManhwa';
import { ManhwaDetailPage } from '@/pages/ManhwaDetail';
import { SettingsPage } from '@/pages/Settings';

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/add" element={<AddManhwaPage />} />
          <Route path="/manhwa/:id" element={<ManhwaDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
