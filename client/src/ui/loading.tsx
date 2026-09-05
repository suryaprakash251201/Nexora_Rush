import { motion } from 'framer-motion';

export function Loading({ label = 'LOADING', hint }: { label?: string; hint?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#04060c] px-6">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(600px 240px at 50% 38%, rgba(34,211,238,0.12), transparent 65%), radial-gradient(500px 220px at 50% 75%, rgba(167,139,250,0.08), transparent 65%)',
        }}
      />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/40 bg-[#0a1220] shadow-[0_0_28px_rgba(34,211,238,0.3)]">
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
          <path d="M7 22 L13 9 L16 16 L19 9 L25 22" stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <motion.div
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="relative mt-5 font-display text-lg font-black uppercase tracking-[0.3em] text-cyan-200 sm:text-xl"
        role="status"
        aria-live="polite"
      >
        {label}
      </motion.div>
      <div className="relative mt-6 h-1.5 w-56 overflow-hidden rounded-full border border-white/10 bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-violet-300 shadow-[0_0_16px_rgba(34,211,238,0.7)]"
          animate={{ x: ['-100%', '220%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '45%' }}
        />
      </div>
      {hint ? (
        <p className="relative mt-6 max-w-xs text-center text-xs leading-relaxed text-slate-500">{hint}</p>
      ) : (
        <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">Warming tires…</p>
      )}
    </div>
  );
}
