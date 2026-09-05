import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { xpProgress } from 'shared';
import { useAuth } from '@/store/auth';
import { api } from '@/api';
import { Avatar, Btn, Logo, XpBar } from '@/ui/kit';
import { sound } from '@/sim/audio';

/** Authenticated shell: sidebar on desktop, top+bottom bars on mobile. */
export function Shell() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const refresh = useAuth((s) => s.refresh);
  const navigate = useNavigate();
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    void refresh();
    sound.music('menu');
    api.profile().then((p) => setXp(p.xp)).catch(() => undefined);
    return () => sound.music(null);
  }, [refresh]);

  if (!user) return null;
  const prog = xpProgress(xp ?? user.xp);

  const nav = [
    { to: '/dashboard', label: 'Play', icon: '🎮' },
    { to: '/garage', label: 'Garage', icon: '🏎️' },
    { to: '/tracks', label: 'Tracks', icon: '🗺️' },
    { to: '/leaderboard', label: 'Boards', icon: '🏆' },
    { to: '/profile', label: 'Profile', icon: '👤' },
    { to: '/achievements', label: 'Awards', icon: '🎖️' },
    { to: '/settings', label: 'Setup', icon: '⚙️' },
  ];

  const quit = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#04060c]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-white/5 bg-[#070b14]/85 p-4 backdrop-blur lg:flex">
        <button className="mb-8 flex items-center gap-2.5" onClick={() => navigate('/dashboard')} aria-label="Home">
          <Logo />
          <span className="font-display text-base font-black tracking-widest text-white">
            NEXORA<span className="text-cyan-300">RUSH</span>
          </span>
        </button>
        <div className="panel mb-6 p-3">
          <div className="mb-2.5 flex items-center gap-2.5">
            <Avatar seed={user.avatarSeed} name={user.username} size={38} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{user.username}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Racer</div>
            </div>
          </div>
          <XpBar level={prog.level} cur={prog.current} need={prog.needed} />
        </div>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Sections">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors',
                  isActive ? 'bg-cyan-300/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <Btn className="mt-4 w-full px-3 py-2 text-xs" onClick={quit}>
          Log Out
        </Btn>
      </aside>

      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#070b14]/92 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Avatar seed={user.avatarSeed} name={user.username} size={30} />
          <span className="text-sm font-bold text-white">{user.username}</span>
          <span className="rounded-md border border-cyan-300/40 px-1.5 py-0.5 font-display text-[10px] font-black text-cyan-300">
            LV {prog.level}
          </span>
        </div>
        <button className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400" onClick={quit}>
          Log Out
        </button>
      </div>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-16 lg:pl-64 lg:pr-6 lg:pt-6">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-white/5 bg-[#070b14]/95 px-1 py-1.5 backdrop-blur lg:hidden" aria-label="Sections">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              clsx('flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wide', isActive ? 'text-cyan-300' : 'text-slate-500')
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
