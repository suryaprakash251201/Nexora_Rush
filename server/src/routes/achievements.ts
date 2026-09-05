import { Router } from 'express';
import { ACHIEVEMENTS } from 'shared';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const achievementsRouter = Router();

achievementsRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ achievements: ACHIEVEMENTS });
  } catch (e) {
    next(e);
  }
});

achievementsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.userAchievement.findMany({
      where: { userId: req.authUser!.uid },
      orderBy: { unlockedAt: 'desc' },
    });
    res.json({
      achievements: rows.map((r) => ({ id: r.achievementId, unlockedAt: r.unlockedAt.toISOString() })),
    });
  } catch (e) {
    next(e);
  }
});
