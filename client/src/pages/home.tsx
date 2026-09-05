import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
  CARS,
  DIFFICULTIES,
  XP,
  getCar,
  getTrack,
  xpProgress,
  type DailyChallengeStatus,
  type RaceHistoryEntry,
  type UserProfile,
} from 'shared';
import { api, ApiError } from '@/api';
import { useAuth } from '@/store/auth';
import { useSetup } from '@/store/settings';
import { Avatar, Btn, Panel } from '@/ui/kit';
import { ago, fmtNum, fmtTime } from '@/sim/format';
import { Loading } from '@/ui/loading';

/* ---------------------------------- icons --------------------------------- */

function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

const FlagIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" x2="4" y1="22" y2="15" />
  </Icon>
);
const CalIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M12 14v4M10 16h4" />
  </Icon>
);
const TrophyIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Icon>
);
const TimerIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </Icon>
);
const GlobeIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Icon>
);
const RouteIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="6" cy="19" r="3" />
    <circle cx="18" cy="5" r="3" />
    <path d="M9 19h5.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H15" />
  </Icon>
);
const GaugeIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </Icon>
);
const ZapIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
  </Icon>
);
const LockIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);
const UnlockIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect width="18" height="11" x="3" y="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </Icon>
);
const PlayIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M6 4.5v15l13-7.5-13-7.5z" fill="currentColor" stroke="none" />
  </Icon>
);
const ChevronIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);
const CarIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Icon>
);
const PinIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);
const CrownMini = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="m2 7 4.5 4L12 4l5.5 7L22 7l-1.5 11h-17L2 7z" />
  </Icon>
);

/* --------------------------------- helpers -------------------------------- */

function msUntilMidnightUTC(now = Date.now()): number {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(0, midnight - now);
}

function fmtCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function totalXpForLevel(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += XP.forLevel(l);
  return t;
}

const MODE_PILL: Record<string, string> = {
  quick: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
  daily: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  championship: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  'time-trial': 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  endless: 'border-rose-300/30 bg-rose-300/10 text-rose-200',
};

function posBadge(pos: number): string {
  if (pos === 1) return 'border-amber-300/50 bg-amber-300/15 text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.25)]';
  if (pos === 2) return 'border-slate-200/40 bg-slate-200/10 text-slate-100';
  if (pos === 3) return 'border-orange-300/40 bg-orange-300/10 text-orange-300';
  return 'border-white/10 bg-white/5 text-slate-400';
}

/* ---------------------------------- page ---------------------------------- */

