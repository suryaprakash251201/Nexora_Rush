import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-session-change-me'),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
};

export const COOKIE = {
  access: 'nr_access',
  refresh: 'nr_refresh',
  base: {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
};

export const ACCESS_TOKEN_TTL_H = 12;
