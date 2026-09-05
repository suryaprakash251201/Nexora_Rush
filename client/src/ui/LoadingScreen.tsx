import { motion } from 'framer-motion';

export function LoadingScreen({ label = 'LOADING TRACK', tips }: { label?: string; tips?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-ink-950">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="font-display text-2xl font-black uppercase tracking-[0.3em] text-neon-cyan"
        role="status"
        aria-live="polite"
      >
        {label}
      </motion.div>
      <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '45%' }}
        />
      </div>
      {tips && <p className="mt-8 max-w-xs px-6 text-center text-xs text-slate-500">{tips}</p>}
      <div className="absolute bottom-8 text-center text-[10px] uppercase tracking-widest text-slate-600">
        <span className="animate-pulse-glow">Loading environment… Loading vehicle… Loading audio…</span>
      </div>
    </div>
  );
}
