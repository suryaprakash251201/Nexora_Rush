import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { CARS, DIFFICULTIES, carTopSpeedKmh, getCar, getTrack, type Difficulty, type Weather } from 'shared';
import { api } from '@/api';
import { useAuth } from '@/store/auth';
import { useSettings, useSetup } from '@/store/settings';
import { Btn, DiffTag, Panel, Title } from '@/ui/kit';
import { fmtNum, fmtTime } from '@/sim/format';
import { mapPath } from '@/world/themes';
import { sound } from '@/sim/audio';

export function Setup() {
  const { trackId } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setup = useSetup();
  const settings = useSettings();
  const track = getTrack(trackId ?? '') ?? getTrack('city-rush')!;
  const car = getCar(setup.carId) ?? CARS[0];

  const [wr, setWr] = useState<{ username: string; bestMs: number | null; score: number } | null>(null);
  const [pb, setPb] = useState<{ lap: number | null; score: number }>({ lap: null, score: 0 });
  const [open, setOpen] = useState<string[] | null>(null);

  useEffect(() => {
    setup.pickTrack(track.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id]);

  useEffect(() => {
    api.leaderboard('track', track.id).then((r) => {
      const t = r.entries[0];
      setWr(t ? { username: t.username, bestMs: t.bestLapMs, score: t.score } : null);
    }).catch(() => undefined);
    api.raceHistory(50).then((r) => {
      const mine = r.races.filter((x) => x.trackId === track.id);
      setPb({
        lap: mine.reduce<number | null>((b, x) => (x.bestLapMs != null && (b == null || x.bestLapMs < b) ? x.bestLapMs : b), null),
        score: mine.reduce((b, x) => Math.max(b, x.score), 0),
      });
    }).catch(() => undefined);
    api.cars().then((r) => setOpen(r.unlocked ?? CARS.map((c) => c.id))).catch(() => undefined);
  }, [track.id]);

  const timeTrial = setup.mode === 'time-trial';
  const path = mapPath(track.id);

  return (
    <div className="py-4">
      <button onClick={() => navigate('/tracks')} className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white">
        ← All tracks
      </button>
      <Title sub={`${track.description} · ${'◆'.repeat(track.difficulty)}`}>{track.name}</Title>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Panel>
            <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-slate-400">Race Mode</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['quick', '🏁', 'Quick Race', 'Full grid'],
                ['time-trial', '⏱', 'Time Trial', 'Empty track'],
                ['endless', '♾', 'Endless', 'Survive'],
              ].map(([m, icon, label, d]) => (
                <button
                  key={m}
                  aria-pressed={setup.mode === m}
                  onClick={() => {
                    sound.click();
                    setup.set('mode', m as any);
                  }}
                  className={clsx(
                    'rounded-xl border p-3 text-left transition-all',
                    setup.mode === m ? 'border-cyan-300/60 bg-cyan-300/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]' : 'border-white/10 hover:border-white/25'
                  )}
                >
                  <div className="text-xl">{icon}</div>
                  <div className="mt-1 text-sm font-bold text-white">{label}</div>
                  <div className="text-[10px] text-slate-500">{d}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <h3 className="mb-3 font-display text-xs font-black uppercase tracking-widest text-slate-400">Conditions</h3>
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Weather</div>
                <div className="flex flex-wrap gap-1.5">
                  {track.weathers.map((w) => (
                    <Chip key={w} on={setup.weather === w} fn={() => setup.set('weather', w as Weather)}>
                      {w === 'clear' ? '☀ Clear' : w === 'rain' ? '🌧 Rain' : w === 'snow' ? '❄ Snow' : w === 'fog' ? '🌫 Fog' : '🌪 Storm'}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Time</div>
                <div className="flex gap-1.5">
                  {track.timesOfDay.map((t) => (
                    <Chip key={t} on={setup.timeOfDay === t} fn={() => setup.set('timeOfDay', t)}>
                      {t === 'day' ? '🌅 Day' : t === 'sunset' ? '🌇 Sunset' : '🌃 Night'}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-6">
              {!timeTrial && setup.mode !== 'endless' && (
                <div>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Laps</div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <Chip key={l} on={setup.laps === l} fn={() => setup.set('laps', l)}>{l}</Chip>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Difficulty</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                    <Chip key={d} on={setup.difficulty === d} fn={() => setup.set('difficulty', d)}>
                      {DIFFICULTIES[d].label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            {!timeTrial && (
              <p className="mt-3 text-[11px] text-slate-500">
                {DIFFICULTIES[setup.difficulty].aiCount} rivals · score ×{DIFFICULTIES[setup.difficulty].scoreMult}
              </p>
            )}
          </Panel>

          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xs font-black uppercase tracking-widest text-slate-400">Your Car</h3>
              <button onClick={() => navigate('/garage')} className="text-[11px] font-bold uppercase tracking-widest text-cyan-300 hover:underline">
                Full garage →
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CARS.map((c) => {
                const ok = open ? open.includes(c.id) : c.unlockLevel <= (user?.level ?? 1);
                return (
                  <button
                    key={c.id}
                    disabled={!ok}
                    onClick={() => {
                      sound.click();
                      setup.set('carId', c.id);
                    }}
                    className={clsx(
                      'shrink-0 rounded-xl border px-3 py-2 text-left transition-all',
                      setup.carId === c.id ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-white/10 hover:border-white/25',
                      !ok && 'opacity-40'
                    )}
                  >
                    <div className="text-xs font-bold text-white">{ok ? c.name : `🔒 ${c.name}`}</div>
                    <div className="mt-1 text-[9px] font-bold text-slate-500">{Math.round(carTopSpeedKmh(c))} km/h · HAN {c.stats.handling}</div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel className="overflow-hidden !p-0">
            <Preview path={path} theme={track.theme} />
            <div className="grid grid-cols-2 gap-2 p-4 text-xs">
              <Rec label="World Record" value={wr ? `${fmtNum(wr.score)} · ${wr.username}` : 'No record yet'} hot />
              <Rec label="Your Best" value={pb.score ? fmtNum(pb.score) : '—'} />
              <Rec label="World Best Lap" value={wr?.bestMs ? fmtTime(wr.bestMs) : '—'} hot />
              <Rec label="Your Best Lap" value={pb.lap ? fmtTime(pb.lap) : '—'} />
            </div>
          </Panel>
          <Panel glow>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ready</div>
                <div className="font-display text-base font-black text-white">
                  {track.name} · {timeTrial ? 'Time Trial' : setup.mode === 'endless' ? 'Endless' : `${setup.laps} laps`}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  {car.name} · <DiffTag d={setup.difficulty} /> · {setup.weather}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top</div>
                <div className="font-display text-2xl font-black text-cyan-300">{Math.round(carTopSpeedKmh(car))}</div>
              </div>
            </div>
            <Btn kind="primary" className="mt-5 w-full px-8 py-4 text-base" onClick={() => navigate('/race')}>
              ▶ Start Race
            </Btn>
            <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-slate-600">
              {settings.units === 'kmh' ? 'KM/H' : 'MPH'} · {settings.camera} cam · Esc pauses
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Chip({ on, fn, children }: { on: boolean; fn: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={() => {
        sound.click();
        fn();
      }}
      className={clsx(
        'rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
        on ? 'border-cyan-300/60 bg-cyan-300/15 text-cyan-300' : 'border-white/10 text-slate-400 hover:text-slate-200'
      )}
    >
      {children}
    </button>
  );
}

function Preview({ path, theme }: { path: [number, number][]; theme: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    const g = ctx.createLinearGradient(0, 0, W, H);
    const stops: Record<string, [string, string]> = {
      city: ['#0a0e1e', '#16204a'],
      desert: ['#3d1c4f', '#ff9a5a'],
      mountain: ['#1c3a5f', '#a8c8e8'],
      arctic: ['#5a90c8', '#e8f4ff'],
      tropical: ['#2a1a5e', '#ff7e5f'],
      cyber: ['#03040a', '#2a1a5e'],
    };
    const [a, b] = stops[theme] ?? stops.city;
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const pad = 16;
    const size = Math.min(W, H) - pad * 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach(([x, y], i) => {
      const px = pad + x * size;
      const py = pad + y * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [path, theme]);
  return <canvas ref={ref} width={640} height={280} className="h-40 w-full" aria-hidden />;
}

function Rec({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className={clsx('truncate font-display text-sm font-black', hot ? 'text-amber-200' : 'text-white')} title={value}>
        {value}
      </div>
    </div>
  );
}
