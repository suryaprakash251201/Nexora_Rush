import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'node:http';
import { config } from './config.js';
import { csrfGuard, parseCookies, verifyAccessToken, COOKIE } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './auth/routes.js';
import { carsRouter, tracksRouter } from './routes/catalog.js';
import { profileRouter } from './routes/profile.js';
import { racesRouter } from './routes/races.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { achievementsRouter } from './routes/achievements.js';
import { setupWebsocket } from './websocket/index.js';
import type { Request } from 'express';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
// CORS: exact allow-list in production; in development also allow loopback and
// LAN origins (same machine reached via its network IP, e.g. phones/tablets).
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === config.clientUrl) return cb(null, true);
      if (!config.isProd && isLocalOrigin(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'), false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '256kb' }));

// Attach auth user (if any) for optional-auth endpoints.
app.use((req, _res, next) => {
  const token = parseCookies(req as Request)[COOKIE.access];
  if (token) {
    const user = verifyAccessToken(token);
    if (user) req.authUser = user;
  }
  next();
});

// Global rate limit + stricter auth limit.
app.use(
  '/api',
  rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false })
);
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes.', code: 'RATE_LIMITED' },
});

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'nexora-rush-api' }));

app.use('/api/auth', authLimiter, csrfGuard, authRouter);
app.use('/api/cars', carsRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/profile', profileRouter);
app.use('/api/races', csrfGuard, racesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/achievements', csrfGuard, achievementsRouter);

app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
setupWebsocket(server);

/** Loopback + RFC1918 LAN origins (dev convenience for LAN-device testing). */
function isLocalOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
    const parts = h.split('.').map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 192 && b === 168) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
    }
    if (h.endsWith('.local') || h.endsWith('.lan')) return true;
    return false;
  } catch {
    return false;
  }
}

server.listen(config.port, () => {
  console.log(`🏁 Nexora Rush API listening on http://localhost:${config.port}`);
});
