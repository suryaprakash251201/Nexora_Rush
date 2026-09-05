import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { clsx } from 'clsx';
import { Btn } from './kit';
import { SettingsForm } from './settings-form';

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-slate-200">
      {children}
    </span>
  );
}

export function PauseMenu({ open, onResume, onRestart, onQuit }: { open: boolean; onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  const [settings, setSettings] = useState(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
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
              <div className="max-h-[82vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0a0f1c]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <h2 className="mb-1 font-display text-lg font-black uppercase tracking-[0.14em] text-white">Settings</h2>
                <p className="mb-3 text-xs text-slate-500">Applies instantly — race stays frozen.</p>
                <SettingsForm compact />
                <Btn kind="primary" className="mt-4 w-full" onClick={() => setSettings(false)}>
                  Done
                </Btn>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-[#0a0f1c]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-300">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                      <rect x="6" y="4" width="4" height="16" rx="1.2" />
                      <rect x="14" y="4" width="4" height="16" rx="1.2" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-black uppercase tracking-[0.14em] text-white">Paused</h2>
                    <p className="text-xs text-slate-500">Race frozen — take a breath.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5">
                  <Btn kind="primary" onClick={onResume} className="w-full !py-3">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                      <path d="M7 4.5v15l13-7.5-13-7.5z" />
                    </svg>
                    Resume
                  </Btn>
                  <Btn onClick={onRestart} className="w-full !py-3">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 12a9 9 0 1 0 3-6.7" />
                      <path d="M3 4v5h5" />
                    </svg>
                    Restart Race
                  </Btn>
                  <Btn onClick={() => setSettings(true)} className="w-full !py-3">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
                    </svg>
                    Settings
                  </Btn>
                  <Btn kind="danger" onClick={onQuit} className="w-full !py-3">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                    Quit Race
                  </Btn>
                </div>
                <div className={clsx('mt-5 flex flex-wrap items-center justify-center gap-1.5')}>
                  <Kbd>W</Kbd>
                  <Kbd>S</Kbd>
                  <span className="text-[10px] text-slate-500">drive</span>
                  <span className="mx-0.5 text-slate-700">·</span>
                  <Kbd>A</Kbd>
                  <Kbd>D</Kbd>
                  <span className="text-[10px] text-slate-500">steer</span>
                  <span className="mx-0.5 text-slate-700">·</span>
                  <Kbd>Space</Kbd>
                  <span className="text-[10px] text-slate-500">drift</span>
                  <span className="mx-0.5 text-slate-700">·</span>
                  <Kbd>Shift</Kbd>
                  <span className="text-[10px] text-slate-500">nitro</span>
                  <span className="mx-0.5 text-slate-700">·</span>
                  <Kbd>R</Kbd>
                  <span className="text-[10px] text-slate-500">reset</span>
                  <span className="mx-0.5 text-slate-700">·</span>
                  <Kbd>Esc</Kbd>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
