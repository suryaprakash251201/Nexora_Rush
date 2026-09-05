import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { sound } from '@/sim/audio';
import { AchToasts } from '@/ui/toasts';
import { Loading } from '@/ui/loading';
import { Landing } from '@/pages/landing';
import { Auth } from '@/pages/auth';
import { Shell } from '@/pages/shell';
import { Home } from '@/pages/home';
import { Garage } from '@/pages/garage';
import { Tracks } from '@/pages/tracks';
import { Setup } from '@/pages/setup';
import { Race } from '@/pages/race';
import { Series } from '@/pages/series';
import { Board } from '@/pages/board';
import { Profile } from '@/pages/profile';
import { Trophies } from '@/pages/trophies';
import { Prefs } from '@/pages/prefs';
import { Demo } from '@/pages/demo';

export default function App() {
  const status = useAuth((s) => s.status);
  const boot = useAuth((s) => s.boot);
  const reduced = useSettings((s) => s.reducedMotion);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = reduced ? 'auto' : 'smooth';
  }, [reduced]);

  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (status === 'checking') return <Loading label="Nexora Rush" />;

  return (
    <>
      <AchToasts />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/demo" element={<Demo />} />
        <Route element={<Gate><Shell /></Gate>}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/garage" element={<Garage />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/setup/:trackId" element={<Setup />} />
          <Route path="/leaderboard" element={<Board />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/achievements" element={<Trophies />} />
          <Route path="/settings" element={<Prefs />} />
        </Route>
        <Route path="/race" element={<Gate><Race /></Gate>} />
        <Route path="/play/championship" element={<Gate><Series /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  if (status === 'out') return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  if (status === 'checking') return <Loading label="Nexora Rush" />;
  return <>{children}</>;
}
