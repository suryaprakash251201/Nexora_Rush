import { Router } from 'express';
import {
  getCar,
  getTrack,
  levelFromXp,
  carTopSpeedKmh,
  validateRaceResult,
  type RaceFinishResponse,
} from 'shared';
import { prisma } from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { raceFinishSchema, raceStartSchema, type RaceFinishInput } from '../validation.js';
import { applyRaceResult, dailyTrackFor, todayKey } from '../services/player.js';

export const racesRouter = Router();

racesRouter.use(requireAuth);

const MAX_RACE_WINDOW_MS = 45 * 60 * 1000; // a race session expires after 45 min

/** POST /api/races/start — opens a server-side race session. */
racesRouter.post('/start', async (req, res, next) => {
  try {
    const input = raceStartSchema.parse(req.body);
    const userId = req.authUser!.uid;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(401, 'INVALID_ACCOUNT', 'Account not found');
    const level = levelFromXp(user.xp);

    const track = getTrack(input.trackId);
    const car = getCar(input.carId);
    if (!track) throw new ApiError(400, 'INVALID_TRACK', 'Unknown track');
    if (!car) throw new ApiError(400, 'INVALID_CAR', 'Unknown car');
    if (car.unlockLevel > level) throw new ApiError(403, 'LOCKED', 'This car is not unlocked yet');
    // Daily challenge is a special event: the track is open to everyone that day.
    if (input.mode !== 'daily' && track.unlockLevel > level)
      throw new ApiError(403, 'LOCKED', 'This track is not unlocked yet');
    if (!track.weathers.includes(input.weather))
      throw new ApiError(400, 'INVALID_WEATHER', 'Weather not supported on this track');
    if (!track.timesOfDay.includes(input.timeOfDay))
      throw new ApiError(400, 'INVALID_TIME', 'Time of day not supported on this track');
    if (input.laps < 1 || input.laps > 6) throw new ApiError(400, 'VALIDATION', 'Laps out of range');

    if (input.mode === 'daily') {
      const daily = dailyTrackFor(todayKey());
      if (daily.trackId !== input.trackId)
        throw new ApiError(400, 'DAILY_MISMATCH', 'Daily challenge is on a different track today');
      const startOfDay = new Date(`${todayKey()}T00:00:00.000Z`);
      const already = await prisma.raceResult.findFirst({
        where: { userId, mode: 'daily', createdAt: { gte: startOfDay } },
      });
      if (already) {
        throw new ApiError(409, 'DAILY_DONE', 'You already completed today’s challenge. Come back tomorrow!');
      }
    }

    // Time-trial runs with no opponents: grid of 1.
    const race = await prisma.race.create({
      data: {
        userId,
        trackId: input.trackId,
        carId: input.carId,
        mode: input.mode,
        difficulty: input.difficulty,
        laps: input.mode === 'endless' ? 1 : input.laps,
        weather: input.weather,
        timeOfDay: input.timeOfDay,
      },
    });

    res.status(201).json({ raceId: race.id, startedAt: race.startedAt.toISOString() });
  } catch (e) {
    next(e);
  }
});

/** POST /api/races/finish — validates + persists a race result. */
racesRouter.post('/finish', async (req, res, next) => {
  try {
    const input = raceFinishSchema.parse(req.body);
    const userId = req.authUser!.uid;

    const race = await prisma.race.findUnique({ where: { id: input.raceId } });
    if (!race || race.userId !== userId) {
      throw new ApiError(404, 'INVALID_RACE', 'Race session not found');
    }
    if (race.status !== 'pending') {
      throw new ApiError(409, 'DUPLICATE_RACE', 'This race has already been submitted');
    }
    const startedMs = race.startedAt.getTime();
    if (Date.now() - startedMs > MAX_RACE_WINDOW_MS) {
      await prisma.race.update({ where: { id: race.id }, data: { status: 'expired' } });
      throw new ApiError(410, 'RACE_EXPIRED', 'Race session expired — result not saved');
    }

    // Config must match what the session was opened with.
    const configMismatch =
      race.trackId !== input.trackId ||
      race.carId !== input.carId ||
      race.mode !== input.mode ||
      race.difficulty !== input.difficulty ||
      race.laps !== input.laps ||
      race.weather !== input.weather ||
      race.timeOfDay !== input.timeOfDay;
    if (configMismatch) {
      throw new ApiError(400, 'CONFIG_MISMATCH', 'Race configuration mismatch');
    }

    const track = getTrack(input.trackId);
    const car = getCar(input.carId);
    if (!track || !car) throw new ApiError(400, 'INVALID_TRACK', 'Invalid track/car combination');

    // Wall-clock sanity: server observed elapsed time must not be far below the
    // reported race time (allows small clock drift / early finish reporting).
    const wallClock = Date.now() - startedMs;
    if (input.finished && input.raceTimeMs != null && input.raceTimeMs + 5000 < wallClock * 0.45) {
      throw new ApiError(400, 'TIME_TOO_FAST', 'Race time implausible');
    }

    const validation = validateRaceResult(
      {
        raceTimeMs: input.raceTimeMs,
        events: {
        overtakes: input.events.overtakes,
        nearMisses: input.events.nearMisses,
        driftPoints: input.events.driftPoints,
        nitroChains: input.events.nitroChains,
        topSpeedKmh: input.events.topSpeedKmh,
        collisions: input.events.collisions,
        bestLapMs: input.events.bestLapMs ?? null,
        lapTimesMs: input.events.lapTimesMs,
        checkpointTimestampsMs: input.events.checkpointTimestampsMs ?? [],
      },
        finished: input.finished,
        position: input.position,
        carTopSpeedKmh: carTopSpeedKmh(car),
      },
      { track, difficulty: input.difficulty, laps: input.laps, grid: input.grid }
    );
    if (!validation.valid) {
      await prisma.race.update({ where: { id: race.id }, data: { status: 'rejected' } });
      throw new ApiError(422, 'INVALID_RESULT', `Race result rejected (${validation.reason})`);
    }

    const { response } = await applyRaceResult(userId, race, input);
    res.json(response satisfies RaceFinishResponse);
  } catch (e) {
    next(e);
  }
});

