import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelemetry, minimapDots } from '@/store/telemetry';
import { minimapPath } from '@/game/tracks/trackDefs';
import { useSettings } from '@/store/settings';
import { formatTime, formatSpeed } from '@/game/engine/format';
import { clsx } from 'clsx';
import { audio } from '@/game/engine/audio';

/**
 * Race HUD — high-frequency values (speed, timer, nitro) update via direct
 * DOM refs driven by a rAF loop reading the telemetry store; structural
 * values (lap, position, standings) use throttled React state.
 */
export function HUD({ onQuit, trackId }: { onQuit: () => void; trackId: string }) {
  const units = useSettings((s) => s.units);
  const showFps = useSettings((s) => s.showFps);
  const lap = useTelemetry((s) => s.lap);
  const laps = useTelemetry((s) => s.laps);
  const position = useTelemetry((s) => s.position);
  const gridSize = useTelemetry((s) => s.gridSize);
  const bestLapMs = useTelemetry((s) => s.bestLapMs);
  const wrecked = useTelemetry((s) => s.wrecked);
  const phase = useTelemetry((s) => s.phase);
  const fps = useTelemetry((s) => s.fps);

  const speedRef = useRef<HTMLSpanElement>(null);
  const raceTimeRef = useRef<HTMLDivElement>(null);
  const lapTimeRef = useRef<HTMLSpanElement>(null);
  const nitroFillRef = useRef<HTMLDivElement>(null);
  const nitroBarRef = useRef<HTMLDivElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const lastLapRef = useRef<HTMLDivElement>(null);

  const [flash, setFlash] = useState<{ kind: string; id: number } | null>(null);
  const ticks = useRef({ nearMiss: 0, collision: 0, overtake: 0, lap: 0 });

  // rAF loop for high-frequency DOM updates (no React re-renders)
  useEffect(() => {
    let raf = 0;
    let lastBest: number | null = null;
    const loop = () => {
      const t = useTelemetry.getState();
      if (speedRef.current) speedRef.current.textContent = formatSpeed(t.speedKmh, units);
      if (raceTimeRef.current) raceTimeRef.current.textContent = formatTime(t.raceTimeMs);
      if (lapTimeRef.current) lapTimeRef.current.textContent = formatTime(t.currentLapMs);
      if (nitroFillRef.current && nitroBarRef.current) {
        nitroFillRef.current.style.width = `${Math.round(t.nitro * 100)}%`;
        nitroBarRef.current.style.opacity = t.boosting ? '1' : '0.75';
      }
      if (driftRef.current) {
        driftRef.current.style.opacity = t.driftPoints > 200 && t.speedKmh > 40 ? '1' : '0';
        driftRef.current.textContent = `DRIFT +${Math.round(t.driftPoints)}`;
      }
      if (t.bestLapMs !== lastBest && lastLapRef.current) {
        lastBest = t.bestLapMs;
        lastLapRef.current.textContent = formatTime(t.bestLapMs);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [units]);

  // Event flashes
  useEffect(() => {
    return useTelemetry.subscribe((s) => {
      const t = ticks.current;
      if (s.nearMissTick !== t.nearMiss) {
        t.nearMiss = s.nearMissTick;
        setFlash({ kind: 'NEAR MISS', id: s.nearMissTick });
      } else if (s.overtakeTick !== t.overtake) {
        t.overtake = s.overtakeTick;
        setFlash({ kind: `P${s.position}`, id: s.overtakeTick });
      } else if (s.collisionTick !== t.collision) {
        t.collision = s.collisionTick;
        setFlash({ kind: 'IMPACT', id: s.collisionTick });
      } else if (s.lapTick !== t.lap) {
        t.lap = s.lapTick;
        setFlash({ kind: `LAP ${s.lap}`, id: s.lapTick });
      }
    });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(id);
  }, [flash]);

  const standings = useTelemetry((s) => s.standings);

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-body">
      {/* top-left: lap + position */}
      <div className="absolute left-3 top-3 flex flex-col gap-2 sm:left-5 sm:top-5">
        <div className="glass-strong px-4 py-2">
          <div className="font-display text-lg font-black tracking-wider text-white sm:text-xl">
            LAP <span className="text-neon-cyan">{laps === 0 ? '∞' : `${lap}/${laps}`}</span>
          </div>
          <div className="font-display text-sm font-bold tracking-wider text-slate-300">
            POS <span className="text-neon-amber">{position}</span>/{gridSize}
          </div>
        </div>
        {/* mini standings */}
        <div className="glass-strong hidden w-40 gap-0.5 overflow-hidden rounded-xl px-2 py-1.5 text-[10px] sm:flex sm:flex-col">
          {standings.slice(0, 6).map((r) => (
            <div key={r.id} className={clsx('flex items-center gap-1.5 rounded px-1 py-0.5', r.isPlayer && 'bg-cyan-400/15')}>
              <span className="w-3 font-display font-bold text-slate-500">{r.position}</span>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
              <span className={clsx('truncate font-semibold', r.isPlayer ? 'text-neon-cyan' : 'text-slate-300')}>{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* top-center: timers */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2 sm:top-5">
        <div className="glass-strong px-5 py-2 text-center">
          <div ref={raceTimeRef} className="font-display text-xl font-black tabular-nums tracking-wider text-white sm:text-2xl">
            00:00.000
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Lap <span ref={lapTimeRef} className="tabular-nums text-neon-cyan">00:00.000</span>
          </div>
        </div>
      </div>

      {/* top-right: best lap + fps + quit */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
        <div className="glass-strong px-4 py-2 text-right">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Best Lap</div>
          <div ref={lastLapRef} className="font-display text-lg font-black tabular-nums tracking-wider text-neon-violet">
            --:--.---
          </div>
        </div>
        <button onClick={onQuit} className="pointer-events-auto glass-strong rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-300 transition-colors hover:text-white" aria-label="Pause menu">
          ⏸ Esc
        </button>
        {showFps && <div className="glass rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300">{fps} FPS</div>}
      </div>

      {/* bottom-left: nitro */}
      <div className="absolute bottom-4 left-3 w-40 sm:left-5 sm:w-52">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Nitro</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shift</span>
        </div>
        <div ref={nitroBarRef} className="glass-strong h-4 overflow-hidden rounded-lg p-[3px]">
          <div ref={nitroFillRef} className="h-full rounded-md bg-gradient-to-r from-sky-500 to-cyan-300 shadow-[0_0_14px_rgba(56,189,248,0.8)] transition-[width] duration-150" style={{ width: '100%' }} />
        </div>
        <div ref={driftRef} className="mt-2 font-display text-sm font-black tracking-widest text-neon-amber opacity-0 transition-opacity" />
      </div>

      {/* bottom-right: speed */}
      <div className="absolute bottom-4 right-3 text-right sm:right-5">
        <div className="glass-strong px-5 py-3">
          <div className="flex items-baseline justify-end gap-1.5">
            <span ref={speedRef} className="font-display text-4xl font-black tabular-nums leading-none text-white sm:text-5xl">
              0
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{units === 'kmh' ? 'km/h' : 'mph'}</span>
          </div>
        </div>
        <MiniMap trackId={trackId} />
      </div>

      {/* event flash */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0, scale: 0.7, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.25 }}
            className="absolute left-1/2 top-[26%] -translate-x-1/2 font-display text-2xl font-black uppercase tracking-widest text-neon-cyan sm:text-3xl"
            style={{ textShadow: '0 0 24px rgba(34,211,238,0.8)' }}
          >
            {flash.kind}
          </motion.div>
        )}
      </AnimatePresence>

      {/* wreck banner */}
      {wrecked && phase === 'finished' && (
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 font-display text-4xl font-black uppercase tracking-widest text-rose-500" style={{ textShadow: '0 0 30px rgba(251,59,83,0.8)' }}>
          WRECKED
        </div>
      )}

      {/* vignette for speed feel */}
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.55)' }} />
      <Countdown />
    </div>
  );
}

function MiniMap({ trackId }: { trackId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const path = useRef<{ pts: [number, number][] } | null>(null);

  useEffect(() => {
    path.current = minimapPath(trackId);
  }, [trackId]);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const p = path.current;
      if (!canvas || !p) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const pad = 8;
      const size = Math.min(W, H) - pad * 2;
      // path
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      p.pts.forEach(([x, y], i) => {
        const px = pad + x * size, py = pad + y * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      // dots
      for (const d of minimapDots) {
        ctx.fillStyle = d.isPlayer ? '#22d3ee' : 'rgba(251,59,83,0.9)';
        ctx.beginPath();
        ctx.arc(pad + d.x * size, pad + d.y * size, d.isPlayer ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="glass-strong mt-2 rounded-xl p-1.5">
      <canvas ref={canvasRef} width={120} height={120} className="h-[104px] w-[104px] sm:h-[124px] sm:w-[124px]" aria-hidden />
    </div>
  );
}

function Countdown() {
  const phase = useTelemetry((s) => s.phase);
  const countdown = useTelemetry((s) => s.countdown);
  const reduced = useSettings((s) => s.reducedMotion);
  if (phase !== 'countdown' || countdown > 3) return null;
  const label = countdown === 0 ? 'GO!' : String(countdown);
  const color = countdown === 0 ? '#34d399' : '#22d3ee';
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        key={label}
        initial={reduced ? { opacity: 0.9 } : { opacity: 0, scale: 2.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="font-display text-[9rem] font-black leading-none sm:text-[12rem]"
        style={{ color, textShadow: `0 0 60px ${color}` }}
        aria-live="assertive"
      >
        {label}
      </motion.div>
    </div>
  );
}

