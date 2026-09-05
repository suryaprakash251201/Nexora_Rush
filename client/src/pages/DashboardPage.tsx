import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { UserProfile, DailyChallengeStatus, RaceHistoryEntry } from 'shared';
import { getTrack, getCar, DIFFICULTIES } from 'shared';
import { api, ApiError } from '@/services/api';
import { GlassPanel, NeonButton, XPBar, SectionTitle, Avatar } from '@/ui/shared';
import { formatTime, formatNumber, timeAgo, ordinal } from '@/game/engine/format';
import { xpProgress } from 'shared';
import { useAuth } from '@/store/auth';
import { useRaceSetup } from '@/store/settings';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { clsx } from 'clsx';

export function DashboardPage() {
  const user = useAuth((s) => s.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [daily, setDaily] = useState<DailyChallengeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setup = useRaceSetup();

  useEffect(() => {
    Promise.all([api.profile(), api.dailyStatus(), api.raceHistory(5)])
      .then(([p, d, h]) => {
        setProfile({ ...p, recentRaces: h.races });
        setDaily(d);
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Could not load your dashboard.');
      });
  }, []);

  if (error) {
    return (
      <div className="glass mt-10 p-6 text-center text-rose-300">
        {error}
        <NeonButton className="mx-auto mt-4 block" onClick={() => window.location.reload()}>Retry</NeonButton>
      </div>
    );
  }
  if (!profile || !user) return <LoadingScreen label="LOADING GARAGE" />;

  const prog = xpProgress(profile.xp);
  const dailyTrack = getTrack(daily?.trackId ?? 'city-rush')!;

  const startQuickRace = () => {
    setup.set('mode', 'quick');
    navigate(`/setup/${setup.trackId}`);
  };

  return (
    <div className="py-4">
      {/* header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <SectionTitle sub={`Welcome back, ${profile.username}. The grid is hot.`}>
          Racing HQ
        </SectionTitle>
        <div className="flex items-center gap-3">
          <Avatar seed={profile.avatarSeed} username={profile.username} size={44} />
          <XPBar level={prog.level} current={prog.current} needed={prog.needed} />
        </div>
      </div>

      {/* primary actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <GlassPanel glow className="flex h-full flex-col">
            <div className="text-3xl">🏁</div>
            <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wider text-white">Quick Race</h3>
            <p className="mt-1 flex-1 text-sm text-slate-400">Full grid, three laps, pure racing.</p>
            <NeonButton variant="primary" className="mt-4" onClick={startQuickRace}>Start Race</NeonButton>
          </GlassPanel>
        </motion.div>

        {/* daily challenge */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassPanel className={`flex h-full flex-col ${daily && !daily.completedToday ? 'border-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.12)]' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="text-3xl">📅</div>
              {daily?.completedToday && (
                <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Completed
                </span>
              )}
            </div>
            <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wider text-white">Daily Challenge</h3>
            {daily && daily.available ? (
              <>
                <p className="mt-1 flex-1 text-sm text-slate-400">
                  {dailyTrack.name} · {daily.laps} laps · <DiffLabel d={daily.difficulty} />
                </p>
                <NeonButton
                  variant="primary"
                  className="mt-4"
                  onClick={() => {
                    setup.set('mode', 'daily');
                    setup.set('laps', daily.laps);
                    setup.set('difficulty', daily.difficulty);
                    navigate(`/setup/${daily.trackId}`);
                  }}
                >
                  Accept Challenge
                </NeonButton>
              </>
            ) : (
              <p className="mt-1 flex-1 text-sm text-slate-400">Done for today — new challenge at midnight UTC.</p>
            )}
          </GlassPanel>
        </motion.div>

        {/* championship */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassPanel className="flex h-full flex-col">
            <div className="text-3xl">👑</div>
            <h3 className="mt-2 font-display text-lg font-black uppercase tracking-wider text-white">Championship</h3>
            <p className="mt-1 flex-1 text-sm text-slate-400">Three rounds, accumulating points. Win 2+ to take the crown.</p>
            <NeonButton className="mt-4" onClick={() => navigate('/play/championship')}>View Series</NeonButton>
          </GlassPanel>
        </motion.div>
      </div>

      {/* stats grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Best Score" value={formatNumber(profile.stats.bestScore)} />
        <Stat label="Best Lap" value={profile.stats.bestLapMs != null ? formatTime(profile.stats.bestLapMs) : '--'} />
        <Stat label="Global Rank" value={profile.globalRank != null ? `#${profile.globalRank}` : '—'} />
        <Stat label="Wins" value={`${profile.stats.wins}`} />
        <Stat label="Races" value={`${profile.stats.totalRaces}`} />
        <Stat label="Distance" value={`${profile.stats.totalDistanceKm} km`} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {/* recent races */}
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">Recent Races</h3>
            <Link to="/profile" className="text-[11px] font-bold uppercase tracking-widest text-neon-cyan hover:underline">
              Full history →
            </Link>
          </div>
          {profile.recentRaces.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No races yet — hit the track!</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {profile.recentRaces.map((r: RaceHistoryEntry) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className={clsx('font-display font-black', r.position === 1 ? 'text-amber-400' : 'text-slate-400')}>
                    {ordinal(r.position)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-200">{r.trackName}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">{r.carName} · {timeAgo(r.createdAt)}</div>
                  </div>
                  <span className="font-display text-sm font-black text-neon-cyan">{formatNumber(r.score)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* favorites + featured */}
        <GlassPanel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Your Garage</h3>
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
          <h3 className="mb-3 mt-5 font-display text-sm font-black uppercase tracking-widest text-white">Progress</h3>
          <div className="flex flex-wrap gap-2">
            {['street-hawk', 'thunder-gt', 'blaze-x', 'shadow-rs', 'velocity-r', 'phantom-gt', 'apex-one', 'inferno-x', 'titan-z'].map((id) => {
              const unlocked = profile.unlockedCars.includes(id);
              return (
                <div
                  key={id}
                  className={clsx(
                    'rounded-lg border px-2.5 py-1.5 text-[11px] font-bold',
                    unlocked ? 'border-cyan-400/40 text-cyan-200' : 'border-white/10 text-slate-600'
                  )}
                >
                  {unlocked ? '🔓' : '🔒'} {getCar(id)?.name}
                </div>
              );
            })}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-4 text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 truncate font-display text-xl font-black text-white">{value}</div>
    </GlassPanel>
  );
}

function DiffLabel({ d }: { d: string }) {
  return <span className="font-bold text-amber-400">{DIFFICULTIES[d as keyof typeof DIFFICULTIES]?.label ?? d}</span>;
}
