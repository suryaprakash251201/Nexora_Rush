import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { api } from '@/api';
import { Btn, Panel, Title } from '@/ui/kit';
import { SettingsForm } from '@/ui/settings-form';

export function Prefs() {
  const user = useAuth((s) => s.user);
  const settings = useSettings();
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    if (timer.current) window.clearTimeout(timer.current);
    setSaved(false);
    timer.current = window.setTimeout(() => {
      const { set, presetPerformance, presetQuality, resetAll, ...rest } = settings;
      void set;
      void presetPerformance;
      void presetQuality;
      void resetAll;
      api.saveSettings(rest).then(() => setSaved(true)).catch(() => undefined);
    }, 900);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.quality, settings.resolution, settings.shadows, settings.showFps, settings.master, settings.music, settings.sfx, settings.engine, settings.camera, settings.units, settings.autoReset, settings.sensitivity, settings.reducedMotion]);

  return (
    <div className="py-4">
      <Title sub="Graphics, audio, gameplay. Auto-synced to your account.">Settings</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel>
          <SettingsForm />
        </Panel>
        <Panel>
          <h3 className="mb-3 font-display text-sm font-black uppercase tracking-widest text-white">Presets</h3>
          <div className="flex flex-col gap-2">
            <Btn onClick={() => useSettings.getState().presetPerformance()}>🪶 Performance mode</Btn>
            <Btn onClick={() => useSettings.getState().presetQuality()}>✨ Quality mode</Btn>
            <Btn kind="danger" onClick={() => useSettings.getState().resetAll()}>
              Reset everything
            </Btn>
          </div>
          <div className="mt-4 rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
            {saved ? '✓ Saved to your account.' : user ? 'Changes auto-save to your account.' : 'Log in to sync across devices.'}
          </div>
        </Panel>
      </div>
    </div>
  );
}
