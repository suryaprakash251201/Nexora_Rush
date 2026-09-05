import { motion, AnimatePresence } from 'framer-motion';
import { NeonButton, GlassPanel } from './shared';
import { SettingsPanel } from './SettingsPanel';
import { useState } from 'react';

export function PauseMenu({
  open,
  onResume,
  onRestart,
  onQuit,
}: {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-label="Pause menu"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="w-[min(92vw,420px)]"
          >
            {showSettings ? (
              <GlassPanel className="glass-strong max-h-[80vh] overflow-y-auto">
                <SettingsPanel compact />
                <NeonButton variant="primary" className="mt-4 w-full" onClick={() => setShowSettings(false)}>
                  Done
                </NeonButton>
              </GlassPanel>
            ) : (
              <GlassPanel className="glass-strong">
                <h2 className="mb-6 text-center font-display text-2xl font-black uppercase tracking-widest text-white">
                  Paused
                </h2>
                <div className="flex flex-col gap-3">
                  <NeonButton variant="primary" onClick={onResume}>Resume</NeonButton>
                  <NeonButton onClick={onRestart}>Restart Race</NeonButton>
                  <NeonButton onClick={() => setShowSettings(true)}>Settings</NeonButton>
                  <NeonButton variant="danger" onClick={onQuit}>Quit Race</NeonButton>
                </div>
                <p className="mt-5 text-center text-[11px] text-slate-500">
                  W/S accelerate · A/D steer · Space handbrake · Shift nitro · R reset · C camera
                </p>
              </GlassPanel>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
