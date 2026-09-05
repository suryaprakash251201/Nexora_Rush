import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { AchievementDef, CarDef, RaceFinishResponse, TrackDef } from 'shared';
import { Btn, Panel } from './kit';
import { fmtTime, fmtNum, ordinal } from '@/sim/format';

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

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="w-[min(94vw,540px)] py-6"
      >
        <Panel className="panel-solid overflow-hidden">
          <div
            className="px-6 pb-5 pt-6 text-center"
            style={{ background: won ? 'linear-gradient(180deg, rgba(52,211,153,0.16), transparent)' : 'linear-gradient(180deg, rgba(34,211,238,0.12), transparent)' }}
          >
            <div className="font-display text-3xl font-black uppercase tracking-[0.12em] text-white sm:text-4xl" style={{ textShadow: '0 0 30px rgba(34,211,238,0.5)' }}>
              {data.wrecked ? 'Wrecked' : won ? 'Victory!' : data.raceMs != null ? 'Finish!' : 'Race Over'}
            </div>
            <div className="mt-3 flex items-baseline justify-center gap-2">
              <span className="font-display text-5xl font-black text-cyan-300 sm:text-6xl" style={{ textShadow: '0 0 30px rgba(34,211,238,0.6)' }}>
                {ordinal(data.position)}
              </span>
              <span className="text-lg font-bold text-slate-400">/ {data.grid}</span>
            </div>
            {data.personalBest && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 12 }}
                className="mx-auto mt-3 w-fit rounded-full border border-amber-300/50 bg-amber-300/15 px-4 py-1 font-display text-xs font-black uppercase tracking-[0.14em] text-amber-200"
              >
                ★ New Personal Best
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 px-6">
            <Mini label="Time" value={data.raceMs != null ? fmtTime(data.raceMs) : 'DNF'} />
            <Mini label="Best Lap" value={data.bestMs != null ? fmtTime(data.bestMs) : '--'} hot={data.fastLap} />
            <Mini label="Score" value={fmtNum(data.score)} />
          </div>

          <div className="mt-5 px-6">
            <div className="flex items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-3">
              <span className="font-display text-sm font-black uppercase tracking-[0.14em] text-slate-300">XP Earned</span>
              <span className="font-display text-2xl font-black tabular-nums text-cyan-300">+{fmtNum(shown)} XP</span>
            </div>
            {data.server?.leveledUp && (
              <div className="mt-2 rounded-xl border border-violet-300/30 bg-violet-300/10 px-4 py-2 text-center font-display text-sm font-black uppercase tracking-[0.14em] text-violet-200">
                ⬆ Level Up — Level {data.server.level}
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
                  className="flex items-center gap-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2"
                >
                  <span className="text-xl">{a.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-amber-100">{a.name}</div>
                    <div className="text-[11px] text-slate-400">{a.description}</div>
                  </div>
                  <span className="ml-auto font-display text-xs font-black text-amber-200">+{a.xp} XP</span>
                </motion.div>
              ))}
              {(data.newCars.length > 0 || data.newTracks.length > 0) && (
                <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100">
                  🔓 Unlocked: {[...data.newCars.map((c) => c.name), ...data.newTracks.map((t) => t.name)].join(' · ')}
                </div>
              )}
            </div>
          )}

          {!data.server && onSignup && (
            <div className="mx-6 mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-center">
              <div className="font-display text-sm font-black uppercase tracking-[0.14em] text-amber-200">Demo result — not saved</div>
              <p className="mt-1 text-xs text-slate-300">Create an account to save scores and climb the leaderboards.</p>
              <Btn kind="primary" className="mt-3 px-4 py-2 text-xs" onClick={onSignup}>
                Create Account
              </Btn>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 px-6 pb-6">
            <Btn kind="primary" onClick={onRetry}>Retry</Btn>
            {onNext ? (
              <Btn kind="primary" onClick={onNext}>{nextLabel ?? 'Next Race'}</Btn>
            ) : (
              <Btn onClick={onGarage}>Garage</Btn>
            )}
            {onNext && <Btn onClick={onGarage}>Garage</Btn>}
            <Btn onClick={onMenu}>Main Menu</Btn>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}

function Mini({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className={`mt-1 font-display text-lg font-black tabular-nums ${hot ? 'text-violet-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}
