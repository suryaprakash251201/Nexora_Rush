import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import type { LeaderboardResponse } from 'shared';
import { getCar, getTrack } from 'shared';
import { api, ApiError } from '@/api';
import { useAuth } from '@/store/auth';
import { Avatar, Panel, Title } from '@/ui/kit';
import { fmtNum, fmtTime } from '@/sim/format';

type Tab = 'global' | 'weekly' | 'monthly' | 'track';

export function Board() {
  const user = useAuth((s) => s.user);
  const [tab, setTab] = useState<Tab>('global');
  const [trackId, setTrackId] = useState('city-rush');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    setError(null);
    api
      .leaderboard(tab, tab === 'track' ? trackId : undefined)
      .then((r) => {
        if (!dead) setData(r);
      })
      .catch((e) => {
        if (!dead) setError(e instanceof ApiError ? e.message : 'Leaderboard unavailable.');
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [tab, trackId]);

  return (
    <div className="py-4">
      <Title sub="Every score is server-validated and stored.">Leaderboards</Title>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {([
          ['global', 'Global'],
          ['weekly', 'Weekly'],
          ['monthly', 'Monthly'],
          ['track', 'By Track'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-xl border px-4 py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors',
              tab === t ? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-300' : 'border-white/10 text-slate-400 hover:text-slate-200'
            )}
          >
            {label}
          </button>
        ))}
        {tab === 'track' && (
          <select
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            aria-label="Track"
            className="ml-2 rounded-xl border border-white/10 bg-[#0a1220] px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-200 outline-none"
          >
            {['city-rush', 'desert-storm', 'mountain-pass', 'arctic-run', 'tropical-coast', 'cyber-circuit'].map((id) => (
              <option key={id} value={id}>{getTrack(id)?.name ?? id}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <Panel className="text-center text-rose-300">
          {error}
          <button onClick={() => window.location.reload()} className="mt-3 block w-full text-xs font-bold uppercase tracking-widest text-cyan-300 hover:underline">
            Retry
          </button>
        </Panel>
      )}
      {loading && (
        <Panel className="py-12 text-center">
          <div className="mx-auto h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
            <div className="nr-pulse h-full w-1/2 rounded-full bg-cyan-300" />
          </div>
        </Panel>
      )}
      {!loading && data && data.entries.length === 0 && (
        <Panel className="py-12 text-center text-slate-400">No scores here yet. Be the first — go set a time.</Panel>
      )}
      {!loading && data && data.entries.length > 0 && (
        <Panel className="overflow-hidden !p-0">
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
                    initial={{ backgroundColor: 'rgba(34,211,238,0.16)' }}
                    animate={{ backgroundColor: me ? 'rgba(34,211,238,0.08)' : 'rgba(0,0,0,0)' }}
                    transition={{ duration: 1.2 }}
                    className={clsx(
                      'grid grid-cols-[48px_1fr_90px_120px] items-center gap-2 px-4 py-2.5 text-sm sm:grid-cols-[56px_1fr_110px_140px_140px]',
                      me && 'border-l-2 border-cyan-300'
                    )}
                  >
                    <span className={clsx('font-display font-black', e.rank === 1 ? 'text-amber-300' : e.rank === 2 ? 'text-slate-200' : e.rank === 3 ? 'text-orange-400' : 'text-slate-500')}>
                      {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}
                    </span>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar seed={e.avatarSeed} name={e.username} size={28} />
                      <div className="min-w-0">
                        <div className={clsx('truncate font-bold', me ? 'text-cyan-300' : 'text-white')}>
                          {e.username}{me && ' (you)'}
                        </div>
                        <div className="truncate text-[10px] uppercase tracking-widest text-slate-500">
                          {getTrack(e.trackId)?.name ?? e.trackId}
                        </div>
                      </div>
                    </div>
                    <span className="text-right font-display font-black tabular-nums text-white">{fmtNum(e.score)}</span>
                    <span className="hidden truncate text-slate-400 sm:block">{getCar(e.carId)?.name ?? e.carId}</span>
                    <span className="hidden text-right font-semibold tabular-nums text-violet-300 sm:block">
                      {e.bestLapMs ? fmtTime(e.bestLapMs) : '—'}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {data.userRank && data.userRank > data.entries.length && (
            <div className="border-t border-cyan-300/30 bg-cyan-300/5 px-4 py-2.5 text-sm">
              <span className="font-bold text-cyan-300">Your rank: #{data.userRank}</span>
              <span className="ml-2 text-slate-400">— keep pushing to reach the board!</span>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
