import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ACHIEVEMENTS, type PlayerAggregate } from 'shared';
import { api } from '@/services/api';
import { useAuth } from '@/store/auth';
import { GlassPanel, SectionTitle, XPBar } from '@/ui/shared';
import { formatTime, timeAgo } from '@/game/engine/format';
import { xpProgress } from 'shared';
import { clsx } from 'clsx';

export function AchievementsPage() {
  const user = useAuth((s) => s.user);
  const [unlocked, setUnlocked] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    api.myAchievements().then((r) => {
      setUnlocked(new Map(r.achievements.map((a) => [a.id, a.unlockedAt])));
    });
  }, []);

  const done = unlocked.size;
  const prog = xpProgress(user?.xp ?? 0);

  // approximate aggregate display from profile-less hints is not needed:
  // achievements show exact unlock state from the server.
  return (
    <div className="py-4">
      <SectionTitle sub={`${done} of ${ACHIEVEMENTS.length} unlocked`}>Achievements</SectionTitle>

      <GlassPanel className="mb-6 max-w-md">
        <XPBar level={prog.level} current={prog.current} needed={prog.needed} />
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a, i) => {
          const at = unlocked.get(a.id);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <GlassPanel className={clsx('h-full', at ? 'border-amber-400/40' : 'opacity-75')}>
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
                      at ? 'bg-amber-400/15 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'bg-white/5 grayscale'
                    )}
                  >
                    {at ? a.icon : '🔒'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={clsx('truncate font-display text-sm font-black uppercase tracking-wide', at ? 'text-amber-200' : 'text-white')}>
                        {a.name}
                      </h3>
                      <span className="shrink-0 font-display text-[11px] font-black text-amber-300">+{a.xp} XP</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{a.description}</p>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest">
                      {at ? (
                        <span className="text-emerald-400">Unlocked {timeAgo(at)}</span>
                      ) : (
                        <span className="text-slate-600">Locked</span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export type { PlayerAggregate };
void formatTime;
