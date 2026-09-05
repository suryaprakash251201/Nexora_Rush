import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AchievementDef } from 'shared';
import { audio } from '@/game/engine/audio';

let pushToast: ((a: AchievementDef) => void) | null = null;

/** Fire an achievement toast from anywhere. */
export function toastAchievement(a: AchievementDef) {
  pushToast?.(a);
}

export function AchievementToasts() {
  const [toasts, setToasts] = useState<(AchievementDef & { key: number })[]>([]);
  useEffect(() => {
    let key = 0;
    pushToast = (a) => {
      audio.achievement();
      const item = { ...a, key: key++ };
      setToasts((t) => [...t, item]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.key !== item.key)), 5200);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[80] flex w-72 flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.key}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="glass-strong flex items-center gap-3 border-amber-400/30 p-3"
          >
            <span className="text-2xl">{t.icon}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Achievement Unlocked</div>
              <div className="truncate text-sm font-bold text-white">{t.name}</div>
              <div className="truncate text-[11px] text-slate-400">{t.description}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
