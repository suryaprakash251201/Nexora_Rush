import { motion } from 'framer-motion';

export function Loading({ label = 'LOADING', hint }: { label?: string; hint?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#04060c]">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="font-display text-2xl font-black uppercase tracking-[0.3em] text-cyan-300"
        role="status"
        aria-live="polite"
      >
        {label}
      </motion.div>
      <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300"
          animate={{ x: ['-100%', '220%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: '45%' }}
        />
      </div>
      {hint && <p className="mt-8 max-w-xs px-6 text-center text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
