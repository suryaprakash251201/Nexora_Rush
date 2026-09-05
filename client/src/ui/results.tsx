import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AchievementDef, CarDef, RaceFinishResponse, TrackDef } from 'shared';
import { Btn } from './kit';
import { fmtTime, fmtNum } from '@/sim/format';

export interface ResultData {
  position: number;
  grid: number;
  raceMs: number | null;
  bestMs: number | null;
  score: number;
  xp: number;
  personalBest: boolean;
  fastLap: boolean;
  wrecked: boolean;
  server: RaceFinishResponse | null;
  ach: AchievementDef[];
  newCars: CarDef[];
  newTracks: TrackDef[];
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2.5 14.9 8.6l6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.2 1.2-6.5L2.5 9.5l6.6-.9L12 2.5z" />
    </svg>
  );
}

function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export function Results({
  data,
  onRetry,
  onNext,
  nextLabel,
  onGarage,
  onMenu,
  onSignup,
}: {
  data: ResultData;
  onRetry: () => void;
  onNext?: () => void;
  nextLabel?: string;
  onGarage: () => void;
  onMenu: () => void;
  onSignup?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const won = data.position === 1 && !data.wrecked;

  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900);
      setShown(Math.round(data.xp * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, 400);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [data.xp]);

  // Functional nicety: Enter retries / advances, Esc goes to menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (onNext) onNext();
        else onRetry();
      } else if (e.key === 'Escape') {
        onMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRetry, onNext, onMenu]);

  const posStyle =
    data.position === 1
      ? 'border-amber-300/60 bg-amber-300/12 text-amber-300 shadow-[0_0_36px_rgba(251,191,36,0.3)]'
      : data.position === 2
        ? 'border-slate-200/50 bg-slate-200/10 text-slate-100'
        : data.position === 3
          ? 'border-orange-300/50 bg-orange-300/10 text-orange-300'
          : 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="w-[min(94vw,540px)] py-6"
        role="dialog"
        aria-label="Race results"
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1c]/95 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div
            className="px-6 pb-5 pt-6 text-center"
            style={{ background: won ? 'linear-gradient(180deg, rgba(52,211,153,0.16), transparent)' : data.wrecked ? 'linear-gradient(180deg, rgba(251,59,83,0.14), transparent)' : 'linear-gradient(180deg, rgba(34,211,238,0.12), transparent)' }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border font-display text-2xl font-black" aria-hidden>
              <span className={`flex h-full w-full items-center justify-center rounded-2xl border ${posStyle}`}>P{data.position}</span>
            </div>
            <div className="font-display text-3xl font-black uppercase tracking-[0.12em] text-white sm:text-4xl" style={{ textShadow: '0 0 30px rgba(34,211,238,0.5)' }}>
              {data.wrecked ? 'Wrecked' : won ? 'Victory!' : data.raceMs != null ? 'Finish!' : 'Race Over'}
            </div>
            <div className="mt-1.5 text-sm font-bold text-slate-400">
              Position <span className="text-slate-100">P{data.position}</span> of {data.grid}
              {data.raceMs == null && ' · DNF'}
            </div>
            {data.personalBest && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 12 }}
                className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-300/15 px-4 py-1 font-display text-xs font-black uppercase tracking-[0.14em] text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.25)]"
              >
                <StarIcon className="h-3.5 w-3.5" />
                New Personal Best
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5 px-6">
            <Mini label="Time" value={data.raceMs != null ? fmtTime(data.raceMs) : 'DNF'} />
            <Mini label="Best Lap" value={data.bestMs != null ? fmtTime(data.bestMs) : '--'} hot={data.fastLap} sub={data.fastLap ? 'Fastest' : undefined} />
            <Mini label="Score" value={fmtNum(data.score)} accent />
          </div>

          <div className="mt-4 px-6">
            <div className="flex items-center justify-between rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-3">
              <span className="font-display text-sm font-black uppercase tracking-[0.14em] text-slate-300">XP Earned</span>
              <span className="font-display text-2xl font-black tabular-nums text-cyan-300">+{fmtNum(shown)} XP</span>
            </div>
            {data.server?.leveledUp && (
              <div className="mt-2 rounded-2xl border border-violet-300/40 bg-violet-300/10 px-4 py-2.5 text-center font-display text-sm font-black uppercase tracking-[0.14em] text-violet-200 shadow-[0_0_28px_rgba(167,139,250,0.3)]">
                Level Up — Level {data.server.level}
              </div>
            )}
          </div>

          {(data.ach.length > 0 || data.newCars.length > 0 || data.newTracks.length > 0) && (
            <div className="mt-4 space-y-2 px-6">
              {data.ach.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ x: -18, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-3 py-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-amber-300/15 text-lg" aria-hidden>
                    {a.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-amber-100">{a.name}</div>
                    <div className="truncate text-[11px] text-slate-400">{a.description}</div>
                  </div>
                  <span className="ml-auto shrink-0 font-display text-xs font-black tabular-nums text-amber-200">+{a.xp} XP</span>
                </motion.div>
              ))}
              {(data.newCars.length > 0 || data.newTracks.length > 0) && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2.5 text-sm font-bold text-cyan-100">
                  <UnlockIcon className="h-4 w-4 shrink-0 text-cyan-300" />
                  <span className="truncate">Unlocked: {[...data.newCars.map((c) => c.name), ...data.newTracks.map((t) => t.name)].join(' · ')}</span>
                </div>
              )}
            </div>
          )}

          {!data.server && onSignup && (
            <div className="mx-6 mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-center">
              <div className="font-display text-sm font-black uppercase tracking-[0.14em] text-amber-200">Demo result — not saved</div>
              <p className="mt-1 text-xs text-slate-300">Create an account to save scores and climb the leaderboards.</p>
              <Btn kind="primary" className="mt-3 px-4 py-2 text-xs" onClick={onSignup}>
                Create Account
              </Btn>
            </div>
          )}

          <div className="mt-5 space-y-2.5 px-6 pb-6">
            {onNext ? (
              <Btn kind="primary" className="w-full !py-3" onClick={onNext}>
                {nextLabel ?? 'Next Race'}
              </Btn>
            ) : (
              <Btn kind="primary" className="w-full !py-3" onClick={onRetry}>
                Race Again
              </Btn>
            )}
            <div className="grid grid-cols-3 gap-2.5">
              {onNext && (
                <Btn onClick={onRetry} className="!px-2">
                  Retry
                </Btn>
              )}
              <Btn onClick={onGarage} className={onNext ? '!px-2' : 'col-span-2'}>
                Garage
              </Btn>
              <Btn onClick={onMenu} className={onNext ? '!px-2' : ''}>
                Menu
              </Btn>
            </div>
            <p className="pt-1 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Enter to {onNext ? 'continue' : 'retry'} · Esc for menu
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Mini({ label, value, hot, accent, sub }: { label: string; value: string; hot?: boolean; accent?: boolean; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className={`mt-1 truncate font-display text-lg font-black tabular-nums ${hot ? 'text-violet-300' : accent ? 'text-cyan-300' : 'text-white'}`} title={value}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200/80">{sub}</div>}
    </div>
  );
}
