import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/store/auth';
import { api, ApiError } from '@/services/api';
import { NeonButton } from '@/ui/shared';
import { Logo } from './LandingPage';
import { clsx } from 'clsx';
import { audio } from '@/game/engine/audio';
import { CARS } from 'shared';

export function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>(params.get('signup') ? 'signup' : 'login');
  const auth = useAuth();
  const navigate = useNavigate();
  const from = params.get('from') ?? '/dashboard';

  useEffect(() => {
    if (auth.user) navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong relative z-10 w-full max-w-md p-8"
      >
        <div className="mb-8 flex items-center gap-3">
          <Logo />
          <div>
            <div className="font-display text-lg font-black tracking-widest text-white">
              NEXORA<span className="text-neon-cyan">RUSH</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              {mode === 'login' ? 'Welcome back, racer' : 'Join the grid'}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1" role="tablist">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                audio.init();
                audio.uiClick();
                setMode(m);
              }}
              className={clsx(
                'rounded-lg py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors',
                mode === m ? 'bg-cyan-400/20 text-neon-cyan' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {m === 'login' ? 'Log In' : 'Create Account'}
            </button>
          ))}
        </div>

        {mode === 'login' ? (
          <LoginForm
            onSubmit={async (identifier, password, remember) => {
              await auth.login(identifier, password, remember);
              navigate(from, { replace: true });
            }}
          />
        ) : (
          <SignupForm
            onSubmit={async (body) => {
              await auth.register(body);
              navigate(from, { replace: true });
            }}
          />
        )}

        {auth.error && (
          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200">
            {auth.error}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/demo" className="text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-neon-cyan">
            or try the guest demo →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (identifier: string, password: string, remember: boolean) => Promise<void> }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (identifier.trim().length < 3) errs.identifier = 'Enter your username or email';
    if (!password) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSubmit(identifier.trim(), password, remember);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Username or Email" error={errors.identifier}>
        <input
          className="input-field"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          aria-label="Username or email"
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          className="input-field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          aria-label="Password"
        />
      </Field>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
        Remember me on this device
      </label>
      <NeonButton variant="primary" className="mt-6 w-full" disabled={busy} type="submit">
        {busy ? 'Signing in…' : 'Log In'}
      </NeonButton>
    </form>
  );
}

function strength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong', 'Elite'];
  const colors = ['#f43f5e', '#f43f5e', '#fbbf24', '#fbbf24', '#34d399', '#22d3ee'];
  return { score: s, label: labels[s], color: colors[s] };
}

function SignupForm({ onSubmit }: { onSubmit: (body: { username: string; email: string; password: string; confirmPassword: string; avatarSeed?: string }) => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [avatarSeed, setSeed] = useState(String(1 + Math.floor(Math.random() * 8)));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const str = strength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) errs.username = 'Letters, numbers, _ and - only';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (!/[a-zA-Z]/.test(password)) errs.password = 'Password must contain a letter';
    if (!/[0-9]/.test(password)) errs.password = 'Password must contain a digit';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await onSubmit({ username: username.trim(), email: email.trim(), password, confirmPassword, avatarSeed });
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      else if (err instanceof ApiError) setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg font-black text-ink-950"
          style={{
            background: `linear-gradient(135deg, hsl(${(Number(avatarSeed) * 45) % 360} 85% 60%), hsl(${(Number(avatarSeed) * 45 + 40) % 360} 85% 45%))`,
          }}
        >
          {username.slice(0, 2).toUpperCase() || '??'}
        </div>
        <div className="flex gap-1.5">
          {CARS.slice(0, 8).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                audio.uiClick();
                setSeed(String(i + 1));
              }}
              aria-label={`Avatar style ${i + 1}`}
              className={clsx('h-6 w-6 rounded-lg border transition-all', Number(avatarSeed) === i + 1 ? 'scale-110 border-neon-cyan' : 'border-white/20 opacity-60 hover:opacity-100')}
              style={{ background: `hsl(${(i * 45) % 360} 80% 55%)` }}
            />
          ))}
        </div>
      </div>
      <Field label="Username" error={errors.username}>
        <input className="input-field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" aria-label="Username" />
      </Field>
      <Field label="Email" error={errors.email}>
        <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-label="Email" />
      </Field>
      <Field label="Password" error={errors.password}>
        <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-label="Password" />
      </Field>
      {password && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= str.score ? str.color : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: str.color }}>{str.label}</span>
        </div>
      )}
      <Field label="Confirm Password" error={errors.confirmPassword}>
        <input className="input-field" type="password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-label="Confirm password" />
      </Field>
      {errors.form && <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">{errors.form}</div>}
      <NeonButton variant="primary" className="mt-6 w-full" disabled={busy} type="submit">
        {busy ? 'Creating account…' : 'Create Account'}
      </NeonButton>
      <p className="mt-3 text-center text-[11px] text-slate-500">
        Passwords are hashed with bcrypt — never stored in plain text.
      </p>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="field-label">{label}</label>
      {children}
      {error && <div className="field-error" role="alert">{error}</div>}
    </div>
  );
}
