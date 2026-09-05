import { useEffect, useState } from 'react';
import { useSettings, type Quality } from '@/store/settings';
import { clsx } from 'clsx';
import { audio } from '@/game/engine/audio';

/** Settings panel used in the pause menu (compact) and the settings page. */
export function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const s = useSettings();
  const set = s.set;
  const [tab, setTab] = useState<'graphics' | 'audio' | 'gameplay' | 'controls'>('graphics');

  useEffect(() => {
    audio.setVolumes({
      master: s.masterVolume,
      music: s.musicVolume,
      sfx: s.sfxVolume,
      engine: s.engineVolume,
    });
  }, [s.masterVolume, s.musicVolume, s.sfxVolume, s.engineVolume]);

  const Row = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-semibold text-slate-200">{label}</div>
        {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );

  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) => (
    <div className="flex overflow-hidden rounded-lg border border-white/10">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => {
            audio.uiClick();
            onChange(o.v);
          }}
          className={clsx(
            'px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
            value === o.v ? 'bg-cyan-400/20 text-neon-cyan' : 'text-slate-400 hover:text-slate-200'
          )}
          aria-pressed={value === o.v}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const Slider = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-300"
    />
  );

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => {
        audio.uiClick();
        onChange(!value);
      }}
      className={clsx(
        'relative h-6 w-11 rounded-full border transition-colors',
        value ? 'border-cyan-400/60 bg-cyan-400/30' : 'border-white/15 bg-white/10'
      )}
    >
      <span className={clsx('absolute top-0.5 h-4.5 w-4.5 h-[18px] w-[18px] rounded-full transition-all', value ? 'left-[22px] bg-cyan-300' : 'left-0.5 bg-slate-400')} />
    </button>
  );

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex gap-2">
          {(['graphics', 'audio', 'gameplay', 'controls'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'rounded-lg px-3 py-1.5 font-display text-xs font-bold uppercase tracking-widest transition-colors',
                tab === t ? 'bg-cyan-400/20 text-neon-cyan' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {compact && (
        <div className="mb-3 flex gap-2">
          {(['graphics', 'audio', 'gameplay'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'rounded-lg px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-widest',
                tab === t ? 'bg-cyan-400/20 text-neon-cyan' : 'text-slate-400'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'graphics' && (
        <div className="divide-y divide-white/5">
          <Row label="Quality">
            <Seg<Quality>
              value={s.quality}
              onChange={(v) => set('quality', v)}
              options={[
                { v: 'low', label: 'Low' },
                { v: 'medium', label: 'Med' },
                { v: 'high', label: 'High' },
                { v: 'ultra', label: 'Ultra' },
              ]}
            />
          </Row>
          <Row label="Resolution scale" hint="Lower = faster">
            <Slider value={s.resolutionScale} onChange={(v) => set('resolutionScale', Math.max(0.5, Math.min(1, v)))} label="Resolution scale" />
            <span className="w-9 text-right text-xs font-bold text-slate-300">{Math.round(s.resolutionScale * 100)}%</span>
          </Row>
          <Row label="Shadows"><Toggle value={s.shadows} onChange={(v) => set('shadows', v)} label="Shadows" /></Row>
          <Row label="Reflections"><Toggle value={s.reflections} onChange={(v) => set('reflections', v)} label="Reflections" /></Row>
          <Row label="Bloom" hint="Coming with post-processing pass"><Toggle value={s.bloom} onChange={(v) => set('bloom', v)} label="Bloom" /></Row>
          <Row label="Motion blur" hint="Coming with post-processing pass"><Toggle value={s.motionBlur} onChange={(v) => set('motionBlur', v)} label="Motion blur" /></Row>
          <Row label="FPS counter"><Toggle value={s.showFps} onChange={(v) => set('showFps', v)} label="FPS counter" /></Row>
        </div>
      )}
      {tab === 'audio' && (
        <div className="divide-y divide-white/5">
          <Row label="Master"><Slider value={s.masterVolume} onChange={(v) => set('masterVolume', v)} label="Master volume" /></Row>
          <Row label="Music"><Slider value={s.musicVolume} onChange={(v) => set('musicVolume', v)} label="Music volume" /></Row>
          <Row label="SFX"><Slider value={s.sfxVolume} onChange={(v) => set('sfxVolume', v)} label="SFX volume" /></Row>
          <Row label="Engine"><Slider value={s.engineVolume} onChange={(v) => set('engineVolume', v)} label="Engine volume" /></Row>
          <TestAudioRow />
        </div>
      )}
      {tab === 'gameplay' && (
        <div className="divide-y divide-white/5">
          <Row label="Camera">
            <Seg value={s.camera} onChange={(v) => set('camera', v)} options={[{ v: 'chase' as const, label: 'Chase' }, { v: 'hood' as const, label: 'Hood' }]} />
          </Row>
          <Row label="Units">
            <Seg value={s.units} onChange={(v) => set('units', v)} options={[{ v: 'kmh' as const, label: 'KM/H' }, { v: 'mph' as const, label: 'MPH' }]} />
          </Row>
          <Row label="Auto reset" hint="Recover the car when stuck facing backwards">
            <Toggle value={s.autoReset} onChange={(v) => set('autoReset', v)} label="Auto reset" />
          </Row>
          <Row label="Reduce motion" hint="Calmer UI animations">
            <Toggle value={s.reducedMotion} onChange={(v) => set('reducedMotion', v)} label="Reduced motion" />
          </Row>
        </div>
      )}
      {tab === 'controls' && (
        <div className="divide-y divide-white/5">
          <Row label="Steering sensitivity">
            <Slider value={(s.steerSensitivity - 0.5) / 1.5} onChange={(v) => set('steerSensitivity', 0.5 + v * 1.5)} label="Steering sensitivity" />
          </Row>
          <Row label="Touch layout">
            <Seg value={s.touchLayout} onChange={(v) => set('touchLayout', v)} options={[{ v: 'left-right' as const, label: 'Buttons' }, { v: 'single-stick' as const, label: 'Simple' }]} />
          </Row>
          <div className="py-3 text-[11px] leading-relaxed text-slate-400">
            <span className="font-semibold text-slate-300">Keyboard:</span> W/↑ accelerate · S/↓ brake/reverse · A/D or ←/→ steer · Space handbrake · Shift nitro · R reset · C camera · Esc pause
          </div>
        </div>
      )}
    </div>
  );
}

function TestAudioRow() {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="text-sm font-semibold text-slate-200">Test sounds</div>
      <button
        onClick={() => {
          audio.init();
          audio.countdownBeep(true);
          setTimeout(() => audio.nitroWhoosh(), 400);
        }}
        className="rounded-lg border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:text-white"
      >
        Play
      </button>
    </div>
  );
}
