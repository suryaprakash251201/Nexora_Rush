import { Router } from 'express';
import { Prisma } from '@prisma/client';
import type { LeaderboardEntry, LeaderboardResponse } from 'shared';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const leaderboardRouter = Router();

interface RawResult {
  id: string;
  userId: string;
  score: number;
  carId: string;
  trackId: string;
  raceTimeMs: number | null;
  bestLapMs: number | null;
  createdAt: Date;
  username: string;
  avatarSeed: string;
  xp: number;
  carName: string;
  trackName: string;
}

function sinceFor(period: 'global' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  if (period === 'weekly') {
    const d = new Date(now);
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'monthly') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
  return new Date(0);
}

const BEST_PER_USER = (since: Date, trackId?: string) => Prisma.sql`
  SELECT * FROM (
    SELECT DISTINCT ON (rr."userId")
      rr.id, rr."userId", rr.score, rr."carId", rr."trackId", rr."raceTimeMs",
      rr."bestLapMs", rr."createdAt",
      u.username, u."avatarSeed", u.xp,
      c.name AS "carName", t.name AS "trackName"
    FROM "RaceResult" rr
    JOIN "User" u ON u.id = rr."userId"
    JOIN "Car" c ON c.id = rr."carId"
    JOIN "Track" t ON t.id = rr."trackId"
    WHERE rr."createdAt" >= ${since}
    ${trackId ? Prisma.sql`AND rr."trackId" = ${trackId}` : Prisma.empty}
    ORDER BY rr."userId", rr.score DESC, rr."createdAt" ASC
  ) ranked
  ORDER BY ranked.score DESC, ranked."createdAt" ASC
  LIMIT 50`;

function toEntry(row: RawResult, rank: number): LeaderboardEntry {
  return {
    rank,
    userId: row.userId,
    username: row.username,
    avatarSeed: row.avatarSeed,
    level: 0, // filled below
    score: row.score,
    carId: row.carId,
    carName: row.carName,
    trackId: row.trackId,
    trackName: row.trackName,
    raceTimeMs: row.raceTimeMs,
    bestLapMs: row.bestLapMs,
    createdAt: row.createdAt.toISOString(),
  };
}

async function queryBoard(period: 'global' | 'weekly' | 'monthly', trackId?: string) {
  const rows = await prisma.$queryRaw<RawResult[]>(BEST_PER_USER(sinceFor(period), trackId));
  const entries = rows.map((r, i) => {
    const e = toEntry(r, i + 1);
    e.level = Math.floor(1 + Math.log10(1 + r.xp) * 12); // cheap display level
    e.level = Math.max(1, e.level);
    return e;
  });
  return entries;
}

leaderboardRouter.get('/:period', async (req, res, next) => {
  try {
    const period = req.params.period as 'global' | 'weekly' | 'monthly' | 'track';
    if (!['global', 'weekly', 'monthly', 'track'].includes(period)) {
      return res.status(400).json({ error: 'Unknown leaderboard period', code: 'VALIDATION' });
    }
    const trackId = period === 'track' ? String(req.query.trackId ?? '') : undefined;
    if (period === 'track' && !trackId) {
      return res.status(400).json({ error: 'trackId is required', code: 'VALIDATION' });
    }
    // Auth is optional here: the global middleware attaches req.authUser when
    // a session cookie is present.
    const authUser = req.authUser;

    const entries = await queryBoard(
      period === 'track' ? 'global' : period,
      period === 'track' ? trackId : undefined
    );

    let userRank: number | null = null;
    if (authUser) {
      const mine = entries.find((e) => e.userId === authUser.uid);
      userRank = mine?.rank ?? null;
      if (!userRank) {
        // Count distinct users with a better best score than ours.
        const best = await prisma.raceResult.aggregate({
          where: { userId: authUser.uid, ...(trackId ? { trackId } : {}) },
          _max: { score: true },
        });
        const myBest = best._max.score ?? 0;
        if (myBest > 0) {
          const better = await prisma.$queryRaw<{ cnt: bigint }[]>(Prisma.sql`
            SELECT COUNT(DISTINCT "userId") AS cnt FROM "RaceResult"
            WHERE "createdAt" >= ${sinceFor(period === 'track' ? 'global' : period)}
            ${trackId ? Prisma.sql`AND "trackId" = ${trackId}` : Prisma.empty}
            AND score > ${myBest}`);
          userRank = Number(better[0]?.cnt ?? 0) + 1;
        }
      }
    }

    const body: LeaderboardResponse = {
      entries,
      total: entries.length,
      userRank,
    };
    res.json(body);
  } catch (e) {
    next(e);
  }
});
