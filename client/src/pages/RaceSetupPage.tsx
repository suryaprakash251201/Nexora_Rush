import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCar, getTrack, CARS, DIFFICULTIES, carTopSpeedKmh, type Difficulty, type Weather } from 'shared';
import { api } from '@/services/api';
import { useAuth } from '@/store/auth';
import { useRaceSetup, useSettings } from '@/store/settings';
import { GlassPanel, NeonButton, SectionTitle, DifficultyBadge } from '@/ui/shared';
import { formatTime, formatNumber } from '@/game/engine/format';
import { audio } from '@/game/engine/audio';
import { clsx } from 'clsx';
import { minimapPath } from '@/game/tracks/trackDefs';

export function RaceSetupPage() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setup = useRaceSetup();
  const settings = useSettings();
  const track = getTrack(trackId ?? '') ?? getTrack('city-rush')!;
  const car = getCar(setup.carId) ?? CARS[0];

  const [worldRecord, setWorldRecord] = useState<{ username: string; bestLapMs: number | null; score: number } | null>(null);
  const [personalBest, setPersonalBest] = useState<{ bestLapMs: number | null; bestScore: number } | null>(null);
  const [unlocked, setUnlocked] = useState<string[] | null>(null);

  useEffect(() => {
    setup.setTrack(track.id, track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  useEffect(() => {
    api.leaderboard('track', track.id).then((r) => {
      const top = r.entries[0];
      setWorldRecord(top ? { username: top.username, bestLapMs: top.bestLapMs, score: top.score } : null);
    });
    api.raceHistory(50).then((r) => {
      const mine = r.races.filter((x) => x.trackId === track.id);
      setPersonalBest({
        bestLapMs: mine.reduce<number | null>((best, x) => (x.bestLapMs != null && (best == null || x.bestLapMs < best) ? x.bestLapMs : best), null),
        bestScore: mine.reduce((b, x) => Math.max(b, x.score), 0),
      });
    });
    api.cars().then((r) => setUnlocked(r.unlocked ?? CARS.map((c) => c.id)));
  }, [track.id]);

  const level = user?.level ?? 1;
  const isTimeTrial = setup.mode === 'time-trial';
  const path = useMemo(() => minimapPath(track.id), [track.id]);

  const start = () => {
    audio.init();
    audio.uiClick();
    navigate('/race');
  };

  return (
    <div className="py-4">
      <button
        onClick={() => navigate('/tracks')}
        className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white"
      >
        ← All tracks
      </button>
      <SectionTitle sub={`${track.description} · Difficulty ${'◆'.repeat(track.difficulty)}`}>{track.name}</SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* left column: options */}
        <div className="flex flex-col gap-4">
          {/* mode */}
          <GlassPanel>
            <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-slate-400">Race Mode</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(['quick', 'time-trial', 'endless'] as const).map((m) => (
                <ModeButton key={m} mode={m} active={setup.mode === m} onClick={() => setup.set('mode', m)} />
              ))}
            </div>
          </GlassPanel>

          {/* conditions */}
          <GlassPanel>
            <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-slate-400">Conditions</h3>
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Weather</div>
                <div className="flex gap-1.5">
                  {track.weathers.map((w) => (
                    <CondBtn key={w} active={setup.weather === w} onClick={() => setup.set('weather', w as Weather)}>
                      {w === 'clear' ? '☀ Clear' : w === 'rain' ? '🌧 Rain' : w === 'snow' ? '❄ Snow' : w === 'fog' ? '🌫 Fog' : '🌪 Storm'}
                    </CondBtn>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Time of Day</div>
                <div className="flex gap-1.5">
                  {track.timesOfDay.map((t) => (
                    <CondBtn key={t} active={setup.timeOfDay === t} onClick={() => setup.set('timeOfDay', t)}>
                      {t === 'day' ? '🌅 Day' : t === 'sunset' ? '🌇 Sunset' : '🌃 Night'}
                    </CondBtn>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              {!isTimeTrial && (
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Laps</div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <CondBtn key={l} active={setup.laps === l} onClick={() => setup.set('laps', l)}>
                        {l}
                      </CondBtn>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Difficulty</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                    <CondBtn key={d} active={setup.difficulty === d} onClick={() => setup.set('difficulty', d)} accent={d === 'insane' ? '#e879f9' : undefined}>
                      {DIFFICULTIES[d].label}
                    </CondBtn>
                  ))}
                </div>
              </div>
            </div>
            {!isTimeTrial && (
              <p className="mt-3 text-[11px] text-slate-500">
                {DIFFICULTIES[setup.difficulty].aiCount} AI rivals · skill {Math.round(DIFFICULTIES[setup.difficulty].aiSkill * 100)}% · score multiplier ×{DIFFICULTIES[setup.difficulty].scoreMult}
              </p>
            )}
          </GlassPanel>

          {/* car quick select */}
          <GlassPanel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xs font-black uppercase tracking-widest text-slate-400">Your Car</h3>
              <button onClick={() => navigate('/garage')} className="text-[11px] font-bold uppercase tracking-widest text-neon-cyan hover:underline">
                Full garage →
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CARS.map((c) => {
                const ok = unlocked ? unlocked.includes(c.id) : c.unlockLevel <= level;
                return (
                  <button
                    key={c.id}
                    disabled={!ok}
                    onClick={() => {
                      audio.uiClick();
                      setup.set('carId', c.id);
                    }}
                    className={clsx(
                      'shrink-0 rounded-xl border px-3 py-2 text-left transition-all',
                      setup.carId === c.id ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 hover:border-white/25',
                      !ok && 'opacity-40'
                    )}
                  >
                    <div className="text-xs font-bold text-white">{ok ? c.name : `🔒 ${c.name}`}</div>
                    <div className="mt-1 flex gap-1.5 text-[9px] font-bold text-slate-500">
                      <span>{Math.round(carTopSpeedKmh(c))} km/h</span>
                      <span>HAN {c.stats.handling}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        {/* right column: preview + records + start */}
        <div className="flex flex-col gap-4">
          <GlassPanel className="overflow-hidden">
            <TrackPreview path={path} theme={track.theme} />
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Rec label="World Record" value={worldRecord ? `${formatNumber(worldRecord.score)} · ${worldRecord.username}` : 'No record yet'} accent="#fbbf24" />
                <Rec label="Your Best Score" value={personalBest?.bestScore ? formatNumber(personalBest.bestScore) : '—'} />
                <Rec label="World Best Lap" value={worldRecord?.bestLapMs ? formatTime(worldRecord.bestLapMs) : '—'} accent="#fbbf24" />
                <Rec label="Your Best Lap" value={personalBest?.bestLapMs ? formatTime(personalBest.bestLapMs) : '—'} />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel glow>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ready</div>
                <div className="font-display text-base font-black text-white">
                  {track.name} · {isTimeTrial ? 'Time Trial' : setup.mode === 'endless' ? 'Endless' : `${setup.laps} laps`}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {car.name} · <DifficultyBadge difficulty={setup.difficulty} /> · {setup.weather}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Speed</div>
                <div className="font-display text-2xl font-black text-neon-cyan">{Math.round(carTopSpeedKmh(car))}</div>
              </div>
            </div>
            <NeonButton variant="primary" size="lg" className="mt-5 w-full" onClick={start}>
              ▶ Start Race
            </NeonButton>
            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-slate-600">
              {settings.units === 'kmh' ? 'KM/H' : 'MPH'} · {settings.camera} camera · Esc to pause
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

function ModeButton({ mode, active, onClick }: { mode: string; active: boolean; onClick: () => void }) {
  const info: Record<string, { icon: string; label: string; d: string }> = {
    quick: { icon: '🏁', label: 'Quick Race', d: 'Full grid showdown' },
    'time-trial': { icon: '⏱', label: 'Time Trial', d: 'Empty track, pure pace' },
    endless: { icon: '♾', label: 'Endless', d: 'Survive the traffic' },
  };
  const i = info[mode];
  return (
    <button
      onClick={() => {
        audio.uiClick();
        onClick();
      }}
      aria-pressed={active}
      className={clsx(
        'rounded-xl border p-3 text-left transition-all',
        active ? 'border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'border-white/10 hover:border-white/25'
      )}
    >
      <div className="text-xl">{i.icon}</div>
      <div className="mt-1 text-sm font-bold text-white">{i.label}</div>
      <div className="text-[10px] text-slate-500">{i.d}</div>
    </button>
  );
}

function CondBtn({ active, onClick, children, accent }: { active: boolean; onClick: () => void; children: React.ReactNode; accent?: string }) {
  return (
    <button
      onClick={() => {
        audio.uiClick();
        onClick();
      }}
      aria-pressed={active}
      className={clsx(
        'rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
        active ? 'border-cyan-400/60 bg-cyan-400/15 text-neon-cyan' : 'border-white/10 text-slate-400 hover:text-slate-200'
      )}
      style={active && accent ? { color: accent, borderColor: `${accent}66`, background: `${accent}18` } : undefined}
    >
      {children}
    </button>
  );
}

function TrackPreview({ path, theme }: { path: { pts: [number, number][] }; theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width, H = c.height;
    const grad =
      theme === 'city' ? ['#0a0e1e', '#16204a'] :
      theme === 'desert' ? ['#3d1c4f', '#ff9a5a'] :
      theme === 'mountain' ? ['#1c3a5f', '#a8c8e8'] :
      theme === 'arctic' ? ['#5a90c8', '#e8f4ff'] :
      theme === 'tropical' ? ['#2a1a5e', '#ff7e5f'] : ['#03040a', '#2a1a5e'];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, grad[0]);
    g.addColorStop(1, grad[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const pad = 16;
    const size = Math.min(W, H) - pad * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.pts.forEach(([x, y], i) => {
      const px = pad + x * size, py = pad + y * size;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [path, theme]);
  return <canvas ref={ref} width={640} height={280} className="h-40 w-full" aria-hidden />;
}

function Rec({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className={clsx('truncate font-display text-sm font-black', accent ? 'text-amber-300' : 'text-white')} title={value}>
        {value}
      </div>
    </div>
  );
}
