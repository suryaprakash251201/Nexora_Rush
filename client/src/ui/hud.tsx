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

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* top-left */}
      <div className="absolute left-3 top-3 flex flex-col gap-2 sm:left-5 sm:top-5">
        <div className="panel-solid px-4 py-2">
          <div className="font-display text-lg font-black tracking-wider text-white sm:text-xl">
            LAP <span className="text-cyan-300">{laps === 0 ? '∞' : `${lap}/${laps}`}</span>
          </div>
          <div className="font-display text-sm font-bold tracking-wider text-slate-300">
            POS <span className="text-amber-300">{position}</span>/{grid}
          </div>
        </div>
        <div className="panel-solid hidden w-40 flex-col gap-0.5 px-2 py-1.5 sm:flex">
          {standings.slice(0, 6).map((r) => (
            <div key={r.id} className={clsx('flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px]', r.me && 'bg-cyan-300/15')}>
              <span className="w-3 font-display font-bold text-slate-500">{r.position}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
              <span className={clsx('truncate font-semibold', r.me ? 'text-cyan-300' : 'text-slate-300')}>{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* top-center */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 sm:top-5">
        <div className="panel-solid px-5 py-2 text-center">
          <div ref={raceEl} className="font-display text-xl font-black tabular-nums tracking-wider text-white sm:text-2xl">
            00:00.000
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Lap <span ref={lapEl} className="tabular-nums text-cyan-300">00:00.000</span>
          </div>
        </div>
      </div>

      {/* top-right */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="panel-solid px-4 py-2 text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Best Lap</div>
          <div ref={bestEl} className="font-display text-lg font-black tabular-nums tracking-wider text-violet-300">
            --:--.---
          </div>
        </div>
        <button onClick={onPause} aria-label="Open pause menu" className="panel-solid pointer-events-auto rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:text-white">
          ⏸ Esc
        </button>
        {showFps && <div className="panel rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300">{fps} FPS</div>}
      </div>

      {/* bottom-left: nitro */}
      <div className="absolute bottom-4 left-3 w-40 sm:left-5 sm:w-52">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Nitro</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Shift</span>
        </div>
        <div className="panel-solid h-4 overflow-hidden rounded-lg p-[3px]">
          <div ref={nitroEl} className="h-full rounded-md bg-gradient-to-r from-sky-500 to-cyan-300" style={{ width: '100%' }} />
        </div>
        <div ref={driftEl} className="mt-2 font-display text-sm font-black tracking-[0.14em] text-amber-300 opacity-0 transition-opacity" />
      </div>

      {/* bottom-right: speed + map */}
      <div className="absolute bottom-4 right-3 text-right sm:right-5">
        <div className="panel-solid px-5 py-3">
          <div className="flex items-baseline justify-end gap-1.5">
            <span ref={speedEl} className="font-display text-4xl font-black tabular-nums leading-none text-white sm:text-5xl">
              0
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{units === 'kmh' ? 'km/h' : 'mph'}</span>
          </div>
        </div>
        <MapView trackId={trackId} />
      </div>

      {/* flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.22 }}
            className="absolute left-1/2 top-[26%] -translate-x-1/2 font-display text-2xl font-black uppercase tracking-[0.14em] text-cyan-300 sm:text-3xl"
            style={{ textShadow: '0 0 24px rgba(34,211,238,0.8)' }}
          >
            {flash.text}
          </motion.div>
        )}
      </AnimatePresence>

      {wrecked && phase === 'finished' && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-4xl font-black uppercase tracking-[0.14em] text-rose-500" style={{ textShadow: '0 0 30px rgba(251,59,83,0.8)' }}>
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
          const pad = 8;
          const size = Math.min(W, H) - pad * 2;
          const { pts, minX, minZ, span } = data.current;
          const nx = (x: number) => pad + ((x - minX) / span) * size;
          const nz = (z: number) => pad + ((z - minZ) / span) * size;
          ctx.strokeStyle = 'rgba(148,163,184,0.55)';
          ctx.lineWidth = 3;
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
            ctx.fillStyle = d.me ? '#22d3ee' : 'rgba(251,59,83,0.9)';
            ctx.beginPath();
            ctx.arc(nx(d.x), nz(d.z), d.me ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="panel-solid mt-2 rounded-xl p-1.5">
      <canvas ref={ref} width={120} height={120} className="h-[104px] w-[104px] sm:h-[124px] sm:w-[124px]" aria-hidden />
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
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        key={label}
        initial={reduced ? { opacity: 0.9 } : { opacity: 0, scale: 2.2 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="font-display text-[8rem] font-black leading-none sm:text-[11rem]"
        style={{ color, textShadow: `0 0 60px ${color}` }}
        aria-live="assertive"
      >
        {label}
      </motion.div>
    </div>
  );
}
