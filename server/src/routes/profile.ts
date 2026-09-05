import { Router } from 'express';
import { getUserProfile } from '../services/player.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../db.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get('/', async (req, res, next) => {
  try {
    res.json(await getUserProfile(req.authUser!.uid));
  } catch (e) {
    next(e);
  }
});

profileRouter.get('/stats', async (req, res, next) => {
  try {
    const profile = await getUserProfile(req.authUser!.uid);
    res.json({ stats: profile.stats, level: profile.level, xp: profile.xp });
  } catch (e) {
    next(e);
  }
});

profileRouter.get('/achievements', async (req, res, next) => {
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

profileRouter.patch('/settings', async (req, res, next) => {
  try {
    const settings = req.body ?? {};
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Invalid settings payload', code: 'VALIDATION' });
    }
    await prisma.user.update({ where: { id: req.authUser!.uid }, data: { settings } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
