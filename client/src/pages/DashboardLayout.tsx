import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { Avatar, XPBar, NeonButton } from '@/ui/shared';
import { xpProgress } from 'shared';
import { api } from '@/services/api';
import { useSettings } from '@/store/settings';
import { audio } from '@/game/engine/audio';
import { clsx } from 'clsx';
import { useState } from 'react';

/** Authenticated app shell: sidebar on desktop, bottom bar on mobile. */
export function DashboardLayout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const refreshUser = useAuth((s) => s.refreshUser);
  const [profileLevel, setProfileLevel] = useState<{ level: number; xp: number } | null>(null);
  const playMusic = useSettings((s) => s.musicVolume);

  useEffect(() => {
    void refreshUser();
    audio.playMusic('menu');
    return () => audio.stopMusic();
  }, [refreshUser]);

  useEffect(() => {
    api.profile().then((p) => setProfileLevel({ level: p.level, xp: p.xp })).catch(() => undefined);
  }, []);

  if (!user) return null;
  const prog = xpProgress(profileLevel?.xp ?? user.xp);

  const nav = [
    { to: '/dashboard', label: 'Play', icon: '🎮' },
    { to: '/garage', label: 'Garage', icon: '🏎️' },
    { to: '/tracks', label: 'Tracks', icon: '🗺️' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { to: '/profile', label: 'Profile', icon: '👤' },
    { to: '/achievements', label: 'Achievements', icon: '🎖️' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex min-h-screen bg-ink-950">
      {/* sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-white/5 bg-ink-900/80 p-4 backdrop-blur lg:flex">
        <button className="mb-8 flex items-center gap-2.5" onClick={() => navigate('/dashboard')}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/50 bg-ink-800 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
            <svg viewBox="0 0 32 32" className="h-5 w-5">
              <path d="M7 22 L13 9 L16 16 L19 9 L25 22" stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-display text-base font-black tracking-widest text-white">
            NEXORA<span className="text-neon-cyan">RUSH</span>
          </span>
        </button>

        <div className="glass mb-6 p-3">
          <div className="mb-2.5 flex items-center gap-2.5">
            <Avatar seed={user.avatarSeed} username={user.username} size={38} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{user.username}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Racer</div>
            </div>
          </div>
          <XPBar level={prog.level} current={prog.current} needed={prog.needed} />
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Sections">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors',
                  isActive ? 'bg-cyan-400/15 text-neon-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <NeonButton size="sm" className="mt-4 w-full" onClick={async () => { await logout(); navigate('/'); }}>
          Log Out
        </NeonButton>
        <div className="mt-3 text-center text-[9px] uppercase tracking-widest text-slate-700">
          Music {Math.round(playMusic * 100)}%
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/5 bg-ink-900/90 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Avatar seed={user.avatarSeed} username={user.username} size={30} />
          <span className="text-sm font-bold text-white">{user.username}</span>
          <span className="rounded-md border border-cyan-400/40 px-1.5 py-0.5 font-display text-[10px] font-black text-neon-cyan">
            LV {prog.level}
          </span>
        </div>
        <button
          className="text-xs font-bold uppercase tracking-widest text-slate-400"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          Log Out
        </button>
      </div>

      {/* content */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-16 lg:pl-64 lg:pr-6 lg:pt-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-white/5 bg-ink-900/95 px-1 py-1.5 backdrop-blur lg:hidden"
        aria-label="Sections"
      >
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wide', isActive ? 'text-neon-cyan' : 'text-slate-500')
            }
          >
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
