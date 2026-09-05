import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Btn, Panel } from './kit';
import { SettingsForm } from './settings-form';

export function PauseMenu({ open, onResume, onRestart, onQuit }: { open: boolean; onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  const [settings, setSettings] = useState(false);
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
            className="w-[min(92vw,430px)]"
          >
            {settings ? (
              <div className="panel-solid max-h-[82vh] overflow-y-auto p-5">
                <SettingsForm compact />
                <Btn kind="primary" className="mt-4 w-full" onClick={() => setSettings(false)}>
                  Done
                </Btn>
              </div>
            ) : (
              <Panel className="panel-solid">
                <h2 className="mb-6 text-center font-display text-2xl font-black uppercase tracking-[0.14em] text-white">
                  Paused
                </h2>
                <div className="flex flex-col gap-3">
                  <Btn kind="primary" onClick={onResume}>Resume</Btn>
                  <Btn onClick={onRestart}>Restart Race</Btn>
                  <Btn onClick={() => setSettings(true)}>Settings</Btn>
                  <Btn kind="danger" onClick={onQuit}>Quit Race</Btn>
                </div>
                <p className="mt-5 text-center text-[11px] text-slate-500">
                  W/S drive · A/D steer · Space drift · Shift nitro · R reset · Esc pause
                </p>
              </Panel>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
