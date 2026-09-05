import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LeaderboardResponse } from 'shared';
import { getTrack, getCar } from 'shared';
import { api, ApiError } from '@/services/api';
import { useAuth } from '@/store/auth';
import { GlassPanel, SectionTitle, Avatar } from '@/ui/shared';
import { formatTime, formatNumber } from '@/game/engine/format';
import { clsx } from 'clsx';

type Tab = 'global' | 'weekly' | 'monthly' | 'track';

const TABS: { id: Tab; label: string }[] = [
  { id: 'global', label: 'Global' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'track', label: 'By Track' },
];

export function LeaderboardPage() {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>('global');
  const [trackId, setTrackId] = useState('city-rush');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .leaderboard(tab, tab === 'track' ? trackId : undefined)
      .then((r) => {
        if (cancelled) return;
        setData(r);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Leaderboard unavailable.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, trackId]);

  const tracks = getTrackList();

  return (
    <div className="py-4">
      <SectionTitle sub="Every score here is server-validated and stored in the database.">Leaderboards</SectionTitle>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={clsx(
              'rounded-xl border px-4 py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors',
              tab === t.id ? 'border-cyan-400/60 bg-cyan-400/15 text-neon-cyan' : 'border-white/10 text-slate-400 hover:text-slate-200'
            )}
          >
            {t.label}
          </button>
        ))}
        {tab === 'track' && (
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            aria-label="Track"
            className="ml-2 rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-200 outline-none"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <GlassPanel className="text-center text-rose-300">
          {error}
          <NeonBtnRetry />
        </GlassPanel>
      )}

      {loading && (
        <GlassPanel className="py-12 text-center">
          <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400" />
          </div>
        </GlassPanel>
      )}

      {!loading && data && data.entries.length === 0 && (
        <GlassPanel className="py-12 text-center text-slate-400">
          No scores yet in this board. Be the first — go set a time.
        </GlassPanel>
      )}

      {!loading && data && data.entries.length > 0 && (
        <GlassPanel className="overflow-hidden p-0">
          <div className="grid grid-cols-[48px_1fr_90px_120px] gap-2 border-b border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:grid-cols-[56px_1fr_110px_140px_140px]">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Score</span>
            <span className="hidden sm:block">Car</span>
            <span className="hidden text-right sm:block">Best Lap</span>
          </div>
          <div className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {data.entries.map((e) => {
                const me = user?.id === e.userId;
                return (
                  <motion.div
                    key={`${e.userId}-${e.createdAt}`}
                    layout
                    initial={{ backgroundColor: 'rgba(34,211,238,0.18)' }}
                    animate={{ backgroundColor: me ? 'rgba(34,211,238,0.08)' : 'rgba(0,0,0,0)' }}
                    transition={{ duration: 1.2 }}
                    className={clsx(
                      'grid grid-cols-[48px_1fr_90px_120px] items-center gap-2 px-4 py-2.5 text-sm sm:grid-cols-[56px_1fr_110px_140px_140px]',
                      me && 'border-l-2 border-cyan-400'
                    )}
                  >
                    <span
                      className={clsx(
                        'font-display font-black',
                        e.rank === 1 ? 'text-amber-400' : e.rank === 2 ? 'text-slate-300' : e.rank === 3 ? 'text-orange-400' : 'text-slate-500'
                      )}
                    >
                      {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}
                    </span>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar seed={e.avatarSeed} username={e.username} size={28} />
                      <div className="min-w-0">
                        <div className={clsx('truncate font-bold', me ? 'text-neon-cyan' : 'text-white')}>
                          {e.username}{me && ' (you)'}
                        </div>
                        <div className="truncate text-[10px] uppercase tracking-widest text-slate-500">
                          {getTrack(e.trackId)?.name ?? e.trackId}
                        </div>
                      </div>
                    </div>
                    <span className="text-right font-display font-black tabular-nums text-white">{formatNumber(e.score)}</span>
                    <span className="hidden truncate text-slate-400 sm:block">{getCar(e.carId)?.name ?? e.carId}</span>
                    <span className="hidden text-right font-semibold tabular-nums text-neon-violet sm:block">
                      {e.bestLapMs ? formatTime(e.bestLapMs) : '—'}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {data.userRank && data.userRank > data.entries.length && (
            <div className="border-t border-cyan-400/30 bg-cyan-400/5 px-4 py-2.5 text-sm">
              <span className="font-bold text-neon-cyan">Your rank: #{data.userRank}</span>
              <span className="ml-2 text-slate-400">— keep pushing to climb onto the board!</span>
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}

function NeonBtnRetry() {
  return (
    <button onClick={() => window.location.reload()} className="mt-3 text-xs font-bold uppercase tracking-widest text-neon-cyan hover:underline">
      Retry
    </button>
  );
}

function getTrackList() {
  return ['city-rush', 'desert-storm', 'mountain-pass', 'arctic-run', 'tropical-coast', 'cyber-circuit'].map(
    (id) => getTrack(id)!
  );
}
