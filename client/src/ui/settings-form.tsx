import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useSettings } from '@/store/settings';
import { sound } from '@/sim/audio';

/** Settings form used on the Settings page and inside the pause menu. */
export function SettingsForm({ compact = false }: { compact?: boolean }) {
  const s = useSettings();
  const [tab, setTab] = useState<'gfx' | 'audio' | 'game' | 'controls'>('gfx');

  useEffect(() => {
    sound.vol = { master: s.master, music: s.music, sfx: s.sfx, engine: s.engine };
    sound.apply();
  }, [s.master, s.music, s.sfx, s.engine]);

  const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-semibold text-slate-200">{label}</div>
        {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );

  const Seg = <T extends string>({ value, opts, onPick }: { value: T; opts: { v: T; label: string }[]; onPick: (v: T) => void }) => (
    <div className="flex overflow-hidden rounded-lg border border-white/10">
      {opts.map((o) => (
        <button
          key={o.v}
          aria-pressed={value === o.v}
          onClick={() => {
            sound.click();
            onPick(o.v);
          }}
          className={clsx(
            'px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors',
            value === o.v ? 'bg-cyan-300/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const Slider = ({ v, fn, label }: { v: number; fn: (v: number) => void; label: string }) => (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={v}
      aria-label={label}
      onChange={(e) => fn(Number(e.target.value))}
      className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-300"
    />
  );

  const Toggle = ({ v, fn, label }: { v: boolean; fn: (v: boolean) => void; label: string }) => (
    <button
      role="switch"
      aria-checked={v}
      aria-label={label}
      onClick={() => {
        sound.click();
        fn(!v);
      }}
      className={clsx('relative h-6 w-11 rounded-full border transition-colors', v ? 'border-cyan-300/60 bg-cyan-300/30' : 'border-white/15 bg-white/10')}
    >
      <span className={clsx('absolute top-[2px] h-[18px] w-[18px] rounded-full transition-all', v ? 'left-[22px] bg-cyan-200' : 'left-[2px] bg-slate-400')} />
    </button>
  );

  const tabs: ('gfx' | 'audio' | 'game' | 'controls')[] = compact ? ['gfx', 'audio', 'game'] : ['gfx', 'audio', 'game', 'controls'];

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-lg px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.14em]',
              tab === t ? 'bg-cyan-300/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {t === 'gfx' ? 'Graphics' : t === 'audio' ? 'Audio' : t === 'game' ? 'Gameplay' : 'Controls'}
          </button>
        ))}
      </div>

      {tab === 'gfx' && (
        <div className="divide-y divide-white/5">
          <Row label="Quality preset">
            <Seg
              value={s.quality}
              onPick={(v) => s.set('quality', v)}
              opts={[
                { v: 'low', label: 'Low' },
                { v: 'medium', label: 'Med' },
                { v: 'high', label: 'High' },
                { v: 'ultra', label: 'Ultra' },
              ]}
            />
          </Row>
          <Row label="Render scale" hint="Lower = faster">
            <Slider v={s.resolution} fn={(v) => s.set('resolution', Math.max(0.5, Math.min(1, v)))} label="Render scale" />
            <span className="w-9 text-right text-xs font-bold text-slate-300">{Math.round(s.resolution * 100)}%</span>
          </Row>
          <Row label="Shadows" hint="Blob shadows always on">
            <Toggle v={s.shadows} fn={(v) => s.set('shadows', v)} label="Shadows" />
          </Row>
          <Row label="FPS counter">
            <Toggle v={s.showFps} fn={(v) => s.set('showFps', v)} label="FPS counter" />
          </Row>
        </div>
      )}
      {tab === 'audio' && (
        <div className="divide-y divide-white/5">
          <Row label="Master"><Slider v={s.master} fn={(v) => s.set('master', v)} label="Master volume" /></Row>
          <Row label="Music"><Slider v={s.music} fn={(v) => s.set('music', v)} label="Music volume" /></Row>
          <Row label="Effects"><Slider v={s.sfx} fn={(v) => s.set('sfx', v)} label="Effects volume" /></Row>
          <Row label="Engine"><Slider v={s.engine} fn={(v) => s.set('engine', v)} label="Engine volume" /></Row>
          <div className="flex items-center justify-between py-2">
            <div className="text-sm font-semibold text-slate-200">Test</div>
            <button
              onClick={() => {
                sound.unlock();
                sound.beep(true);
                setTimeout(() => sound.whoosh(), 350);
              }}
              className="rounded-lg border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-300 hover:text-white"
            >
              Play
            </button>
          </div>
        </div>
      )}
      {tab === 'game' && (
        <div className="divide-y divide-white/5">
          <Row label="Camera">
            <Seg value={s.camera} onPick={(v) => s.set('camera', v)} opts={[{ v: 'chase' as const, label: 'Chase' }, { v: 'hood' as const, label: 'Hood' }]} />
          </Row>
          <Row label="Units">
            <Seg value={s.units} onPick={(v) => s.set('units', v)} opts={[{ v: 'kmh' as const, label: 'KM/H' }, { v: 'mph' as const, label: 'MPH' }]} />
          </Row>
          <Row label="Auto reset" hint="Recover when beached backwards">
            <Toggle v={s.autoReset} fn={(v) => s.set('autoReset', v)} label="Auto reset" />
          </Row>
          <Row label="Steering feel">
            <Slider v={(s.sensitivity - 0.5) / 1.5} fn={(v) => s.set('sensitivity', 0.5 + v * 1.5)} label="Steering sensitivity" />
          </Row>
          <Row label="Calm UI" hint="Reduced motion">
            <Toggle v={s.reducedMotion} fn={(v) => s.set('reducedMotion', v)} label="Reduced motion" />
          </Row>
        </div>
      )}
      {tab === 'controls' && !compact && (
        <div className="py-3 text-xs leading-relaxed text-slate-400">
          <span className="font-semibold text-slate-200">Keyboard:</span> W/↑ drive · S/↓ brake &amp; reverse ·
          A/D or ←/→ steer · Space handbrake (drift) · Shift nitro · R reset car · Esc pause.
          Mobile gets on-screen pedals and steering automatically.
        </div>
      )}
    </div>
  );
}
