import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { RaceHistoryEntry, UserProfile } from 'shared';
import { ACHIEVEMENTS, getCar, getTrack, xpProgress } from 'shared';
import { api, ApiError } from '@/api';
import { Avatar, DiffTag, Panel, Title, XpBar } from '@/ui/kit';
import { ago, fmtNum, fmtTime, ordinal } from '@/sim/format';
import { Loading } from '@/ui/loading';

export function Profile() {
  const [p, setP] = useState<UserProfile | null>(null);
  const [hist, setHist] = useState<RaceHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.profile(), api.raceHistory(30)])
      .then(([prof, h]) => {
        setP(prof);
        setHist(h.races);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load profile.'));
  }, []);

  if (error) return <Panel className="mt-10 text-center text-rose-300">{error}</Panel>;
  if (!p) return <Loading label="Loading profile" />;

  const prog = xpProgress(p.xp);
  const have = new Map(p.achievements.map((a) => [a.id, a.unlockedAt]));

  return (
    <div className="py-4">
      <Title sub="Your racing identity, stats and history.">Profile</Title>
      <Panel glow className="mb-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar seed={p.avatarSeed} name={p.username} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white">{p.username}</h2>
              <span className="rounded-md border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 font-display text-[11px] font-black text-cyan-300">
                RANK #{p.globalRank ?? '—'}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Racing since {new Date(p.createdAt).toLocaleDateString()} · {p.email}
            </div>
            <div className="mt-3 max-w-md">
              <XpBar level={prog.level} cur={prog.current} need={prog.needed} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          ['Races', `${p.stats.totalRaces}`],
          ['Wins', `${p.stats.wins}`],
          ['Podiums', `${p.stats.podiums}`],
          ['Win Streak', `${p.stats.winStreak}`],
          ['Total Score', fmtNum(p.stats.totalScore)],
          ['Best Score', fmtNum(p.stats.bestScore)],
          ['Best Lap', p.stats.bestLapMs != null ? fmtTime(p.stats.bestLapMs) : '—'],
          ['Top Speed', `${p.stats.topSpeedKmh} km/h`],
          ['Distance', `${p.stats.totalDistanceKm} km`],
          ['Drift Pts', fmtNum(p.stats.totalDriftPoints)],
          ['Clean Races', `${p.stats.perfectRaces}`],
          ['Crowns', `${p.stats.championshipsWon}`],
        ].map(([l, v]) => (
          <Panel key={l} className="p-3 text-center">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{l}</div>
            <div className="mt-1 truncate font-display text-lg font-black text-white">{v}</div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Favorites</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorite Car</div>
              <div className="mt-1 font-display text-lg font-black text-white">
                {p.favoriteCar ? getCar(p.favoriteCar)?.name ?? '—' : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorite Track</div>
              <div className="mt-1 font-display text-lg font-black text-white">
                {p.favoriteTrack ? getTrack(p.favoriteTrack)?.name ?? '—' : '—'}
              </div>
            </div>
          </div>
          <h3 className="mb-3 mt-6 font-display text-sm font-black uppercase tracking-widest text-white">
            Awards ({p.achievements.length}/{ACHIEVEMENTS.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {ACHIEVEMENTS.map((a) => {
              const at = have.get(a.id);
              return (
                <div
                  key={a.id}
                  title={at ? `Unlocked ${ago(at)}` : a.description}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold',
                    at ? 'border-amber-300/40 text-amber-200' : 'border-white/10 text-slate-600'
                  )}
                >
                  <span>{a.icon}</span>
                  {a.name}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Racing History</h3>
          {hist.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No races recorded yet.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                {hist.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <span className={clsx('w-9 font-display font-black', r.position === 1 ? 'text-amber-300' : 'text-slate-400')}>
                      {ordinal(r.position)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-200">{r.trackName}</div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                        {r.carName} · <DiffTag d={r.difficulty} /> {r.mode} · {ago(r.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-black text-cyan-300">{fmtNum(r.score)}</div>
                      <div className="text-[10px] tabular-nums text-slate-500">{r.bestLapMs ? fmtTime(r.bestLapMs) : 'DNF'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
