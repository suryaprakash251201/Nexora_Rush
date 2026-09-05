import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { xpProgress, getCar, getTrack, DIFFICULTIES, type DailyChallengeStatus, type RaceHistoryEntry, type UserProfile } from 'shared';
import { api, ApiError } from '@/api';
import { useAuth } from '@/store/auth';
import { useSetup } from '@/store/settings';
import { Avatar, Btn, Panel, Title, XpBar } from '@/ui/kit';
import { ago, fmtNum, fmtTime, ordinal } from '@/sim/format';
import { Loading } from '@/ui/loading';

export function Home() {
  const user = useAuth((s) => s.user);
  const setup = useSetup();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [daily, setDaily] = useState<DailyChallengeStatus | null>(null);
  const [recent, setRecent] = useState<RaceHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.profile(), api.dailyStatus(), api.raceHistory(5)])
      .then(([p, d, h]) => {
        setProfile(p);
        setDaily(d);
        setRecent(h.races);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load your dashboard.'));
  }, []);

  if (error) {
    return (
      <div className="panel mt-10 p-6 text-center text-rose-300">
        {error}
        <Btn className="mx-auto mt-4 block" onClick={() => window.location.reload()}>Retry</Btn>
      </div>
    );
  }
  if (!profile || !user) return <Loading label="Loading HQ" />;

  const prog = xpProgress(profile.xp);
  const dailyTrack = daily ? getTrack(daily.trackId) : undefined;

  return (
    <div className="py-4">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Title sub={`Welcome back, ${profile.username}. The grid is hot.`}>Racing HQ</Title>
        <div className="flex items-center gap-3">
          <Avatar seed={profile.avatarSeed} name={profile.username} size={44} />
          <XpBar level={prog.level} cur={prog.current} need={prog.needed} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Panel glow className="flex h-full flex-col">
            <div className="text-3xl">🏁</div>
            <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wider text-white">Quick Race</h3>
            <p className="mt-1 flex-1 text-sm text-slate-400">Full grid, three laps, pure racing.</p>
            <Btn
              kind="primary"
              className="mt-4"
              onClick={() => {
                setup.set('mode', 'quick');
                navigate(`/setup/${setup.trackId}`);
              }}
            >
              Start Race
            </Btn>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Panel className={clsx('flex h-full flex-col', daily && daily.available && 'border-amber-300/40 shadow-[0_0_40px_rgba(251,191,36,0.12)]')}>
            <div className="flex items-center justify-between">
              <div className="text-3xl">📅</div>
              {daily?.completedToday && (
                <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Done
                </span>
              )}
            </div>
            <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wider text-white">Daily Challenge</h3>
            {daily && daily.available && dailyTrack ? (
              <>
                <p className="mt-1 flex-1 text-sm text-slate-400">
                  {dailyTrack.name} · {daily.laps} laps ·{' '}
                  <span className="font-bold text-amber-300">{DIFFICULTIES[daily.difficulty]?.label}</span>
                </p>
                <Btn
                  kind="primary"
                  className="mt-4"
                  onClick={() => {
                    setup.set('mode', 'daily');
                    setup.set('laps', daily.laps);
                    setup.set('difficulty', daily.difficulty);
                    navigate(`/setup/${daily.trackId}`);
                  }}
                >
                  Accept Challenge
                </Btn>
              </>
            ) : (
              <p className="mt-1 flex-1 text-sm text-slate-400">Done for today — a new challenge drops at midnight UTC.</p>
            )}
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Panel className="flex h-full flex-col">
            <div className="text-3xl">👑</div>
            <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wider text-white">Championship</h3>
            <p className="mt-1 flex-1 text-sm text-slate-400">Three rounds, accumulating points. Win 2+ to take the crown.</p>
            <Btn className="mt-4" onClick={() => navigate('/play/championship')}>
              View Series
            </Btn>
          </Panel>
        </motion.div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <QStat label="Best Score" value={fmtNum(profile.stats.bestScore)} />
        <QStat label="Best Lap" value={profile.stats.bestLapMs != null ? fmtTime(profile.stats.bestLapMs) : '--'} />
        <QStat label="Global Rank" value={profile.globalRank != null ? `#${profile.globalRank}` : '—'} />
        <QStat label="Wins" value={`${profile.stats.wins}`} />
        <QStat label="Races" value={`${profile.stats.totalRaces}`} />
        <QStat label="Distance" value={`${profile.stats.totalDistanceKm} km`} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">Recent Races</h3>
            <Link to="/profile" className="text-[11px] font-bold uppercase tracking-widest text-cyan-300 hover:underline">
              Full history →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No races yet — hit the track!</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className={clsx('font-display font-black', r.position === 1 ? 'text-amber-300' : 'text-slate-400')}>
                    {ordinal(r.position)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-200">{r.trackName}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">{r.carName} · {ago(r.createdAt)}</div>
                  </div>
                  <span className="font-display text-sm font-black text-cyan-300">{fmtNum(r.score)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Your Stable</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorite Car</div>
              <div className="mt-1 font-display text-base font-black text-white">
                {profile.favoriteCar ? getCar(profile.favoriteCar)?.name ?? '—' : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorite Track</div>
              <div className="mt-1 font-display text-base font-black text-white">
                {profile.favoriteTrack ? getTrack(profile.favoriteTrack)?.name ?? '—' : '—'}
              </div>
            </div>
          </div>
          <h3 className="mb-3 mt-5 font-display text-sm font-black uppercase tracking-widest text-white">Unlocks</h3>
          <div className="flex flex-wrap gap-2">
            {['street-hawk', 'thunder-gt', 'blaze-x', 'shadow-rs', 'velocity-r', 'phantom-gt', 'apex-one', 'inferno-x', 'titan-z'].map((id) => {
              const ok = profile.unlockedCars.includes(id);
              return (
                <div key={id} className={clsx('rounded-lg border px-2.5 py-1.5 text-[11px] font-bold', ok ? 'border-cyan-300/40 text-cyan-200' : 'border-white/10 text-slate-600')}>
                  {ok ? '🔓' : '🔒'} {getCar(id)?.name}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function QStat({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-4 text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 truncate font-display text-xl font-black text-white">{value}</div>
    </Panel>
  );
}
