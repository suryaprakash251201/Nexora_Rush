import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/api';
import { Btn, Logo } from '@/ui/kit';
import { sound } from '@/sim/audio';

const SEEDS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>(params.get('signup') ? 'signup' : 'login');
  const auth = useAuth();
  const navigate = useNavigate();
  const from = (window.history.state as any)?.usr?.from ?? '/dashboard';

  useEffect(() => {
    if (auth.user) navigate(from, { replace: true });
  }, [auth.user, from, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04060c] px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="panel-solid relative z-10 w-full max-w-md p-8">
        <div className="mb-8 flex items-center gap-3">
          <Logo />
          <div>
            <div className="font-display text-lg font-black tracking-widest text-white">
              NEXORA<span className="text-cyan-300">RUSH</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
              {mode === 'login' ? 'Welcome back, racer' : 'Join the grid'}
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1" role="tablist">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                sound.unlock();
                sound.click();
                setMode(m);
              }}
              className={clsx(
                'rounded-lg py-2 font-display text-xs font-bold uppercase tracking-widest transition-colors',
                mode === m ? 'bg-cyan-300/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {m === 'login' ? 'Log In' : 'Create Account'}
            </button>
          ))}
        </div>

        {mode === 'login' ? <LoginForm /> : <SignupForm />}

        {auth.error && (
          <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200">
            {auth.error}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/demo" className="text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-cyan-300">
            or try the guest demo →
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function LoginForm() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (id.trim().length < 3) er.id = 'Enter your username or email';
    if (!pw) er.pw = 'Enter your password';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await login(id.trim(), pw, remember);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrs(e.fields);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Username or Email" err={errs.id}>
        <input className="field" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" aria-label="Username or email" />
      </Field>
      <Field label="Password" err={errs.pw}>
        <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" aria-label="Password" />
      </Field>
      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-cyan-300" />
        Remember me on this device
      </label>
      <Btn kind="primary" className="mt-6 w-full" disabled={busy} type="submit">
        {busy ? 'Signing in…' : 'Log In'}
      </Btn>
    </form>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong', 'Elite'];
  const colors = ['#f43f5e', '#f43f5e', '#fbbf24', '#fbbf24', '#34d399', '#22d3ee'];
  return { s, label: labels[s], color: colors[s] };
}

function SignupForm() {
  const register = useAuth((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [seed, setSeed] = useState(String(1 + Math.floor(Math.random() * 8)));
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const st = strength(pw);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (name.trim().length < 3) er.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) er.username = 'Letters, numbers, _ and - only';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) er.email = 'Enter a valid email address';
    if (pw.length < 8) er.password = 'Password must be at least 8 characters';
    else if (!/[a-zA-Z]/.test(pw)) er.password = 'Password must contain a letter';
    else if (!/[0-9]/.test(pw)) er.password = 'Password must contain a digit';
    if (pw !== pw2) er.confirmPassword = 'Passwords do not match';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await register({ username: name.trim(), email: email.trim(), password: pw, confirmPassword: pw2, avatarSeed: seed });
      navigate('/dashboard', { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrs(e.fields);
      else if (e instanceof ApiError) setErrs({ form: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg font-black text-[#031018]"
          style={{ background: `linear-gradient(135deg, hsl(${(Number(seed) * 45) % 360} 85% 60%), hsl(${(Number(seed) * 45 + 40) % 360} 85% 45%))` }}
        >
          {name.slice(0, 2).toUpperCase() || '??'}
        </div>
        <div className="flex gap-1.5">
          {SEEDS.map((sd) => (
            <button
              key={sd}
              type="button"
              aria-label={`Avatar ${sd}`}
              onClick={() => {
                sound.click();
                setSeed(sd);
              }}
              className={clsx('h-6 w-6 rounded-lg border transition-all', seed === sd ? 'scale-110 border-cyan-300' : 'border-white/20 opacity-60 hover:opacity-100')}
              style={{ background: `hsl(${(Number(sd) * 45) % 360} 80% 55%)` }}
            />
          ))}
        </div>
      </div>
      <Field label="Username" err={errs.username}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" aria-label="Username" />
      </Field>
      <Field label="Email" err={errs.email}>
        <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-label="Email" />
      </Field>
      <Field label="Password" err={errs.password}>
        <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" aria-label="Password" />
      </Field>
      {pw && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= st.s ? st.color : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: st.color }}>{st.label}</span>
        </div>
      )}
      <Field label="Confirm Password" err={errs.confirmPassword}>
        <input className="field" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" aria-label="Confirm password" />
      </Field>
      {errs.form && <div className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">{errs.form}</div>}
      <Btn kind="primary" className="mt-6 w-full" disabled={busy} type="submit">
        {busy ? 'Creating account…' : 'Create Account'}
      </Btn>
    </form>
  );
}

function Field({ label, err, children }: { label: string; err?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="flabel">{label}</label>
      {children}
      {err && (
        <div className="ferror" role="alert">
          {err}
        </div>
      )}
    </div>
  );
}
