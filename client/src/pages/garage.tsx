import { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CARS, carTopSpeedKmh, getCar, type CarDef } from 'shared';
import { api } from '@/api';
import { useAuth } from '@/store/auth';
import { useSetup } from '@/store/settings';
import { Btn, Panel, StatBar, Title } from '@/ui/kit';
import { Loading } from '@/ui/loading';
import { sound } from '@/sim/audio';

const GarageView = lazy(() => import('@/scenes/garage').then((m) => ({ default: m.GarageView })));

export function Garage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setup = useSetup();
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [paint, setPaint] = useState(0);
  const [specs, setSpecs] = useState(false);

  useEffect(() => {
    api.cars()
      .then((r) => setUnlocked(r.unlocked ?? CARS.map((c) => c.id)))
      .catch(() => setUnlocked(CARS.map((c) => c.id)));
  }, []);

  const level = user?.level ?? 1;
  const car = getCar(setup.carId) ?? CARS[0];
  const open = (c: CarDef) => (unlocked ? unlocked.includes(c.id) : c.unlockLevel <= level);
  const color = car.colors[paint % car.colors.length];

  return (
    <div className="py-4">
      <Title sub="Inspect, paint and select your machine. Stats drive real physics.">Garage</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_370px]">
        <Panel className="relative min-h-[420px] overflow-hidden !p-0 lg:min-h-[560px]">
          <Suspense fallback={<Loading label="Loading vehicle" />}>
            <GarageView car={car} paint={color} accent={car.colors[(paint + 1) % car.colors.length]} />
          </Suspense>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
            <div className="pointer-events-auto flex gap-2">
              {car.colors.map((c, i) => (
                <button
                  key={c}
                  aria-label={`Paint ${i + 1}`}
                  onClick={() => {
                    sound.click();
                    setPaint(i);
                  }}
                  className={clsx('h-8 w-8 rounded-full border-2 transition-transform', paint === i ? 'scale-110 border-white' : 'border-white/30 hover:scale-105')}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="pointer-events-auto hidden rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:block">
              Drag to rotate · scroll to zoom
            </div>
          </div>
          <div className="pointer-events-none absolute left-4 top-4">
            <div className="font-display text-2xl font-black uppercase tracking-wide text-white" style={{ textShadow: '0 0 24px rgba(34,211,238,0.4)' }}>
              {car.name}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{car.class} class</div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <p className="text-sm leading-relaxed text-slate-300">{car.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <StatBar label="Speed" value={car.stats.speed} />
              <StatBar label="Accel" value={car.stats.acceleration} color="#a78bfa" />
              <StatBar label="Handling" value={car.stats.handling} color="#34d399" />
              <StatBar label="Braking" value={car.stats.braking} color="#fbbf24" />
              <StatBar label="Nitro" value={car.stats.nitro} color="#fb3b53" />
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Top Speed</div>
                <div className="font-display text-lg font-black text-white">{Math.round(carTopSpeedKmh(car))} km/h</div>
              </div>
            </div>
          </Panel>
          <div className="flex gap-3">
            <Btn kind="primary" className="flex-1" onClick={() => navigate(`/setup/${setup.trackId}`)}>
              Race This Car
            </Btn>
            <Btn className={clsx(specs && 'border-cyan-300/50 text-cyan-300')} onClick={() => setSpecs((v) => !v)}>
              {specs ? 'Hide' : 'Specs'}
            </Btn>
          </div>
          {specs && (
            <Panel>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                {Object.entries(car.stats).map(([k, v]) => (
                  <div key={k} className="flex justify-between pr-3">
                    <dt className="capitalize text-slate-400">{k}</dt>
                    <dd className="font-display font-bold text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>
      </div>

      <h2 className="mb-4 mt-10 font-display text-lg font-black uppercase tracking-wider text-white">All Cars</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARS.map((c, i) => {
          const ok = open(c);
          const sel = c.id === car.id;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              disabled={!ok}
              onClick={() => {
                sound.click();
                setup.set('carId', c.id);
                setPaint(0);
              }}
              aria-pressed={sel}
              className={clsx(
                'panel relative overflow-hidden p-4 text-left transition-all disabled:cursor-not-allowed',
                sel && 'border-cyan-300/60 shadow-[0_0_30px_rgba(34,211,238,0.15)]',
                !ok && 'opacity-60',
                ok && 'hover:-translate-y-0.5 hover:border-white/25'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-black uppercase tracking-wide text-white">{c.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{c.class}</span>
                </div>
                {!ok ? (
                  <span className="rounded-md border border-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    🔒 Lv.{c.unlockLevel}
                  </span>
                ) : sel ? (
                  <span className="rounded-md border border-cyan-300/50 bg-cyan-300/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                    Selected
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  ['SPD', c.stats.speed],
                  ['ACC', c.stats.acceleration],
                  ['HAN', c.stats.handling],
                  ['NIT', c.stats.nitro],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex items-center gap-2">
                    <span className="w-7 text-[10px] font-bold tracking-widest text-slate-500">{l}</span>
                    <div className="bar flex-1">
                      <div className="bg-gradient-to-r from-slate-500/40 to-slate-300" style={{ width: `${v}%` }} />
                    </div>
                    <span className="w-6 text-right font-display text-[10px] font-bold text-slate-300">{v}</span>
                  </div>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
