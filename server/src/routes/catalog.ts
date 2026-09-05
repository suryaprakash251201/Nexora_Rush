import { Router } from 'express';
import { CARS, TRACKS, carTopSpeedKmh } from 'shared';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const carsRouter = Router();
export const tracksRouter = Router();

carsRouter.get('/', async (req, res, next) => {
  try {
    let unlockedIds: string[] | null = null;
    if (req.authUser) {
      const user = await prisma.user.findUnique({ where: { id: req.authUser.uid } });
      if (user) {
        const { levelFromXp } = await import('shared');
        const lvl = levelFromXp(user.xp);
        unlockedIds = CARS.filter((c) => c.unlockLevel <= lvl).map((c) => c.id);
      }
    }
    res.json({
      cars: CARS.map((c) => ({ ...c, topSpeedKmh: Math.round(carTopSpeedKmh(c)) })),
      unlocked: unlockedIds,
    });
  } catch (e) {
    next(e);
  }
});

tracksRouter.get('/', async (req, res, next) => {
  try {
    let unlockedIds: string[] | null = null;
    if (req.authUser) {
      const user = await prisma.user.findUnique({ where: { id: req.authUser.uid } });
      if (user) {
        const { levelFromXp } = await import('shared');
        const lvl = levelFromXp(user.xp);
        unlockedIds = TRACKS.filter((t) => t.unlockLevel <= lvl).map((t) => t.id);
      }
    }
    res.json({ tracks: TRACKS, unlocked: unlockedIds });
  } catch (e) {
    next(e);
  }
});

// Guards for other routers to reuse.
export { requireAuth };
