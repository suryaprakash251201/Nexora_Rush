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
app.use(
  cors({
    origin: [config.clientUrl],
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

server.listen(config.port, () => {
  console.log(`🏁 Nexora Rush API listening on http://localhost:${config.port}`);
});
