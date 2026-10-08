import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { FilesPage } from './pages/FilesPage';
import { UploadPage } from './pages/UploadPage';
import { DownloadPage } from './pages/DownloadPage';
import { CreatorHubPage } from './pages/CreatorHubPage';
import { WalletPage } from './pages/WalletPage';
import { TeamsPage } from './pages/TeamsPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { PremiumPage } from './pages/PremiumPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthModal />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PremiumPage />} />
          <Route path="/d/:shortCode" element={<DownloadPage />} />

          {/* Authenticated Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/creator" element={<CreatorHubPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/referrals" element={<ReferralsPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
