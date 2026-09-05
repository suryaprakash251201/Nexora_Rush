import { Router } from 'express';
import crypto from 'node:crypto';
import { ApiError } from '../middleware/errorHandler.js';
import { clearCookie, hashToken, parseCookies, setCookie, signAccessToken, verifyAccessToken } from '../middleware/auth.js';
import { COOKIE, ACCESS_TOKEN_TTL_H } from '../config.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { loginSchema, registerSchema } from '../validation.js';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { levelFromXp } from 'shared';

export const authRouter = Router();

const REFRESH_REMEMBER_S = 30 * 24 * 3600;
const REFRESH_S = 24 * 3600;

async function issueSession(userId: string, username: string, remember: boolean, res: import('express').Response) {
  const accessToken = signAccessToken({ uid: userId, username });
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  const ttl = remember ? REFRESH_REMEMBER_S : REFRESH_S;
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      remember,
      expiresAt: new Date(Date.now() + ttl * 1000),
    },
  });
  setCookie(res, COOKIE.access, accessToken, remember ? REFRESH_REMEMBER_S : ACCESS_TOKEN_TTL_H * 3600);
  setCookie(res, COOKIE.refresh, refreshToken, ttl);
}

function publicUser(u: { id: string; username: string; email: string; avatarSeed: string; xp: number; createdAt: Date }) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatarSeed: u.avatarSeed,
    level: levelFromXp(u.xp),
    xp: u.xp,
    createdAt: u.createdAt.toISOString(),
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const [usernameTaken, emailTaken] = await Promise.all([
      prisma.user.findUnique({ where: { username: data.username } }),
      prisma.user.findUnique({ where: { email: data.email } }),
    ]);
    if (usernameTaken) {
      throw new ApiError(409, 'VALIDATION', 'Please check the highlighted fields.', {
        username: 'That username is already taken',
      });
    }
    if (emailTaken) {
      throw new ApiError(409, 'VALIDATION', 'Please check the highlighted fields.', {
        email: 'An account with that email already exists',
      });
    }
    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        avatarSeed: data.avatarSeed ?? String(1 + ((data.username.length * 7) % 8)),
      },
    });
    await issueSession(user.id, user.username, false, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const identifier = data.identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }, { username: data.identifier }] },
    });
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect username or password.');
    }
    await issueSession(user.id, user.username, data.remember, res);
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const refresh = cookies[COOKIE.refresh];
    if (refresh) {
      await prisma.session.updateMany({
        where: { tokenHash: hashToken(refresh) },
        data: { revoked: true },
      });
    }
    clearCookie(res, COOKIE.access);
    clearCookie(res, COOKIE.refresh);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const refresh = cookies[COOKIE.refresh];
    if (!refresh) throw new ApiError(401, 'NO_AUTH', 'Not authenticated');
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(refresh) },
      include: { user: true },
    });
    if (!session || session.revoked || session.expiresAt < new Date()) {
      throw new ApiError(401, 'SESSION_EXPIRED', 'Session expired. Please log in again.');
    }
    await issueSession(session.userId, session.user.username, session.remember, res);
    res.json({ user: publicUser(session.user) });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies[COOKIE.access];
    if (!token) return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
    const payload = verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) return res.status(401).json({ error: 'Account not found', code: 'INVALID_ACCOUNT' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});
