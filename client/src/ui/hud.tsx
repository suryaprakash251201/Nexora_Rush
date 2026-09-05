import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useTelemetry, mapDots } from '@/store/telemetry';
import { mapPathBounds } from '@/world/themes';
import { useSettings } from '@/store/settings';
import { fmtTime, fmtSpeed } from '@/sim/format';

/**
 * Race HUD. Speed/timers/nitro write straight to the DOM at 60 fps;
 * structural data (lap/position/standings) flows through the store at ~12 Hz.
 */
export function Hud({ trackId, onPause }: { trackId: string; onPause: () => void }) {
  const units = useSettings((s) => s.units);
  const showFps = useSettings((s) => s.showFps);
  const lap = useTelemetry((s) => s.lap);
  const laps = useTelemetry((s) => s.laps);
  const position = useTelemetry((s) => s.position);
  const grid = useTelemetry((s) => s.grid);
  const standings = useTelemetry((s) => s.standings);
  const wrecked = useTelemetry((s) => s.wrecked);
  const phase = useTelemetry((s) => s.phase);
  const fps = useTelemetry((s) => s.fps);
  const boosting = useTelemetry((s) => s.boosting);

  const speedEl = useRef<HTMLSpanElement>(null);
  const raceEl = useRef<HTMLDivElement>(null);
  const lapEl = useRef<HTMLSpanElement>(null);
  const nitroEl = useRef<HTMLDivElement>(null);
  const driftEl = useRef<HTMLDivElement>(null);
  const bestEl = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<{ text: string; id: number } | null>(null);
  const seen = useRef({ near: 0, hit: 0, pass: 0, lap: 0 });

  useEffect(() => {
    let raf = 0;
    let lastBest: number | null = null;
    const loop = () => {
      const t = useTelemetry.getState();
      if (speedEl.current) speedEl.current.textContent = fmtSpeed(t.speedKmh, units);
      if (raceEl.current) raceEl.current.textContent = fmtTime(t.raceMs);
      if (lapEl.current) lapEl.current.textContent = fmtTime(t.lapMs);
      if (nitroEl.current) {
        nitroEl.current.style.width = `${Math.round(t.nitro * 100)}%`;
        nitroEl.current.style.boxShadow = t.boosting ? '0 0 18px rgba(56,189,248,0.95)' : '0 0 12px rgba(56,189,248,0.5)';
      }
      if (driftEl.current) {
        const on = t.drift > 200 && t.speedKmh > 40;
        driftEl.current.style.opacity = on ? '1' : '0';
        driftEl.current.style.transform = on ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.96)';
        if (on) driftEl.current.textContent = `DRIFT +${Math.round(t.drift)}`;
      }
      if (t.bestMs !== lastBest && bestEl.current) {
        lastBest = t.bestMs;
        bestEl.current.textContent = fmtTime(t.bestMs);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [units]);

  useEffect(
    () =>
      useTelemetry.subscribe((s) => {
        const v = seen.current;
        if (s.evNear !== v.near) {
          v.near = s.evNear;
          setFlash({ text: 'NEAR MISS', id: s.evNear });
        } else if (s.evPass !== v.pass) {
          v.pass = s.evPass;
          setFlash({ text: `P${s.position}`, id: 1000 + s.evPass });
        } else if (s.evHit !== v.hit) {
          v.hit = s.evHit;
          setFlash({ text: 'IMPACT', id: 2000 + s.evHit });
        } else if (s.evLap !== v.lap) {
          v.lap = s.evLap;
          setFlash({ text: `LAP ${s.lap}`, id: 3000 + s.evLap });
        }
      }),
    []
  );

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(id);
  }, [flash]);

  const posColor = position === 1 ? 'text-amber-300' : position === 2 ? 'text-slate-100' : position === 3 ? 'text-orange-300' : 'text-slate-200';

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* top gradient scrim for legibility */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" aria-hidden />

      {/* top-left: lap + position */}
      <div className="absolute left-3 top-3 flex flex-col gap-2 sm:left-5 sm:top-5">
        <div className="rounded-2xl border border-white/10 bg-black/45 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Lap</span>
            <span className="font-display text-lg font-black tabular-nums tracking-wider text-white sm:text-xl">
              {laps === 0 ? '∞' : `${lap}`}
              {laps !== 0 && <span className="text-slate-500">/{laps}</span>}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Pos</span>
            <span className={clsx('font-display text-sm font-black tabular-nums tracking-wider', posColor)}>
              P{position}
              <span className="font-bold text-slate-500">/{grid}</span>
            </span>
            {phase === 'racing' && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                <span className="nr-pulse h-1 w-1 rounded-full bg-emerald-300" />
                Live
              </span>
            )}
          </div>
          {laps > 0 && (
            <div className="mt-2 flex gap-1" aria-hidden>
              {Array.from({ length: Math.min(laps, 6) }).map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    'h-1 flex-1 rounded-full',
                    i < Math.min(lap, laps) ? 'bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.7)]' : 'bg-white/12'
                  )}
                />
              ))}
            </div>
          )}
        </div>
        <div className="hidden w-44 flex-col gap-0.5 rounded-2xl border border-white/10 bg-black/45 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:flex">
          <div className="px-1.5 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Standings</div>
          {standings.slice(0, 6).map((r) => (
            <div
              key={r.id}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[10px]',
                r.me ? 'border border-cyan-300/30 bg-cyan-300/12' : 'border border-transparent'
              )}
            >
              <span className="w-3 font-display text-[10px] font-bold tabular-nums text-slate-500">{r.position}</span>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
              <span className={clsx('truncate font-semibold', r.me ? 'text-cyan-200' : 'text-slate-300')}>{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* top-center: race + lap time */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 sm:top-5">
        <div className="rounded-2xl border border-white/10 bg-black/45 px-5 py-2 text-center shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-6">
          <div ref={raceEl} className="font-display text-xl font-black tabular-nums tracking-wider text-white sm:text-2xl">
            00:00.000
          </div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Lap <span ref={lapEl} className="tabular-nums text-cyan-300">00:00.000</span>
          </div>
        </div>
      </div>

      {/* top-right: best + pause */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="rounded-2xl border border-white/10 bg-black/45 px-4 py-2 text-right shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Best Lap</div>
          <div ref={bestEl} className="font-display text-base font-black tabular-nums tracking-wider text-violet-300 sm:text-lg">
            --:--.---
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showFps && (
            <div className="rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-300 backdrop-blur-xl">
              {fps} FPS
            </div>
          )}
          <button
            onClick={onPause}
            aria-label="Open pause menu (Esc)"
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-black/50 text-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all hover:border-white/30 hover:text-white active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <rect x="6" y="4" width="4" height="16" rx="1.2" />
              <rect x="14" y="4" width="4" height="16" rx="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* bottom-left: nitro */}
      <div className="absolute bottom-4 left-3 w-40 sm:left-5 sm:w-52 [@media(pointer:coarse)]:bottom-36 [@media(pointer:coarse)]:sm:bottom-36">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200 drop-shadow">Nitro</span>
          <span className="rounded border border-white/15 bg-black/45 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300 backdrop-blur-xl [@media(pointer:coarse)]:hidden">
            Shift
          </span>
        </div>
        <div className="h-3.5 overflow-hidden rounded-full border border-white/10 bg-black/50 p-[3px] shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div ref={nitroEl} className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-cyan-300 transition-[width] duration-150" style={{ width: '100%' }} />
        </div>
        <div
          ref={driftEl}
          className="mt-2 w-fit rounded-full border border-amber-300/40 bg-black/55 px-3 py-1 font-display text-xs font-black tracking-[0.14em] text-amber-300 opacity-0 backdrop-blur-xl transition-all duration-150"
        />
      </div>

      {/* bottom-right: boost pill + speed + map */}
      <div className="absolute bottom-4 right-3 flex flex-col items-end sm:right-5 [@media(pointer:coarse)]:bottom-36 [@media(pointer:coarse)]:sm:bottom-36">
        <AnimatePresence>
          {boosting && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              className="mb-2 rounded-full border border-cyan-300/50 bg-cyan-300/15 px-3 py-1 font-display text-[11px] font-black tracking-[0.2em] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.45)] backdrop-blur-xl"
            >
              BOOST
            </motion.div>
          )}
        </AnimatePresence>
        <div className="rounded-2xl border border-white/10 bg-black/45 px-5 py-3 text-right shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-baseline justify-end gap-1.5">
            <span ref={speedEl} className="font-display text-4xl font-black tabular-nums leading-none text-white drop-shadow sm:text-5xl">
              0
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{units === 'kmh' ? 'km/h' : 'mph'}</span>
          </div>
        </div>
        <MapView trackId={trackId} />
      </div>

      {/* flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.22 }}
            className="absolute left-1/2 top-[24%] -translate-x-1/2 rounded-full border border-white/15 bg-black/60 px-6 py-2.5 font-display text-xl font-black uppercase tracking-[0.16em] text-cyan-200 shadow-[0_0_40px_rgba(34,211,238,0.35)] backdrop-blur-xl sm:text-2xl"
          >
            {flash.text}
          </motion.div>
        )}
      </AnimatePresence>

      {wrecked && phase === 'finished' && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 rounded-2xl border border-rose-400/40 bg-black/60 px-8 py-3 font-display text-4xl font-black uppercase tracking-[0.14em] text-rose-400 backdrop-blur-xl" style={{ textShadow: '0 0 30px rgba(251,59,83,0.8)' }}>
          Wrecked
        </div>
      )}

      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.5)' }} />
      <Countdown />
    </div>
  );
}

function MapView({ trackId }: { trackId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef({ pts: [] as [number, number][], minX: 0, minZ: 0, span: 1 });
  useEffect(() => {
    data.current = mapPathBounds(trackId);
  }, [trackId]);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = ref.current;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          const W = c.width;
          const H = c.height;
          ctx.clearRect(0, 0, W, H);
          const pad = 10;
          const size = Math.min(W, H) - pad * 2;
          const { pts, minX, minZ, span } = data.current;
          const nx = (x: number) => pad + ((x - minX) / span) * size;
          const nz = (z: number) => pad + ((z - minZ) / span) * size;
          ctx.strokeStyle = 'rgba(148,163,184,0.6)';
          ctx.lineWidth = 3.5;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          pts.forEach(([x, y], i) => {
            const px = pad + x * size;
            const py = pad + y * size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.stroke();
          for (const d of mapDots) {
            if (d.me) {
              ctx.save();
              ctx.shadowColor = '#22d3ee';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#22d3ee';
              ctx.beginPath();
              ctx.arc(nx(d.x), nz(d.z), 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            } else {
              ctx.fillStyle = 'rgba(251,59,83,0.9)';
              ctx.beginPath();
              ctx.arc(nx(d.x), nz(d.z), 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="mt-2 rounded-2xl border border-white/10 bg-black/45 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <canvas ref={ref} width={120} height={120} className="h-[92px] w-[92px] sm:h-[112px] sm:w-[112px]" aria-hidden />
    </div>
  );
}

function Countdown() {
  const phase = useTelemetry((s) => s.phase);
  const count = useTelemetry((s) => s.count);
  const reduced = useSettings((s) => s.reducedMotion);
  if (phase !== 'countdown' || count > 3) return null;
  const label = count === 0 ? 'GO!' : String(count);
  const color = count === 0 ? '#34d399' : '#22d3ee';
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
      <div className="flex flex-col items-center">
        <motion.div
          key={label}
          initial={reduced ? { opacity: 0.9 } : { opacity: 0, scale: 2.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          className="flex h-40 w-40 items-center justify-center rounded-full border-2 bg-black/55 font-display text-7xl font-black leading-none backdrop-blur-xl sm:h-52 sm:w-52 sm:text-8xl"
          style={{ color, borderColor: `${color}66`, textShadow: `0 0 60px ${color}`, boxShadow: `0 0 80px ${color}44, inset 0 0 40px ${color}11` }}
          aria-live="assertive"
        >
          {label}
        </motion.div>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          {[3, 2, 1, 0].map((n) => (
            <span
              key={n}
              className="h-1.5 w-6 rounded-full"
              style={{ background: n >= count ? color : 'rgba(255,255,255,0.15)', boxShadow: n >= count ? `0 0 10px ${color}` : 'none' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
