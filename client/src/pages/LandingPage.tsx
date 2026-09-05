import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CARS, TRACKS, ACHIEVEMENTS } from 'shared';
import { NeonButton, GlassPanel, StatBar, Avatar } from '@/ui/shared';
import { useAuth } from '@/store/auth';
import { audio } from '@/game/engine/audio';

const LandingScene = lazy(() =>
  import('@/game/scenes/LandingScene').then((m) => ({ default: m.LandingScene }))
);

export function LandingPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-950">
      {/* 3D background */}
      <div className="fixed inset-0 opacity-90">
        <Suspense fallback={null}>
          <LandingScene />
        </Suspense>
      </div>
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-ink-950/40 via-transparent to-ink-950" />

      {/* nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl font-black tracking-widest text-white">
            NEXORA<span className="text-neon-cyan">RUSH</span>
          </span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main navigation">
          <NeonButton size="sm" onClick={() => navigate(user ? '/leaderboard' : '/auth')}>
            Leaderboard
          </NeonButton>
          {user ? (
            <NeonButton size="sm" variant="primary" onClick={() => navigate('/dashboard')}>
              Continue
            </NeonButton>
          ) : (
            <>
              <NeonButton size="sm" onClick={() => navigate('/auth')}>Log In</NeonButton>
              <NeonButton size="sm" variant="primary" onClick={() => navigate('/auth?signup=1')}>
                Create Account
              </NeonButton>
            </>
          )}
        </nav>
      </header>

      {/* hero */}
      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-start px-5 pb-20 pt-16 sm:pt-28">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 font-display text-[11px] font-bold uppercase tracking-[0.25em] text-neon-cyan"
        >
          Arcade Racing · In Your Browser
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="max-w-3xl font-display text-5xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-7xl"
        >
          Own the <span className="text-neon-cyan" style={{ textShadow: '0 0 40px rgba(34,211,238,0.6)' }}>night</span>.
          <br />
          Chase the <span className="text-neon-violet" style={{ textShadow: '0 0 40px rgba(167,139,250,0.6)' }}>apex</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-5 max-w-xl text-lg text-slate-300"
        >
          Six neon-drenched worlds. Nine hand-tuned machines. Real opponents, real physics,
          real leaderboards. Drift the city, surf the coast, freeze the arctic.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <NeonButton size="lg" variant="primary" onClick={() => (user ? navigate('/dashboard') : navigate('/demo'))}>
            ▶ Play Now
          </NeonButton>
          <NeonButton size="lg" onClick={() => navigate('/demo')}>
            Guest Demo
          </NeonButton>
        </motion.div>
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-3 text-sm text-slate-400">
          <Feature num="6" label="Worlds" />
          <Feature num="9" label="Cars" />
          <Feature num="5" label="Race Modes" />
          <Feature num="60" label="FPS Target" />
        </div>
      </section>

      {/* features */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-wider text-white">Built to race</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '🏎️', t: 'Feel-good physics', d: 'Arcade handling tuned for flow: grip, drift, nitro chains, near misses.' },
            { icon: '🤖', t: 'Rivals that fight', d: 'AI with racing lines, braking points, mistakes and rubber-band difficulty.' },
            { icon: '🏆', t: 'Real leaderboards', d: 'Global, weekly, monthly and per-track boards backed by a live database.' },
            { icon: '📈', t: 'Progression', d: 'XP, 50 levels, unlockable cars, tracks, paint, achievements and stats.' },
          ].map((f) => (
            <GlassPanel key={f.t} className="transition-transform hover:-translate-y-1">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-widest text-white">{f.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.d}</p>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* cars preview */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl font-black uppercase tracking-wider text-white">The garage</h2>
          <span className="text-sm text-slate-400">9 cars · 3 classes</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARS.map((c) => (
            <GlassPanel key={c.id} className="group">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-black uppercase tracking-wide text-white">{c.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{c.class} class</span>
                </div>
                <div className="flex gap-1">
                  {c.colors.map((col) => (
                    <span key={col} className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: col }} />
                  ))}
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{c.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                <StatBar label="Speed" value={c.stats.speed} />
                <StatBar label="Accel" value={c.stats.acceleration} color="#a78bfa" />
                <StatBar label="Handling" value={c.stats.handling} color="#34d399" />
                <StatBar label="Nitro" value={c.stats.nitro} color="#fb3b53" />
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* tracks preview */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-wider text-white">Six worlds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <GlassPanel key={t.id} className="overflow-hidden">
              <div
                className="h-24 w-full rounded-t-2xl"
                style={{
                  background:
                    t.theme === 'city'
                      ? 'linear-gradient(135deg,#0a0e1e,#22d3ee33)'
                      : t.theme === 'desert'
                        ? 'linear-gradient(135deg,#3d1c4f,#ff9a5a)'
                        : t.theme === 'mountain'
                          ? 'linear-gradient(135deg,#1c3a5f,#a8c8e8)'
                          : t.theme === 'arctic'
                            ? 'linear-gradient(135deg,#7db8e8,#e8f4ff)'
                            : t.theme === 'tropical'
                              ? 'linear-gradient(135deg,#2a1a5e,#ff7e5f)'
                              : 'linear-gradient(135deg,#03040a,#a78bfa55)',
                }}
              />
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-black uppercase tracking-wide text-white">{t.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    {'◆'.repeat(t.difficulty)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t.description}</p>
                <div className="mt-3 flex gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span>{t.lengthKm} km</span>
                  <span>·</span>
                  <span>{t.defaultLaps} laps</span>
                  <span>·</span>
                  <span>Lv.{t.unlockLevel}</span>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* achievements strip */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-wider text-white">Prove it</h2>
        <div className="flex flex-wrap gap-3">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className="glass flex items-center gap-2 rounded-xl px-3 py-2">
              <span className="text-lg">{a.icon}</span>
              <span className="text-xs font-bold text-slate-300">{a.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-10 text-center">
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
          The grid is waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-slate-400">
          Jump into a free guest demo — no account needed. Your demo result carries over when you sign up.
        </p>
        <NeonButton size="lg" variant="primary" className="mt-8" onClick={() => (user ? navigate('/dashboard') : navigate('/demo'))}>
          {user ? 'Back to the garage' : 'Start Your Engine'}
        </NeonButton>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-600">
        Nexora Rush · built with React Three Fiber · all assets procedural
      </footer>
    </div>
  );
}

export function Logo() {
  return (    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/50 bg-ink-800 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
      <svg viewBox="0 0 32 32" className="h-6 w-6">
        <path d="M7 22 L13 9 L16 16 L19 9 L25 22" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Feature({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-black text-neon-cyan">{num}</span>
      <span className="font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );
}
