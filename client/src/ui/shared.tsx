import { clsx } from 'clsx';
import { audio } from '@/game/engine/audio';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function GlassPanel({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={clsx('glass p-5', glow && 'shadow-[0_0_40px_rgba(34,211,238,0.12)]', className)}>
      {children}
    </div>
  );
}

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function NeonButton({ variant = 'ghost', size = 'md', className, onClick, ...rest }: NeonButtonProps) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        audio.init();
        audio.uiClick();
        onClick?.(e);
      }}
      className={clsx(
        variant === 'primary' && 'neon-btn-primary',
        variant === 'ghost' && 'neon-btn-ghost',
        variant === 'danger' && 'neon-btn-danger',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && '',
        size === 'lg' && 'px-8 py-4 text-base',
        className
      )}
    />
  );
}

export function StatBar({ label, value, max = 100, color = '#22d3ee' }: { label: string; value: number; max?: number; color?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        <span className="font-display text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${(value / max) * 100}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, boxShadow: `0 0 12px ${color}66` }} />
      </div>
    </div>
  );
}

export function XPBar({ level, current, needed }: { level: number; current: number; needed: number }) {
  const pct = Math.min(100, (current / Math.max(1, needed)) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/40 bg-ink-800 font-display text-lg font-black text-neon-cyan shadow-[0_0_18px_rgba(34,211,238,0.25)]">
        {level}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          <span>Level {level}</span>
          <span>{current.toLocaleString()} / {needed.toLocaleString()} XP</span>
        </div>
        <div className="stat-track">
          <div className="stat-fill bg-gradient-to-r from-cyan-500/60 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

const AVATAR_HUES = [190, 350, 45, 140, 265, 25, 200, 320];

export function Avatar({ seed, username, size = 40 }: { seed: string; username: string; size?: number }) {
  const idx = Math.abs(parseInt(seed || '0', 10) || 0) % AVATAR_HUES.length;
  const hue = AVATAR_HUES[idx];
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl font-display font-black text-ink-950"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 85% 60%), hsl(${(hue + 40) % 360} 85% 45%))`,
        boxShadow: `0 0 16px hsl(${hue} 85% 60% / 0.35)`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-black uppercase tracking-wider text-white sm:text-3xl">
        {children}
      </h1>
      {sub && <p className="mt-1 text-sm text-slate-400">{sub}</p>}
    </div>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, string> = {
    easy: 'text-emerald-400 border-emerald-400/40',
    normal: 'text-cyan-400 border-cyan-400/40',
    hard: 'text-amber-400 border-amber-400/40',
    expert: 'text-rose-400 border-rose-400/40',
    insane: 'text-fuchsia-400 border-fuchsia-400/40',
  };
  return (
    <span className={clsx('rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', map[difficulty] ?? map.normal)}>
      {difficulty}
    </span>
  );
}
