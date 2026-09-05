import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { audio } from '@/game/engine/audio';
import { AchievementToasts } from '@/ui/AchievementToasts';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DashboardLayout } from '@/pages/DashboardLayout';
import { GaragePage } from '@/pages/GaragePage';
import { TracksPage } from '@/pages/TracksPage';
import { RaceSetupPage } from '@/pages/RaceSetupPage';
import { RacePage } from '@/pages/RacePage';
import { ChampionshipPage } from '@/pages/ChampionshipPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AchievementsPage } from '@/pages/AchievementsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { GuestDemoPage } from '@/pages/GuestDemoPage';

export default function App() {
  const status = useAuth((s) => s.status);
  const checkAuth = useAuth((s) => s.checkAuth);
  const reduced = useSettings((s) => s.reducedMotion);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  // honor reduced-motion globally
  useEffect(() => {
    document.documentElement.style.scrollBehavior = reduced ? 'auto' : 'smooth';
  }, [reduced]);

  // global click → audio unlock (browser autoplay policy)
  useEffect(() => {
    const unlock = () => audio.init();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (status === 'checking') return <LoadingScreen label="NEXORA RUSH" />;

  return (
    <>
      <AchievementToasts />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/demo" element={<GuestDemoPage />} />
        <Route
          element={
            <Protected>
              <DashboardLayout />
            </Protected>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/garage" element={<GaragePage />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/setup/:trackId" element={<RaceSetupPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route
          path="/race"
          element={
            <Protected>
              <RacePage />
            </Protected>
          }
        />
        <Route
          path="/play/championship"
          element={
            <Protected>
              <ChampionshipPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}
