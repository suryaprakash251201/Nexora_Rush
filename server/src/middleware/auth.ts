import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config, COOKIE, ACCESS_TOKEN_TTL_H } from '../config.js';
import { prisma } from '../db.js';
import crypto from 'node:crypto';

export interface AuthUser {
  uid: string;
  username: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser;
  }
}

export { COOKIE, ACCESS_TOKEN_TTL_H };

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: `${ACCESS_TOKEN_TTL_H}h` });
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    if (!payload?.uid) return null;
    return { uid: payload.uid, username: payload.username };
  } catch {
    return null;
  }
}

// Minimal cookie helpers (avoid extra dependency, keep deps small).
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function setCookie(res: Response, name: string, value: string, maxAgeSeconds: number) {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${COOKIE.base.path}`,
    'HttpOnly',
    `SameSite=${COOKIE.base.sameSite}`,
  ];
  if (COOKIE.base.secure) attrs.push('Secure');
  if (maxAgeSeconds > 0) attrs.push(`Max-Age=${maxAgeSeconds}`);
  const existing = res.getHeader('Set-Cookie') as string | string[] | number | undefined;
  const arr = existing ? (Array.isArray(existing) ? existing : [String(existing)]) : [];
  res.setHeader('Set-Cookie', [...arr, attrs.join('; ')]);
}

export function clearCookie(res: Response, name: string) {
  setCookie(res, name, '', 0);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE.access];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated', code: 'NO_AUTH' });
  }
  const user = verifyAccessToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' });
  }
  req.authUser = user;
  next();
}

/** Lightweight CSRF defense: mutating requests must carry our custom header,
 *  which cannot be attached cross-origin by a plain form post. */
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Bad request origin', code: 'CSRF' });
  }
  next();
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
