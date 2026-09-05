import { clsx } from 'clsx';
import { useTouch } from '@/sim/input';

/** On-screen controls for touch devices. */
export function TouchPad() {
  const set = useTouch((s) => s.set);
  const left = useTouch((s) => s.left);
  const right = useTouch((s) => s.right);
  const gas = useTouch((s) => s.gas);
  const brake = useTouch((s) => s.brake);
  const drift = useTouch((s) => s.drift);
  const boost = useTouch((s) => s.boost);

  const bind = (key: 'gas' | 'brake' | 'left' | 'right' | 'drift' | 'boost', value: boolean) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      set(key, true);
    },
    onPointerUp: () => set(key, false),
    onPointerLeave: () => {
      if (!value) return;
      set(key, false);
    },
    onPointerCancel: () => set(key, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const padBtn =
    'pointer-events-auto flex select-none touch-none items-center justify-center border backdrop-blur-xl transition-all duration-100 active:scale-[0.95] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70';

  const idle = 'border-white/15 bg-black/45 text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.5)]';
  const pressed = 'border-cyan-300/70 bg-cyan-300/25 text-white shadow-[0_0_28px_rgba(34,211,238,0.4)]';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
      {/* steering */}
      <div className="flex gap-3">
        <button
          aria-label="Steer left"
          aria-pressed={left}
          {...bind('left', left)}
          className={clsx(padBtn, 'h-20 w-20 rounded-3xl sm:h-24 sm:w-24', left ? pressed : idle)}
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m14 7-5 5 5 5" />
          </svg>
        </button>
        <button
          aria-label="Steer right"
          aria-pressed={right}
          {...bind('right', right)}
          className={clsx(padBtn, 'h-20 w-20 rounded-3xl sm:h-24 sm:w-24', right ? pressed : idle)}
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m10 7 5 5-5 5" />
          </svg>
        </button>
      </div>

      {/* pedals */}
      <div className="flex items-end gap-2.5">
        <div className="flex flex-col gap-2">
          <button
            aria-label="Nitro boost"
            aria-pressed={boost}
            {...bind('boost', boost)}
            className={clsx(
              padBtn,
              'h-11 w-[72px] flex-col gap-0 rounded-2xl font-display',
              boost ? 'border-sky-300/70 bg-sky-300/25 text-white shadow-[0_0_28px_rgba(56,189,248,0.5)]' : 'border-sky-300/30 bg-sky-300/10 text-sky-200'
            )}
          >
            <span className="text-[11px] font-black tracking-[0.14em]">N₂O</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-70">Boost</span>
          </button>
          <button
            aria-label="Handbrake drift"
            aria-pressed={drift}
            {...bind('drift', drift)}
            className={clsx(
              padBtn,
              'h-11 w-[72px] flex-col gap-0 rounded-2xl font-display',
              drift ? 'border-amber-300/70 bg-amber-300/25 text-white shadow-[0_0_28px_rgba(251,191,36,0.4)]' : 'border-white/15 bg-black/45 text-slate-200'
            )}
          >
            <span className="text-[10px] font-black tracking-[0.14em]">DRIFT</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-60">Hold</span>
          </button>
        </div>
        <button
          aria-label="Brake and reverse"
          aria-pressed={brake}
          {...bind('brake', brake)}
          className={clsx(
            padBtn,
            'h-16 w-16 flex-col gap-0 rounded-3xl font-display sm:h-[72px] sm:w-[72px]',
            brake ? 'border-rose-300/70 bg-rose-400/25 text-white shadow-[0_0_28px_rgba(251,59,83,0.4)]' : 'border-white/15 bg-black/45 text-slate-100'
          )}
        >
          <span className="text-xs font-black tracking-[0.12em]">BRK</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-60">Brake</span>
        </button>
        <button
          aria-label="Accelerate"
          aria-pressed={gas}
          {...bind('gas', gas)}
          className={clsx(
            padBtn,
            'h-20 w-20 flex-col gap-0 rounded-3xl font-display sm:h-24 sm:w-24',
            gas
              ? 'border-cyan-300/70 bg-cyan-300/30 text-white shadow-[0_0_32px_rgba(34,211,238,0.55)]'
              : 'border-cyan-300/40 bg-cyan-300/12 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
          )}
        >
          <span className="text-sm font-black tracking-[0.12em]">GAS</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-70">Hold</span>
        </button>
      </div>
    </div>
  );
}
