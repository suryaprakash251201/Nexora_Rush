import { useTouchControls } from '@/game/engine/input';
import { clsx } from 'clsx';
import { useSettings } from '@/store/settings';

/** Mobile / tablet touch controls overlay. */
export function TouchControls() {
  const set = useTouchControls((s) => s.set);
  const layout = useSettings((s) => s.touchLayout);

  const btn = (key: 'throttle' | 'brake' | 'left' | 'right' | 'handbrake' | 'nitro', label: string, className: string) => (
    <button
      aria-label={label}
      className={clsx(
        'flex select-none items-center justify-center rounded-2xl border border-white/15 bg-black/40 font-display font-black uppercase text-slate-100 backdrop-blur-md active:border-neon-cyan/70 active:bg-cyan-400/25',
        className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        set(key, true);
      }}
      onPointerUp={() => set(key, false)}
      onPointerLeave={() => set(key, false)}
      onPointerCancel={() => set(key, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  if (layout === 'single-stick') {
    return (
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 sm:p-6">
        {btn('left', '◀', 'h-20 w-20 text-2xl')}
        {btn('right', '▶', 'h-20 w-20 text-2xl')}
        <div className="flex flex-col gap-2">
          {btn('nitro', 'N2O', 'h-12 w-16 text-xs')}
          {btn('brake', 'BRK', 'h-12 w-16 text-xs')}
          {btn('throttle', 'GAS', 'h-20 w-20 text-sm')}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 sm:p-6">
      <div className="flex gap-3">
        {btn('left', '◀', 'h-24 w-24 text-3xl')}
        {btn('right', '▶', 'h-24 w-24 text-3xl')}
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          {btn('nitro', 'N2O', 'h-12 w-16 text-[10px]')}
          {btn('handbrake', 'DRIFT', 'h-12 w-16 text-[9px]')}
        </div>
        {btn('brake', 'BRK', 'h-16 w-16 text-xs')}
        {btn('throttle', 'GAS', 'h-24 w-24 text-base')}
      </div>
    </div>
  );
}
