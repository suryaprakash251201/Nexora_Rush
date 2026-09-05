import { clsx } from 'clsx';
import { useTouch } from '@/sim/input';

/** On-screen controls for touch devices. */
export function TouchPad() {
  const set = useTouch((s) => s.set);
  const hold = (key: 'gas' | 'brake' | 'left' | 'right' | 'drift' | 'boost', label: string, cls: string) => (
    <button
      key={key}
      aria-label={label}
      className={clsx(
        'flex select-none touch-none items-center justify-center rounded-2xl border border-white/15 bg-black/45 font-display font-black uppercase text-slate-100 backdrop-blur-md active:border-cyan-300/70 active:bg-cyan-300/25',
        cls
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

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 sm:p-6">
      <div className="flex gap-3">
        {hold('left', '◀', 'h-24 w-24 text-3xl')}
        {hold('right', '▶', 'h-24 w-24 text-3xl')}
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-2">
          {hold('boost', 'N2O', 'h-12 w-16 text-[10px]')}
          {hold('drift', 'Drift', 'h-12 w-16 text-[9px]')}
        </div>
        {hold('brake', 'Brk', 'h-16 w-16 text-xs')}
        {hold('gas', 'Gas', 'h-24 w-24 text-base')}
      </div>
    </div>
  );
}
