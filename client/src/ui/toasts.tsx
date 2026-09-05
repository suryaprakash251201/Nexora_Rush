import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AchievementDef } from 'shared';
import { sound } from '@/sim/audio';

let push: ((a: AchievementDef) => void) | null = null;

/** Raise an achievement toast from anywhere. */
export function toastAch(a: AchievementDef) {
  push?.(a);
}

export function AchToasts() {
  const [items, setItems] = useState<(AchievementDef & { k: number })[]>([]);
  useEffect(() => {
    let k = 0;
    push = (a) => {
      sound.unlock_jingle();
      const item = { ...a, k: k++ };
      setItems((t) => [...t, item]);
      setTimeout(() => setItems((t) => t.filter((x) => x.k !== item.k)), 5200);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[80] flex w-72 flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.k}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="panel-solid flex items-center gap-3 border-amber-300/30 p-3"
          >
            <span className="text-2xl">{t.icon}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">Achievement Unlocked</div>
              <div className="truncate text-sm font-bold text-white">{t.name}</div>
              <div className="truncate text-[11px] text-slate-400">{t.description}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