/** GET /api/races/history */
racesRouter.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20) || 20, 50);
    const rows = await prisma.raceResult.findMany({
      where: { userId: req.authUser!.uid },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { track: true, car: true },
    });
    res.json({
      races: rows.map((r) => ({
        id: r.id,
        trackId: r.trackId,
        trackName: r.track.name,
        carId: r.carId,
        carName: r.car.name,
        mode: r.mode,
        difficulty: r.difficulty,
        score: r.score,
        position: r.position,
        grid: r.grid,
        raceTimeMs: r.raceTimeMs,
        bestLapMs: r.bestLapMs,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** GET /api/races/daily — today's challenge status. */
racesRouter.get('/daily', async (req, res, next) => {
  try {
    const key = todayKey();
    const daily = dailyTrackFor(key);
    const startOfDay = new Date(`${key}T00:00:00.000Z`);
    const done = await prisma.raceResult.findFirst({
      where: { userId: req.authUser!.uid, mode: 'daily', createdAt: { gte: startOfDay } },
    });
    res.json({
      available: !done,
      completedToday: !!done,
      trackId: daily.trackId,
      difficulty: daily.difficulty,
      laps: daily.laps,
      dateKey: key,
    });
  } catch (e) {
    next(e);
  }
});

/** POST /api/races/championship/start — create a 3-round championship. */
racesRouter.post('/championship/start', async (req, res, next) => {
  try {
    const userId = req.authUser!.uid;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(401, 'INVALID_ACCOUNT', 'Account not found');
    const level = levelFromXp(user.xp);

    const existing = await prisma.championship.findFirst({
      where: { userId, status: 'active' },
    });
    if (existing) {
      return res.json({ championshipId: existing.id, trackIds: existing.trackIds, round: existing.round });
    }

    const pool = (await import('shared')).TRACKS.filter((t) => t.unlockLevel <= level);
    const picks = shuffle(pool).slice(0, Math.min(3, pool.length)).map((t) => t.id);
    const champ = await prisma.championship.create({
      data: { userId, trackIds: picks },
    });
    res.status(201).json({ championshipId: champ.id, trackIds: champ.trackIds, round: 0 });
  } catch (e) {
    next(e);
  }
});

/** GET /api/races/championship — current active championship. */
racesRouter.get('/championship', async (req, res, next) => {
  try {
    const champ = await prisma.championship.findFirst({
      where: { userId: req.authUser!.uid, status: 'active' },
      include: { entries: true },
    });
    if (!champ) return res.json({ championship: null });
    res.json({
      championship: {
        id: champ.id,
        trackIds: champ.trackIds,
        round: champ.round,
        points: champ.points,
        wins: champ.wins,
        entries: champ.entries.map((e) => ({ round: e.round, points: e.points, position: e.position })),
      },
    });
  } catch (e) {
    next(e);
  }
});

/** POST /api/races/championship/link — attach an active championship to a race session. */
racesRouter.post('/championship/link', async (req, res, next) => {
  try {
    const raceId = String(req.body?.raceId ?? '');
    const userId = req.authUser!.uid;
    const champ = await prisma.championship.findFirst({ where: { userId, status: 'active' } });
    if (!champ) throw new ApiError(404, 'NO_CHAMPIONSHIP', 'No active championship');
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race || race.userId !== userId || race.status !== 'pending')
      throw new ApiError(404, 'INVALID_RACE', 'Race session not found');
    if (race.mode !== 'championship') throw new ApiError(400, 'VALIDATION', 'Race is not a championship round');
    if (!champ.trackIds.includes(race.trackId))
      throw new ApiError(400, 'VALIDATION', 'Track is not part of this championship');
    await prisma.race.update({ where: { id: race.id }, data: { championshipId: champ.id } });
    res.json({ ok: true, round: champ.round });
  } catch (e) {
    next(e);
  }
});

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