export function Home() {
  const user = useAuth((s) => s.user);
  const setup = useSetup();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [daily, setDaily] = useState<DailyChallengeStatus | null>(null);
  const [recent, setRecent] = useState<RaceHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    Promise.all([api.profile(), api.dailyStatus(), api.raceHistory(5)])
      .then(([p, d, h]) => {
        setProfile(p);
        setDaily(d);
        setRecent(h.races);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your dashboard.'));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const derived = useMemo(() => {
    if (!profile) return null;
    const prog = xpProgress(profile.xp);
    const pct = Math.min(100, (prog.current / Math.max(1, prog.needed)) * 100);
    const winRate = profile.stats.totalRaces > 0 ? Math.round((profile.stats.wins / profile.stats.totalRaces) * 100) : 0;
    const unlockedCount = profile.unlockedCars.length;
    const unlockPct = Math.round((unlockedCount / CARS.length) * 100);
    const nextCar = CARS.filter((c) => !profile.unlockedCars.includes(c.id)).sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
    const xpToNextLevel = Math.max(0, prog.needed - prog.current);
    const xpToUnlock = nextCar ? Math.max(0, totalXpForLevel(nextCar.unlockLevel) - profile.xp) : 0;
    const favCar = profile.favoriteCar ? getCar(profile.favoriteCar) : undefined;
    const favTrack = profile.favoriteTrack ? getTrack(profile.favoriteTrack) : undefined;
    return { prog, pct, winRate, unlockedCount, unlockPct, nextCar, xpToNextLevel, xpToUnlock, favCar, favTrack };
  }, [profile]);

  if (error) {
    return (
      <div className="panel mt-10 p-8 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
          <ZapIcon className="h-5 w-5" />
        </div>
        <p className="text-sm text-rose-200">{error}</p>
        <Btn className="mx-auto mt-4" onClick={() => window.location.reload()}>Retry</Btn>
      </div>
    );
  }
  if (!profile || !user || !derived) return <Loading label="Loading HQ" />;

  const { prog, pct, winRate, unlockedCount, unlockPct, nextCar, xpToNextLevel, xpToUnlock, favCar, favTrack } = derived;
  const dailyTrack = daily ? getTrack(daily.trackId) : undefined;
  const dailyResetIn = fmtCountdown(msUntilMidnightUTC(now));

  const startQuick = () => {
    setup.set('mode', 'quick');
    navigate(`/setup/${setup.trackId}`);
  };
  const startDaily = () => {
    if (!daily) return;
    setup.set('mode', 'daily');
    setup.set('laps', daily.laps);
    setup.set('difficulty', daily.difficulty);
    navigate(`/setup/${daily.trackId}`);
  };

  return (
    <div className="py-4">
      {/* ------------------------------- HERO ------------------------------- */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#070b16]"
      >
        {/* backdrop */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(900px_320px_at_15%_0%,rgba(34,211,238,0.16),transparent_60%),radial-gradient(700px_300px_at_90%_20%,rgba(167,139,250,0.14),transparent_60%),radial-gradient(600px_280px_at_60%_110%,rgba(251,191,36,0.08),transparent_60%)]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse 90% 90% at 30% 20%, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 30% 20%, black 30%, transparent 75%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          {/* speed streaks */}
          <div className="absolute -left-10 top-16 h-px w-64 rotate-[-8deg] bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
          <div className="absolute -left-6 top-24 h-px w-80 rotate-[-8deg] bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
          <div className="absolute -left-10 top-32 h-px w-48 rotate-[-8deg] bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />
        </div>

        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.45fr_0.95fr]">
          {/* left: greeting + CTAs */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                <span className="nr-pulse h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Grid hot · Season 01
              </span>
              {profile.globalRank != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                  <GlobeIcon className="h-3 w-3 text-cyan-300" />
                  World #{profile.globalRank}
                </span>
              )}
              {daily?.available && !daily.completedToday && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                  Daily live · resets in {dailyResetIn}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl font-black uppercase leading-[1.02] tracking-wide text-white sm:text-4xl xl:text-[2.9rem]">
              Welcome back,
              <span className="block bg-gradient-to-r from-cyan-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
                {profile.username}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-[15px]">
              {profile.stats.totalRaces === 0
                ? 'Your engines are cold — run a Quick Race to set your first time, or grab the Daily bonus XP.'
                : `Level ${prog.level} racer · ${winRate}% win rate · ${fmtNum(profile.stats.bestScore)} PB. Pick a battle below.`}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Btn kind="primary" onClick={startQuick} className="!px-6 !py-3">
                <PlayIcon className="h-4 w-4" />
                Quick Race
              </Btn>
              <Btn onClick={() => navigate('/garage')} className="!px-5 !py-3">
                <CarIcon className="h-4 w-4 text-cyan-300" />
                Open Garage
              </Btn>
              <button
                onClick={() => navigate('/tracks')}
                className="group inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 transition-colors hover:text-cyan-200"
              >
                Browse tracks
                <ChevronIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="mt-6 flex max-w-xl items-center gap-5 border-t border-white/5 pt-4 text-center sm:gap-8 sm:text-left">
              {[
                { l: 'Best score', v: fmtNum(profile.stats.bestScore) },
                { l: 'Best lap', v: profile.stats.bestLapMs != null ? fmtTime(profile.stats.bestLapMs) : '--:--.---' },
                { l: 'Win rate', v: `${winRate}%` },
              ].map((s) => (
                <div key={s.l} className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{s.l}</div>
                  <div className="mt-0.5 truncate font-display text-lg font-black text-white sm:text-xl">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right: driver card */}
          <div className="panel-solid flex flex-col justify-between gap-5 !border-white/10 p-5">
            <div className="flex items-center gap-4">
              <Avatar seed={profile.avatarSeed} name={profile.username} size={60} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display text-lg font-black uppercase tracking-wide text-white">{profile.username}</span>
                </div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Racer · Level {prog.level}
                </div>
              </div>
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-300/40 bg-[#0a1220] shadow-[0_0_24px_rgba(34,211,238,0.25)]">
                <span className="font-display text-xl font-black leading-none text-cyan-300">{prog.level}</span>
                <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500">Lvl</span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                <span>{prog.current.toLocaleString()} XP</span>
                <span className="text-slate-500">{xpToNextLevel.toLocaleString()} to Lv {prog.level + 1}</span>
              </div>
              <div className="bar !h-2">
                <div
                  className="bg-gradient-to-r from-cyan-500/70 via-cyan-300 to-violet-300 shadow-[0_0_14px_rgba(34,211,238,0.55)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 text-right text-[10px] font-bold tabular-nums text-slate-500">{Math.round(pct)}%</div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
              {[
                { l: 'Wins', v: `${profile.stats.wins}` },
                { l: 'Races', v: `${profile.stats.totalRaces}` },
                { l: 'Streak', v: `${profile.stats.winStreak}` },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/[0.04] px-2 py-2.5">
                  <div className="font-display text-lg font-black text-white">{s.v}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{s.l}</div>
                </div>
              ))}
            </div>

            {nextCar ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-violet-300/20 bg-violet-300/[0.06] px-3 py-2.5 text-xs">
                <LockIcon className="h-4 w-4 shrink-0 text-violet-300" />
                <span className="min-w-0 flex-1 truncate text-slate-300">
                  Next: <span className="font-bold text-white">{nextCar.name}</span>
                  <span className="text-slate-500"> · Lv {nextCar.unlockLevel}</span>
                </span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-violet-200">
                  {xpToUnlock > 0 ? `${fmtNum(xpToUnlock)} XP` : 'Ready'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3 py-2.5 text-xs text-amber-100">
                <TrophyIcon className="h-4 w-4 shrink-0 text-amber-300" />
                Full collection — every car unlocked.
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ------------------------------ MODE CARDS ----------------------------- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Quick */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-white/[0.045] p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_0_44px_rgba(34,211,238,0.18)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" aria-hidden />
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-300">
                <FlagIcon className="h-5 w-5" />
              </div>
              <span className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                3 laps · Full grid
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-black uppercase tracking-wider text-white">Quick Race</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">Jump straight in. Three laps, full grid, pure racing.</p>
            <Btn kind="primary" className="mt-4 w-full" onClick={startQuick}>
              <PlayIcon className="h-4 w-4" /> Start Race
            </Btn>
          </div>
        </motion.div>

        {/* Daily */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div
            className={clsx(
              'group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-md transition-all hover:-translate-y-1',
              daily && daily.available && !daily.completedToday
                ? 'border-amber-300/35 bg-white/[0.045] hover:border-amber-300/60 hover:shadow-[0_0_44px_rgba(251,191,36,0.18)]'
                : 'border-white/10 bg-white/[0.045]'
            )}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" aria-hidden />
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-300/10 text-amber-300">
                <CalIcon className="h-5 w-5" />
              </div>
              {daily?.completedToday ? (
                <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                  Done today
                </span>
              ) : (
                <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                  Resets in {dailyResetIn}
                </span>
              )}
            </div>
            <h3 className="mt-3 font-display text-lg font-black uppercase tracking-wider text-white">Daily Challenge</h3>
            {daily && daily.available && dailyTrack && !daily.completedToday ? (
              <>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">
                  {dailyTrack.name} · {daily.laps} laps ·{' '}
                  <span className="font-bold text-amber-200">{DIFFICULTIES[daily.difficulty]?.label}</span>
                  <span className="text-slate-500"> · +300 bonus XP</span>
                </p>
                <Btn kind="primary" className="mt-4 w-full" onClick={startDaily}>
                  <ZapIcon className="h-4 w-4" /> Accept Challenge
                </Btn>
              </>
            ) : (
              <>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">
                  {daily?.completedToday
                    ? 'Banked for today — a fresh challenge drops at midnight UTC.'
                    : 'Done for today — a new challenge drops at midnight UTC.'}
                </p>
                <Btn className="mt-4 w-full cursor-default opacity-60" onClick={() => navigate('/tracks')}>
                  Browse Tracks
                </Btn>
              </>
            )}
          </div>
        </motion.div>

        {/* Championship */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="sm:col-span-2 lg:col-span-1"
        >
          <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-violet-300/25 bg-white/[0.045] p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-violet-300/50 hover:shadow-[0_0_44px_rgba(167,139,250,0.18)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" aria-hidden />
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/40 bg-violet-300/10 text-violet-300">
                <CrownMini className="h-5 w-5" />
              </div>
              <span className="rounded-md border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                3 rounds · Points
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-black uppercase tracking-wider text-white">Championship</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-400">
              Three rounds, accumulating points. {profile.stats.championshipsWon > 0 ? `${profile.stats.championshipsWon} crown${profile.stats.championshipsWon === 1 ? '' : 's'} banked — defend it.` : 'Win 2+ rounds to take the crown.'}
            </p>
            <Btn className="mt-4 w-full" onClick={() => navigate('/play/championship')}>
              View Series <ChevronIcon className="h-4 w-4" />
            </Btn>
          </div>
        </motion.div>
      </div>

      {/* ------------------------------ STAT STRIP ----------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <MiniStat icon={<TrophyIcon className="h-4 w-4" />} tint="text-amber-300 border-amber-300/30 bg-amber-300/10" label="Best Score" value={fmtNum(profile.stats.bestScore)} sub="personal best" />
        <MiniStat icon={<TimerIcon className="h-4 w-4" />} tint="text-cyan-300 border-cyan-300/30 bg-cyan-300/10" label="Best Lap" value={profile.stats.bestLapMs != null ? fmtTime(profile.stats.bestLapMs) : '--:--.---'} sub="all tracks" mono />
        <MiniStat icon={<GlobeIcon className="h-4 w-4" />} tint="text-violet-300 border-violet-300/30 bg-violet-300/10" label="Global Rank" value={profile.globalRank != null ? `#${profile.globalRank}` : 'Unranked'} sub="worldwide" />
        <MiniStat icon={<FlagIcon className="h-4 w-4" />} tint="text-emerald-300 border-emerald-300/30 bg-emerald-300/10" label="Wins" value={`${profile.stats.wins}`} sub={`${winRate}% win rate`} />
        <MiniStat icon={<RouteIcon className="h-4 w-4" />} tint="text-sky-300 border-sky-300/30 bg-sky-300/10" label="Races" value={`${profile.stats.totalRaces}`} sub={`${profile.stats.podiums} podiums`} />
        <MiniStat icon={<GaugeIcon className="h-4 w-4" />} tint="text-orange-300 border-orange-300/30 bg-orange-300/10" label="Distance" value={`${profile.stats.totalDistanceKm} km`} sub="total driven" />
      </motion.div>

      {/* ------------------------------- MAIN GRID ------------------------------ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Recent races */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="lg:col-span-3">
          <Panel className="!p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">Recent Races</h3>
                {recent.length > 0 && (
                  <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-400">
                    {recent.length}
                  </span>
                )}
              </div>
              <Link to="/profile" className="group inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200">
                Full history
                <ChevronIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-300">
                  <FlagIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 font-display text-sm font-black uppercase tracking-widest text-white">No races yet</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">Hit the track to set your first time — it will show up here.</p>
                <Btn kind="primary" className="mt-4" onClick={startQuick}>
                  <PlayIcon className="h-4 w-4" /> Start your first race
                </Btn>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.06]"
                  >
                    <span className={clsx('flex h-10 w-11 shrink-0 items-center justify-center rounded-lg border font-display text-sm font-black', posBadge(r.position))}>
                      P{r.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-100">{r.trackName}</div>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <span className="truncate">{r.carName}</span>
                        <span aria-hidden>·</span>
                        <span className={clsx('rounded border px-1 py-px text-[9px]', MODE_PILL[r.mode] ?? MODE_PILL.quick)}>{r.mode}</span>
                        <span aria-hidden>·</span>
                        <span>{ago(r.createdAt)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-sm font-black tabular-nums text-cyan-300">{fmtNum(r.score)}</div>
                      <div className="text-[10px] tabular-nums text-slate-500">{r.bestLapMs ? fmtTime(r.bestLapMs) : 'DNF'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </motion.div>

        {/* Stable + tips */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="flex flex-col gap-4 lg:col-span-2">
          <Panel className="!p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">Your Stable</h3>
              <Link to="/garage" className="group inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200">
                Garage
                <ChevronIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <CarIcon className="h-3.5 w-3.5 text-cyan-300" /> Fav car
                </div>
                <div className="mt-1.5 truncate font-display text-[15px] font-black text-white">{favCar?.name ?? '—'}</div>
                {favCar && (
                  <div className="mt-1.5 flex items-center gap-1">
                    {favCar.colors.slice(0, 3).map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-white/25" style={{ background: c }} />
                    ))}
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{favCar.class}</span>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <PinIcon className="h-3.5 w-3.5 text-violet-300" /> Fav track
                </div>
                <div className="mt-1.5 truncate font-display text-[15px] font-black text-white">{favTrack?.name ?? '—'}</div>
                {favTrack && (
                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {favTrack.lengthKm} km · {'◆'.repeat(favTrack.difficulty)}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-2 mt-5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Collection · {unlockedCount}/{CARS.length}
              </span>
              <span className="text-[11px] font-bold tabular-nums text-slate-500">{unlockPct}%</span>
            </div>
            <div className="bar !h-2">
              <div className="bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-300" style={{ width: `${unlockPct}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {CARS.map((c) => {
                const ok = profile.unlockedCars.includes(c.id);
                return (
                  <div
                    key={c.id}
                    title={ok ? c.name : `${c.name} — unlocks at Lv ${c.unlockLevel}`}
                    className={clsx(
                      'flex items-center gap-1.5 truncate rounded-lg border px-2 py-1.5 text-[11px] font-bold',
                      ok ? 'border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-100' : 'border-white/[0.07] bg-white/[0.02] text-slate-600'
                    )}
                  >
                    {ok ? <UnlockIcon className="h-3.5 w-3.5 shrink-0 text-cyan-300" /> : <LockIcon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{c.name}</span>
                    {!ok && <span className="ml-auto shrink-0 text-[9px] tabular-nums">Lv{c.unlockLevel}</span>}
                  </div>
                );
              })}
            </div>
          </Panel>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/[0.08] via-transparent to-violet-400/[0.08] p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-300/30 bg-amber-300/10 text-amber-300">
                <ZapIcon className="h-4 w-4" />
              </div>
              <h4 className="font-display text-xs font-black uppercase tracking-[0.18em] text-white">Climb faster</h4>
            </div>
            <ul className="mt-3 space-y-2 text-[13px] leading-snug text-slate-400">
              <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-300" /> Daily Challenge pays <span className="font-bold text-slate-200">+300 XP</span> — never skip it.</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-300" /> Podiums pay up to <span className="font-bold text-slate-200">+500 XP</span> on higher difficulties.</li>
              <li className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-300" /> Zero-collision races bank a <span className="font-bold text-slate-200">clean bonus</span>.</li>
            </ul>
            <Link to="/achievements" className="group mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200 hover:text-amber-100">
              Chase awards <ChevronIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  tint,
  label,
  value,
  sub,
  mono,
}: {
  icon: React.ReactNode;
  tint: string;
  label: string;
  value: string;
  sub: string;
  mono?: boolean;
}) {
  return (
    <div className="panel group p-4 transition-all hover:-translate-y-0.5 hover:border-white/20">
      <div className={clsx('mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border', tint)}>{icon}</div>
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={clsx('mt-1 truncate font-display text-lg font-black text-white', mono && 'text-[15px] tabular-nums')}>{value}</div>
      <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{sub}</div>
    </div>
  );
}
