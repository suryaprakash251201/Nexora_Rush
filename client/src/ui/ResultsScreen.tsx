import { motion } from 'framer-motion';
import type { AchievementDef, CarDef, RaceFinishResponse, TrackDef } from 'shared';
import { NeonButton, GlassPanel } from './shared';
import { formatTime, formatNumber, ordinal } from '@/game/engine/format';
import { useEffect, useState } from 'react';

export interface ResultsData {
  position: number;
  grid: number;
  raceTimeMs: number | null;
  bestLapMs: number | null;
  score: number;
  xpEarned: number;
  isPersonalBest: boolean;
  fastLap: boolean;
  wrecked: boolean;
  serverResponse: RaceFinishResponse | null; // null = guest demo
  unlockedAchievements: AchievementDef[];
  unlockedCars: CarDef[];
  unlockedTracks: TrackDef[];
  levelBefore: number;
}

export function ResultsScreen({
  data,
  onRetry,
  onNext,
  onGarage,
  onMenu,
  onSignUp,
  nextLabel,
}: {
  data: ResultsData;
  onRetry: () => void;
  onNext?: () => void;
  onGarage?: () => void;
  onMenu: () => void;
  onSignUp?: () => void;
  nextLabel?: string;
}) {
  const [xpShown, setXpShown] = useState(0);
  const won = data.position === 1 && !data.wrecked;

  // animate XP count-up
  useEffect(() => {
    const dur = 900;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setXpShown(Math.round(data.xpEarned * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, 400);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [data.xpEarned]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="w-[min(94vw,540px)] py-6"
      >
        <GlassPanel className="glass-strong overflow-hidden">
          {/* header */}
          <div
            className="relative px-6 pb-5 pt-6 text-center"
            style={{
              background: won
                ? 'linear-gradient(180deg, rgba(52,211,153,0.16), transparent)'
                : 'linear-gradient(180deg, rgba(34,211,238,0.12), transparent)',
            }}
          >
            <div className="font-display text-3xl font-black uppercase tracking-widest text-white sm:text-4xl" style={{ textShadow: '0 0 30px rgba(34,211,238,0.5)' }}>
              {data.wrecked ? 'Wrecked' : won ? 'Victory!' : data.raceTimeMs != null ? 'Finish!' : 'Race Over'}
            </div>
            <div className="mt-3 flex items-baseline justify-center gap-2">
              <span className="font-display text-5xl font-black text-neon-cyan sm:text-6xl" style={{ textShadow: '0 0 30px rgba(34,211,238,0.6)' }}>
                {ordinal(data.position)}
              </span>
              <span className="text-lg font-bold text-slate-400">/ {data.grid}</span>
            </div>
            {data.isPersonalBest && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', damping: 12 }}
                className="mx-auto mt-3 w-fit rounded-full border border-amber-400/50 bg-amber-400/15 px-4 py-1 font-display text-xs font-black uppercase tracking-widest text-amber-300"
              >
                ★ New Personal Best!
              </motion.div>
            )}
          </div>

          {/* stats */}
          <div className="grid grid-cols-3 gap-3 px-6">
            <Stat label="Time" value={data.raceTimeMs != null ? formatTime(data.raceTimeMs) : 'DNF'} />
            <Stat label="Best Lap" value={data.bestLapMs != null ? formatTime(data.bestLapMs) : '--'} accent={data.fastLap} />
            <Stat label="Score" value={formatNumber(data.score)} />
          </div>

          {/* xp */}
          <div className="mt-5 px-6">
            <div className="flex items-center justify-between rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
              <span className="font-display text-sm font-black uppercase tracking-widest text-slate-300">XP Earned</span>
              <motion.span
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="font-display text-2xl font-black tabular-nums text-neon-cyan"
              >
                +{formatNumber(xpShown)} XP
              </motion.span>
            </div>
            {data.serverResponse?.leveledUp && (
              <div className="mt-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-center font-display text-sm font-black uppercase tracking-widest text-violet-300">
                ⬆ Level Up — Level {data.serverResponse.level}
              </div>
            )}
          </div>

          {/* unlocks */}
          {(data.unlockedAchievements.length > 0 || data.unlockedCars.length > 0 || data.unlockedTracks.length > 0) && (
            <div className="mt-4 space-y-2 px-6">
              {data.unlockedAchievements.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ x: -18, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2"
                >
                  <span className="text-xl">{a.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-amber-200">{a.name}</div>
                    <div className="text-[11px] text-slate-400">{a.description}</div>
                  </div>
                  <span className="ml-auto font-display text-xs font-black text-amber-300">+{a.xp} XP</span>
                </motion.div>
              ))}
              {(data.unlockedCars.length > 0 || data.unlockedTracks.length > 0) && (
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-bold text-cyan-200">
                  🔓 Unlocked: {[...data.unlockedCars.map((c) => c.name), ...data.unlockedTracks.map((t) => t.name)].join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* guest CTA */}
          {!data.serverResponse && onSignUp && (
            <div className="mx-6 mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center">
              <div className="font-display text-sm font-black uppercase tracking-widest text-amber-300">Demo result — not saved</div>
              <p className="mt-1 text-xs text-slate-300">Create an account to save scores, climb leaderboards and keep this progress.</p>
              <NeonButton variant="primary" size="sm" className="mt-3" onClick={onSignUp}>
                Create Account
              </NeonButton>
            </div>
          )}

          {/* actions */}
          <div className="mt-5 grid grid-cols-2 gap-3 px-6 pb-6">
            <NeonButton variant="primary" onClick={onRetry}>Retry</NeonButton>
            {onNext ? (
              <NeonButton variant="primary" onClick={onNext}>{nextLabel ?? 'Next Race'}</NeonButton>
            ) : (
              <NeonButton onClick={onGarage ?? onMenu}>Garage</NeonButton>
            )}
            {onNext && <NeonButton onClick={onGarage ?? onMenu}>Garage</NeonButton>}
            <NeonButton onClick={onMenu}>Main Menu</NeonButton>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`mt-1 font-display text-lg font-black tabular-nums ${accent ? 'text-neon-violet' : 'text-white'}`}>{value}</div>
    </div>
  );
}
