import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { sound } from '@/sim/audio';

export function Panel({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={clsx('panel p-5', glow && 'shadow-[0_0_44px_rgba(34,211,238,0.12)]', className)}>
      {children}
    </div>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: 'primary' | 'ghost' | 'danger';
}

export function Btn({ kind = 'ghost', className, onClick, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        sound.unlock();
        sound.click();
        onClick?.(e);
      }}
      className={clsx(
        kind === 'primary' && 'btn-primary',
        kind === 'ghost' && 'btn-ghost',
        kind === 'danger' && 'btn-danger',
        className
      )}
    />
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white sm:text-3xl">{children}</h1>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

export function StatBar({ label, value, color = '#22d3ee' }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <span className="font-display text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="bar">
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: `linear-gradient(90deg, ${color}55, ${color})`, boxShadow: `0 0 10px ${color}55` }} />
      </div>
    </div>
  );
}

export function XpBar({ level, cur, need }: { level: number; cur: number; need: number }) {
  const pct = Math.min(100, (cur / Math.max(1, need)) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-[#0a1220] font-display text-lg font-black text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
        {level}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          <span>Level {level}</span>
          <span>{cur.toLocaleString()} / {need.toLocaleString()} XP</span>
        </div>
        <div className="bar">
          <div className="bg-gradient-to-r from-cyan-500/60 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

const HUES = [190, 350, 45, 140, 265, 25, 200, 320];

export function Avatar({ seed, name, size = 40 }: { seed: string; name: string; size?: number }) {
  const n = Math.abs(parseInt(seed || '0', 10) || 0);
  const hue = HUES[n % HUES.length];
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-xl font-display font-black text-[#031018]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 85% 60%), hsl(${(hue + 40) % 360} 85% 45%))`,
        boxShadow: `0 0 16px hsl(${hue} 85% 60% / 0.35)`,
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function DiffTag({ d }: { d: string }) {
  const map: Record<string, string> = {
    easy: 'border-emerald-400/40 text-emerald-300',
    normal: 'border-cyan-300/40 text-cyan-300',
    hard: 'border-amber-400/40 text-amber-300',
    expert: 'border-rose-400/40 text-rose-300',
    insane: 'border-fuchsia-400/40 text-fuchsia-300',
  };
  return (
    <span className={clsx('rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]', map[d] ?? map.normal)}>
      {d}
    </span>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-xl border border-cyan-300/50 bg-[#0a1220] shadow-[0_0_18px_rgba(34,211,238,0.3)]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 32 32" style={{ width: size * 0.66, height: size * 0.66 }}>
        <path d="M7 22 L13 9 L16 16 L19 9 L25 22" stroke="#22d3ee" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
