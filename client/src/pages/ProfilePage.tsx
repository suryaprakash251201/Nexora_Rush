import { useEffect, useState } from 'react';
import type { UserProfile, RaceHistoryEntry, UnlockedAchievement } from 'shared';
import { ACHIEVEMENTS, getCar, getTrack, levelFromXp } from 'shared';
import { api, ApiError } from '@/services/api';
import { GlassPanel, NeonButton, SectionTitle, XPBar, Avatar, DifficultyBadge } from '@/ui/shared';
import { formatTime, formatNumber, timeAgo, ordinal } from '@/game/engine/format';
import { xpProgress } from 'shared';
import { clsx } from 'clsx';
import { useAuth } from '@/store/auth';

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<RaceHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.profile(), api.raceHistory(30)])
      .then(([p, h]) => {
        setProfile(p);
        setHistory(h.races);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load profile.'));
  }, []);

  if (error) return <GlassPanel className="mt-10 text-center text-rose-300">{error}</GlassPanel>;
  if (!profile) return null;

  const prog = xpProgress(profile.xp);
  const unlockedAch = new Map(profile.achievements.map((a) => [a.id, a.unlockedAt]));

  return (
    <div className="py-4">
      <SectionTitle sub="Your racing identity, stats and history.">Profile</SectionTitle>

      {/* identity card */}
      <GlassPanel glow className="mb-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar seed={profile.avatarSeed} username={profile.username} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white">{profile.username}</h2>
              <span className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 font-display text-[11px] font-black text-neon-cyan">
                RANK #{profile.globalRank ?? '—'}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Racing since {new Date(profile.createdAt).toLocaleDateString()} · {profile.email}</div>
            <div className="mt-3 max-w-md">
              <XPBar level={prog.level} current={prog.current} needed={prog.needed} />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Stat label="Races" value={`${profile.stats.totalRaces}`} />
        <Stat label="Wins" value={`${profile.stats.wins}`} />
        <Stat label="Podiums" value={`${profile.stats.podiums}`} />
        <Stat label="Win Streak" value={`${profile.stats.winStreak}`} />
        <Stat label="Total Score" value={formatNumber(profile.stats.totalScore)} />
        <Stat label="Best Score" value={formatNumber(profile.stats.bestScore)} />
        <Stat label="Best Lap" value={profile.stats.bestLapMs != null ? formatTime(profile.stats.bestLapMs) : '—'} />
        <Stat label="Top Speed" value={`${profile.stats.topSpeedKmh} km/h`} />
        <Stat label="Distance" value={`${profile.stats.totalDistanceKm} km`} />
        <Stat label="Drift Pts" value={formatNumber(profile.stats.totalDriftPoints)} />
        <Stat label="Perfect Races" value={`${profile.stats.perfectRaces}`} />
        <Stat label="Championships" value={`${profile.stats.championshipsWon}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* favorites */}
        <GlassPanel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Favorites</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorite Car</div>
              <div className="mt-1 font-display text-lg font-black text-white">{profile.favoriteCar ? getCar(profile.favoriteCar)?.name ?? '—' : '—'}</div>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Favorite Track</div>
              <div className="mt-1 font-display text-lg font-black text-white">{profile.favoriteTrack ? getTrack(profile.favoriteTrack)?.name ?? '—' : '—'}</div>
            </div>
          </div>
          <h3 className="mb-3 mt-6 font-display text-sm font-black uppercase tracking-widest text-white">
            Achievements ({profile.achievements.length}/{ACHIEVEMENTS.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {ACHIEVEMENTS.map((a) => {
              const at = unlockedAch.get(a.id);
              return (
                <div
                  key={a.id}
                  title={at ? `Unlocked ${timeAgo(at)}` : a.description}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold',
                    at ? 'border-amber-400/40 text-amber-200' : 'border-white/10 text-slate-600'
                  )}
                >
                  <span>{a.icon}</span>
                  {a.name}
                </div>
              );
            })}
          </div>
        </GlassPanel>

        {/* history */}
        <GlassPanel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Racing History</h3>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No races recorded yet.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                {history.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <span className={clsx('w-9 font-display font-black', r.position === 1 ? 'text-amber-400' : 'text-slate-400')}>
                      {ordinal(r.position)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-200">{r.trackName}</div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">
                        {r.carName} · <DifficultyBadge difficulty={r.difficulty} /> {r.mode} · {timeAgo(r.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-black text-neon-cyan">{formatNumber(r.score)}</div>
                      <div className="text-[10px] tabular-nums text-slate-500">
                        {r.bestLapMs ? formatTime(r.bestLapMs) : 'DNF'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-3 text-center">
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 truncate font-display text-lg font-black text-white">{value}</div>
    </GlassPanel>
  );
}

export type { UnlockedAchievement };
void levelFromXp;
