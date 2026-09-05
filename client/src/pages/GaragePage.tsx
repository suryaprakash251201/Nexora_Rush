import { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CARS, getCar, carTopSpeedKmh, carAccelSeconds, carGripFactor, carBrakeForce, carNitroCapacity, type CarDef } from 'shared';
import { api } from '@/services/api';
import { useAuth } from '@/store/auth';
import { useRaceSetup } from '@/store/settings';
import { GlassPanel, NeonButton, SectionTitle, StatBar } from '@/ui/shared';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { audio } from '@/game/engine/audio';
import { clsx } from 'clsx';

const GarageScene = lazy(() => import('@/game/scenes/GarageScene').then((m) => ({ default: m.GarageScene })));

export function GaragePage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setup = useRaceSetup();
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [paint, setPaint] = useState(0);
  const [inspect, setInspect] = useState(false);

  useEffect(() => {
    api.cars().then((r) => setUnlocked(r.unlocked ?? CARS.map((c) => c.id))).catch(() => setUnlocked(CARS.map((c) => c.id)));
  }, []);

  const level = user?.level ?? 1;
  const car = getCar(setup.carId) ?? CARS[0];
  const isUnlocked = (c: CarDef) => (unlocked ? unlocked.includes(c.id) : c.unlockLevel <= level);
  const color = car.colors[paint % car.colors.length];

  const selectCar = (c: CarDef) => {
    if (!isUnlocked(c)) {
      audio.uiClick();
      return;
    }
    audio.uiClick();
    setup.set('carId', c.id);
    setPaint(0);
  };

  return (
    <div className="py-4">
      <SectionTitle sub="Inspect, paint, and select your machine. Stats drive real physics.">Garage</SectionTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* 3D viewer */}
        <GlassPanel className="relative min-h-[420px] overflow-hidden p-0 lg:min-h-[560px]">
          <Suspense fallback={<LoadingScreen label="LOADING VEHICLE" />}>
            <GarageScene car={car} color={color} accent={car.colors[(paint + 1) % car.colors.length]} />
          </Suspense>
          {/* overlay controls */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
            <div className="pointer-events-auto flex gap-2">
              {car.colors.map((c, i) => (
                <button
                  key={c}
                  aria-label={`Paint color ${i + 1}`}
                  onClick={() => {
                    audio.uiClick();
                    setPaint(i);
                  }}
                  className={clsx('h-8 w-8 rounded-full border-2 transition-transform', paint === i ? 'scale-110 border-white' : 'border-white/30 hover:scale-105')}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="pointer-events-auto glass rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Drag to rotate · scroll to zoom
            </div>
          </div>
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="font-display text-2xl font-black uppercase tracking-wide text-white" style={{ textShadow: '0 0 24px rgba(34,211,238,0.4)' }}>
              {car.name}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{car.class} class</div>
          </div>
        </GlassPanel>

        {/* stats + actions */}
        <div className="flex flex-col gap-4">
          <GlassPanel>
            <p className="text-sm leading-relaxed text-slate-300">{car.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <StatBar label="Speed" value={car.stats.speed} color="#22d3ee" />
              <StatBar label="Acceleration" value={car.stats.acceleration} color="#a78bfa" />
              <StatBar label="Handling" value={car.stats.handling} color="#34d399" />
              <StatBar label="Braking" value={car.stats.braking} color="#fbbf24" />
              <StatBar label="Nitro" value={car.stats.nitro} color="#fb3b53" />
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Top Speed</div>
                <div className="font-display text-lg font-black text-white">{Math.round(carTopSpeedKmh(car))} km/h</div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
              0–100 in {carAccelSeconds(car).toFixed(1)}s · grip {carGripFactor(car).toFixed(2)} · brake {carBrakeForce(car).toFixed(2)}g · nitro tank {carNitroCapacity(car).toFixed(1)}s
            </div>
          </GlassPanel>

          <div className="flex gap-3">
            <NeonButton
              variant="primary"
              className="flex-1"
              onClick={() => {
                navigate(`/setup/${setup.trackId}`);
              }}
            >
              Race This Car
            </NeonButton>
            <NeonButton className={clsx(inspect && 'border-cyan-400/50 text-neon-cyan')} onClick={() => setInspect((v) => !v)}>
              {inspect ? 'Hide' : 'Specs'}
            </NeonButton>
          </div>

          {inspect && (
            <GlassPanel>
              <h3 className="mb-2 font-display text-xs font-black uppercase tracking-widest text-slate-400">Full Spec Sheet</h3>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                {Object.entries(car.stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between pr-3">
                    <dt className="capitalize text-slate-400">{k}</dt>
                    <dd className="font-display font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* car cards */}
      <h2 className="mb-4 mt-10 font-display text-lg font-black uppercase tracking-wider text-white">All Cars</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARS.map((c, i) => {
          const unlocked = isUnlocked(c);
          const selected = c.id === car.id;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => selectCar(c)}
              aria-pressed={selected}
              className={clsx(
                'glass group relative overflow-hidden p-4 text-left transition-all',
                selected && 'border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.15)]',
                !unlocked && 'opacity-60',
                unlocked && 'hover:-translate-y-0.5 hover:border-white/25'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-black uppercase tracking-wide text-white">{c.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{c.class}</span>
                </div>
                {!unlocked ? (
                  <span className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    🔒 Lv.{c.unlockLevel}
                  </span>
                ) : selected ? (
                  <span className="rounded-md border border-cyan-400/50 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-neon-cyan">
                    Selected
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                <MiniStat label="SPD" v={c.stats.speed} />
                <MiniStat label="ACC" v={c.stats.acceleration} />
                <MiniStat label="HAN" v={c.stats.handling} />
                <MiniStat label="NIT" v={c.stats.nitro} />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-[10px] font-bold tracking-widest text-slate-500">{label}</span>
      <div className="stat-track flex-1">
        <div className="stat-fill bg-gradient-to-r from-slate-500/40 to-slate-300" style={{ width: `${v}%` }} />
      </div>
      <span className="w-6 text-right font-display text-[10px] font-bold text-slate-300">{v}</span>
    </div>
  );
}
