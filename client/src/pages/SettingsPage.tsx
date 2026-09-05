import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { api } from '@/services/api';
import { GlassPanel, NeonButton, SectionTitle } from '@/ui/shared';
import { SettingsPanel } from '@/ui/SettingsPanel';

export function SettingsPage() {
  const user = useAuth((s) => s.user);
  const settings = useSettings();
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  // Persist settings to the account (debounced)
  useEffect(() => {
    if (!user) return;
    if (timer.current) window.clearTimeout(timer.current);
    setSaved(false);
    timer.current = window.setTimeout(() => {
      const { set, reset, ...rest } = settings;
      void set;
      void reset;
      api.saveSettings(rest).then(() => setSaved(true)).catch(() => undefined);
    }, 900);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, JSON.stringify({ ...settings, set: 0, reset: 0 })]);

  return (
    <div className="py-4">
      <SectionTitle sub="Graphics, audio, gameplay and controls. Synced to your account.">Settings</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GlassPanel>
          <SettingsPanel />
        </GlassPanel>
        <GlassPanel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Presets</h3>
          <div className="flex flex-col gap-2">
            <NeonButton
              onClick={() => {
                const s = useSettings.getState();
                s.set('quality', 'low');
                s.set('shadows', false);
                s.set('resolutionScale', 0.7);
                s.set('reflections', false);
              }}
            >
              🪶 Performance (mobile / older GPUs)
            </NeonButton>
            <NeonButton
              onClick={() => {
                const s = useSettings.getState();
                s.set('quality', 'high');
                s.set('shadows', true);
                s.set('resolutionScale', 1);
                s.set('reflections', true);
              }}
            >
              ✨ Quality (default)
            </NeonButton>
            <NeonButton variant="danger" onClick={() => useSettings.getState().reset()}>
              Reset all settings
            </NeonButton>
          </div>
          <div className="mt-4 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
            {saved ? '✓ Settings saved to your account.' : user ? 'Settings auto-save to your account.' : 'Log in to sync settings across devices.'}
            <br />
            Reduced-motion preference is honored for UI animations.
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
