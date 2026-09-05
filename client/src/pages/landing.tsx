import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ACHIEVEMENTS, CARS, TRACKS } from 'shared';
import { Btn, Logo, Panel, StatBar } from '@/ui/kit';
import { useAuth } from '@/store/auth';

const HeroScene = lazy(() => import('@/scenes/hero').then((m) => ({ default: m.HeroScene })));

export function Landing() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#04060c]">
      <div className="fixed inset-0">
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#04060c]/50 via-transparent to-[#04060c]" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl font-black tracking-widest text-white">
            NEXORA<span className="text-cyan-300">RUSH</span>
          </span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main">
          {user ? (
            <Btn className="px-3 py-1.5 text-xs" onClick={() => navigate('/dashboard')}>
              Continue →
            </Btn>
          ) : (
            <>
              <Btn className="px-3 py-1.5 text-xs" onClick={() => navigate('/auth')}>Log In</Btn>
              <Btn kind="primary" className="px-3 py-1.5 text-xs" onClick={() => navigate('/auth?signup=1')}>
                Create Account
              </Btn>
            </>
          )}
        </nav>
      </header>

      <section className="relative z-10 mx-auto flex max-w-7xl flex-col items-start px-5 pb-16 pt-14 sm:pt-24">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 font-display text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300"
        >
          Arcade Racing · In Your Browser
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="max-w-3xl font-display text-5xl font-black uppercase leading-[0.95] text-white sm:text-7xl"
        >
          Own the <span className="text-cyan-300" style={{ textShadow: '0 0 40px rgba(34,211,238,0.6)' }}>night</span>.
          <br />
          Chase the <span className="text-violet-300" style={{ textShadow: '0 0 40px rgba(167,139,250,0.6)' }}>apex</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-5 max-w-xl text-lg text-slate-300"
        >
          Six neon-drenched worlds. Nine hand-tuned machines. Real rivals, real physics,
          real leaderboards. Free guest demo — no account needed.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-8 flex flex-wrap gap-4"
        >
          <Btn kind="primary" className="px-8 py-4 text-base" onClick={() => navigate(user ? '/dashboard' : '/demo')}>
            ▶ Play Now
          </Btn>
          {!user && (
            <Btn className="px-8 py-4 text-base" onClick={() => navigate('/demo')}>
              Guest Demo
            </Btn>
          )}
        </motion.div>
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-3 text-sm text-slate-400">
          {[
            ['6', 'Worlds'],
            ['9', 'Cars'],
            ['5', 'Race Modes'],
            ['60', 'FPS Target'],
          ].map(([n, l]) => (
            <div key={l} className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-cyan-300">{n}</span>
              <span className="font-semibold uppercase tracking-widest">{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-14">
        <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-wider text-white">Built to race</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['🏎️', 'Feel-good physics', 'Grip, drift, nitro chains and near misses tuned for flow.'],
            ['🤖', 'Rivals that fight', 'AI with racing lines, braking points, mistakes and 5 difficulties.'],
            ['🏆', 'Real leaderboards', 'Global, weekly, monthly and per-track boards in a live database.'],
            ['📈', 'Progression', '50 levels, unlockable cars and tracks, achievements, stats.'],
          ].map(([icon, t, d]) => (
            <Panel key={t} className="transition-transform hover:-translate-y-1">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-widest text-white">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{d}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="font-display text-2xl font-black uppercase tracking-wider text-white">The garage</h2>
          <span className="text-sm text-slate-400">9 cars · 3 classes</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARS.map((c) => (
            <Panel key={c.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-black uppercase tracking-wide text-white">{c.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{c.class} class</span>
                </div>
                <div className="flex gap-1">
                  {c.colors.map((col) => (
                    <span key={col} className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: col }} />
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                <StatBar label="Speed" value={c.stats.speed} />
                <StatBar label="Accel" value={c.stats.acceleration} color="#a78bfa" />
                <StatBar label="Handling" value={c.stats.handling} color="#34d399" />
                <StatBar label="Nitro" value={c.stats.nitro} color="#fb3b53" />
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-wider text-white">Six worlds</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <Panel key={t.id} className="overflow-hidden !p-0">
              <div
                className="h-20 w-full"
                style={{
                  background:
                    t.theme === 'city' ? 'linear-gradient(135deg,#0a0e1e,#22d3ee44)'
                    : t.theme === 'desert' ? 'linear-gradient(135deg,#3d1c4f,#ff9a5a)'
                    : t.theme === 'mountain' ? 'linear-gradient(135deg,#1c3a5f,#a8c8e8)'
                    : t.theme === 'arctic' ? 'linear-gradient(135deg,#7db8e8,#e8f4ff)'
                    : t.theme === 'tropical' ? 'linear-gradient(135deg,#2a1a5e,#ff7e5f)'
                    : 'linear-gradient(135deg,#03040a,#a78bfa66)',
                }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-black uppercase tracking-wide text-white">{t.name}</h3>
                  <span className="text-[10px] font-bold tracking-widest text-amber-300">{'◆'.repeat(t.difficulty)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{t.description}</p>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <h2 className="mb-8 font-display text-2xl font-black uppercase tracking-wider text-white">Prove it</h2>
        <div className="flex flex-wrap gap-3">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className="panel flex items-center gap-2 rounded-xl px-3 py-2">
              <span className="text-lg">{a.icon}</span>
              <span className="text-xs font-bold text-slate-300">{a.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-10 text-center">
        <h2 className="font-display text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
          The grid is waiting.
        </h2>
        <Btn kind="primary" className="mt-8 px-8 py-4 text-base" onClick={() => navigate(user ? '/dashboard' : '/demo')}>
          {user ? 'Back to the garage' : 'Start Your Engine'}
        </Btn>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-600">
        Nexora Rush · original procedural assets · React Three Fiber
      </footer>
    </div>
  );
}
