import { prisma } from '../db.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  ACHIEVEMENTS,
  CARS,
  TRACKS,
  calculateScore,
  calculateXp,
  clampEvents,
  levelFromXp,
  carTopSpeedKmh,
  getCar,
  getTrack,
} from 'shared';
import type {
  CarDef,
  PlayerAggregate,
  PlayerStats,
  PublicUser,
  RaceHistoryEntry,
  TrackDef,
  UserProfile,
  RaceFinishResponse,
  Difficulty,
  RaceMode,
} from 'shared';
import type { RaceFinishInput } from '../validation.js';

// ---------------------------------------------------------------------------
// Aggregated profile / stats
// ---------------------------------------------------------------------------

function aggregateToStats(row: {
  _count: { id: number };
  _sum: { score: number | null; distanceKm: number | null; driftPoints: number | null };
  _max: { score: number | null; topSpeedKmh: number | null };
  _min: { bestLapMs: number | null };
  wins: number;
  podiums: number;
  perfect: number;
  distinctTracks: number;
}): PlayerStats {
  return {
    totalRaces: row._count.id,
    wins: row.wins,
    podiums: row.podiums,
    totalScore: row._sum.score ?? 0,
    bestScore: row._max.score ?? 0,
    bestLapMs: row._min.bestLapMs ?? null,
    totalDistanceKm: Math.round((row._sum.distanceKm ?? 0) * 10) / 10,
    totalDriftPoints: row._sum.driftPoints ?? 0,
    nitroUses: 0, // filled by caller when cheap; otherwise approximated below
    topSpeedKmh: Math.round(row._max.topSpeedKmh ?? 0),
    winStreak: 0,
    perfectRaces: row.perfect,
    championshipsWon: 0,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'INVALID_ACCOUNT', 'Account not found');

  const [agg, recent, carUses, trackUses, unlocked, champWins, nitroAgg] = await Promise.all([
    prisma.raceResult.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { score: true, distanceKm: true, driftPoints: true },
      _max: { score: true, topSpeedKmh: true },
      _min: { bestLapMs: true },
    }),
    prisma.raceResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { track: true, car: true },
    }),
    prisma.raceResult.groupBy({ by: ['carId'], where: { userId }, _count: { carId: true } }),
    prisma.raceResult.groupBy({ by: ['trackId'], where: { userId }, _count: { trackId: true } }),
    prisma.raceResult.findMany({ where: { userId }, select: { trackId: true, carId: true }, distinct: ['trackId'] }),
    prisma.championship.aggregate({ where: { userId, status: 'complete', wins: { gte: 2 } }, _count: { id: true } }),
    prisma.raceResult.aggregate({ where: { userId }, _sum: { nitroChains: true } }),
  ]);

  const wins = await prisma.raceResult.count({ where: { userId, position: 1 } });
  const podiums = await prisma.raceResult.count({ where: { userId, position: { lte: 3 } } });
  const perfect = await prisma.raceResult.count({ where: { userId, finished: true, collisions: 0 } });
  const distinctTracks = await prisma.raceResult.groupBy({
    by: ['trackId'],
    where: { userId },
    _count: { trackId: true },
  });

  const stats: PlayerStats = {
    totalRaces: agg._count.id,
    wins,
    podiums,
    totalScore: agg._sum.score ?? 0,
    bestScore: agg._max.score ?? 0,
    bestLapMs: agg._min.bestLapMs ?? null,
    totalDistanceKm: Math.round((agg._sum.distanceKm ?? 0) * 10) / 10,
    totalDriftPoints: agg._sum.driftPoints ?? 0,
    nitroUses: nitroAgg._sum.nitroChains ?? 0,
    topSpeedKmh: Math.round(agg._max.topSpeedKmh ?? 0),
    winStreak: user.winStreak,
    perfectRaces: perfect,
    championshipsWon: user.championshipWins,
  };

  const favoriteCar =
    carUses.sort((a, b) => b._count.carId - a._count.carId)[0]?.carId ?? null;
  const favoriteTrack =
    trackUses.sort((a, b) => b._count.trackId - a._count.trackId)[0]?.trackId ?? null;

  const level = levelFromXp(user.xp);
  const unlockedCars = CARS.filter((c) => c.unlockLevel <= level).map((c) => c.id);
  const unlockedTracks = TRACKS.filter((t) => t.unlockLevel <= level).map((t) => t.id);

  const userAch = await prisma.userAchievement.findMany({ where: { userId } });

  const globalRank = await getUserGlobalRank(userId);

  return {
    ...toPublicUser(user),
    stats,
    unlockedCars,
    unlockedTracks,
    favoriteCar,
    favoriteTrack,
    globalRank,
    recentRaces: recent.map(historyEntry),
    achievements: userAch.map((a) => ({ id: a.achievementId, unlockedAt: a.unlockedAt.toISOString() })),
  };
}

function toPublicUser(u: { id: string; username: string; email: string; avatarSeed: string; xp: number; createdAt: Date }): PublicUser {
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

function historyEntry(r: {
  id: string; trackId: string; carId: string; mode: string; difficulty: string;
  score: number; position: number; grid: number; raceTimeMs: number | null;
  bestLapMs: number | null; createdAt: Date; track: { name: string }; car: { name: string };
}): RaceHistoryEntry {
  return {
    id: r.id,
    trackId: r.trackId,
    trackName: r.track.name,
    carId: r.carId,
    carName: r.car.name,
    mode: r.mode as RaceMode,
    difficulty: r.difficulty as Difficulty,
    score: r.score,
    position: r.position,
    grid: r.grid,
    raceTimeMs: r.raceTimeMs,
    bestLapMs: r.bestLapMs,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getUserGlobalRank(userId: string): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt FROM (
      SELECT DISTINCT ON ("userId") "userId", score FROM "RaceResult"
      ORDER BY "userId", score DESC
    ) ranked
    WHERE ranked.score > (
      SELECT COALESCE(MAX(score), 0) FROM "RaceResult" WHERE "userId" = ${userId}
    )`;
  const cnt = Number(rows[0]?.cnt ?? 0);
  return cnt + 1;
}

// ---------------------------------------------------------------------------
// Applying a validated race result: score, XP, unlocks, achievements, streaks.
// ---------------------------------------------------------------------------

export interface AppliedRace {
  response: RaceFinishResponse;
}

export async function applyRaceResult(
  userId: string,
  race: { id: string; startedAt: Date },
  input: RaceFinishInput
): Promise<AppliedRace> {
  const track = getTrack(input.trackId) as TrackDef;
  const car = getCar(input.carId) as CarDef;
  if (!track || !car) throw new ApiError(400, 'INVALID_TRACK', 'Invalid track/car combination');

  const events = clampEvents(input.events);
  const isFastLap =
    events.bestLapMs != null &&
    events.lapTimesMs.length > 0 &&
    events.bestLapMs <= Math.min(...events.lapTimesMs) &&
    events.lapTimesMs.every((t) => t >= events.bestLapMs! - 1);

  const score = calculateScore({
    track,
    mode: input.mode,
    difficulty: input.difficulty,
    position: input.position,
    grid: input.grid,
    raceTimeMs: input.raceTimeMs,
    isFastLap,
    events,
    finished: input.finished,
  });

  const xpEarned = calculateXp({
    score,
    position: input.position,
    grid: input.grid,
    mode: input.mode,
    isFastLap,
  });

  const result = await prisma.$transaction(async (tx) => {
    const userBefore = await tx.user.findUnique({ where: { id: userId } });
    if (!userBefore) throw new ApiError(404, 'INVALID_ACCOUNT', 'Account not found');
    const levelBefore = levelFromXp(userBefore.xp);

    // Personal best BEFORE this race (for "NEW PERSONAL BEST" flag).
    const prevBest = await tx.raceResult.aggregate({
      where: { userId, score: { gt: 0 } },
      _max: { score: true },
    });
    const previousBest = prevBest._max.score ?? 0;

    // Win streak
    const newStreak = input.finished && input.position === 1 ? userBefore.winStreak + 1 : 0;

    const userAfter = await tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xpEarned }, winStreak: newStreak },
    });

    await tx.race.update({
      where: { id: race.id },
      data: { status: 'finished', finishedAt: new Date() },
    });

    const saved = await tx.raceResult.create({
      data: {
        raceId: race.id,
        userId,
        trackId: input.trackId,
        carId: input.carId,
        mode: input.mode,
        difficulty: input.difficulty,
        laps: input.laps,
        weather: input.weather,
        timeOfDay: input.timeOfDay,
        score,
        position: input.position,
        grid: input.grid,
        raceTimeMs: input.raceTimeMs != null ? Math.round(input.raceTimeMs) : null,
        bestLapMs: events.bestLapMs != null ? Math.round(events.bestLapMs) : null,
        driftPoints: events.driftPoints,
        overtakes: events.overtakes,
        nearMisses: events.nearMisses,
        nitroChains: events.nitroChains,
        collisions: events.collisions,
        topSpeedKmh: events.topSpeedKmh,
        distanceKm: input.distanceKm,
        finished: input.finished,
        xpEarned,
      },
    });

    // Usage bookkeeping (favorites)
    await tx.userCar.upsert({
      where: { userId_carId: { userId, carId: input.carId } },
      create: { userId, carId: input.carId, uses: 1, lastUsedAt: new Date() },
      update: { uses: { increment: 1 }, lastUsedAt: new Date() },
    });
    await tx.userTrack.upsert({
      where: { userId_trackId: { userId, trackId: input.trackId } },
      create: { userId, trackId: input.trackId, uses: 1, lastUsedAt: new Date() },
      update: { uses: { increment: 1 }, lastUsedAt: new Date() },
    });

    // Championship round bookkeeping
    const raceRow = await tx.race.findUnique({ where: { id: race.id } });
    if (raceRow?.championshipId) {
      const champ = await tx.championship.findUnique({ where: { id: raceRow.championshipId } });
      if (champ && champ.status === 'active') {
        await tx.championshipEntry.create({
          data: {
            championshipId: champ.id,
            round: champ.round + 1,
            raceResultId: saved.id,
            points: score,
            position: input.position,
          },
        });
        const round = champ.round + 1;
        const wins = champ.wins + (input.position === 1 && input.finished ? 1 : 0);
        const complete = round >= champ.trackIds.length;
        await tx.championship.update({
          where: { id: champ.id },
          data: { round, wins, points: { increment: score }, status: complete ? 'complete' : 'active' },
        });
        if (complete && wins >= 2) {
          await tx.user.update({ where: { id: userId }, data: { championshipWins: { increment: 1 } } });
        }
      }
    }

    // Achievements — evaluate full aggregate after this race.
    const [agg, winsC, perfectC, distinctT, champWon, nitroSum] = await Promise.all([
      tx.raceResult.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { score: true, driftPoints: true },
        _max: { score: true, topSpeedKmh: true },
        _min: { bestLapMs: true },
      }),
      tx.raceResult.count({ where: { userId, position: 1 } }),
      tx.raceResult.count({ where: { userId, finished: true, collisions: 0 } }),
      tx.raceResult.groupBy({ by: ['trackId'], where: { userId }, _count: { trackId: true } }),
      tx.user.findUnique({ where: { id: userId } }),
      tx.raceResult.aggregate({ where: { userId }, _sum: { nitroChains: true } }),
    ]);

    const aggregate: PlayerAggregate = {
      races: agg._count.id,
      wins: winsC,
      totalScore: agg._sum.score ?? 0,
      bestScore: agg._max.score ?? 0,
      bestLapMs: agg._min.bestLapMs ?? null,
      topSpeedKmh: agg._max.topSpeedKmh ?? 0,
      totalDriftPoints: agg._sum.driftPoints ?? 0,
      nitroUses: nitroSum._sum.nitroChains ?? 0,
      perfectRaces: perfectC,
      distinctTracks: distinctT.length,
      championshipsWon: champWon?.championshipWins ?? 0,
      winStreak: newStreak,
    };

    const existing = await tx.userAchievement.findMany({ where: { userId } });
    const have = new Set(existing.map((a) => a.achievementId));
    const newlyUnlocked = ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(aggregate));
    if (newlyUnlocked.length > 0) {
      await tx.userAchievement.createMany({
        data: newlyUnlocked.map((a) => ({ userId, achievementId: a.id })),
      });
      const bonusXp = newlyUnlocked.reduce((s, a) => s + a.xp, 0);
      await tx.user.update({ where: { id: userId }, data: { xp: { increment: bonusXp } } });
    }

    const levelAfter = levelFromXp(userAfter.xp + (newlyUnlocked.reduce((s, a) => s + a.xp, 0)));
    const unlockedCars: CarDef[] = CARS.filter(
      (c) => c.unlockLevel > levelBefore && c.unlockLevel <= levelAfter
    );
    const unlockedTracks: TrackDef[] = TRACKS.filter(
      (t) => t.unlockLevel > levelBefore && t.unlockLevel <= levelAfter
    );

    const globalRank = await getUserGlobalRank(userId);

    return {
      score,
      xpEarned: xpEarned + newlyUnlocked.reduce((s, a) => s + a.xp, 0),
      level: levelAfter,
      xp: userAfter.xp + newlyUnlocked.reduce((s, a) => s + a.xp, 0),
      leveledUp: levelAfter > levelBefore,
      isPersonalBest: score > previousBest,
      unlockedAchievements: newlyUnlocked,
      unlockedCars,
      unlockedTracks,
      personalBestScore: Math.max(previousBest, score),
      globalRank,
      savedId: saved.id,
    };
  });

  return { response: result };
}

// ---------------------------------------------------------------------------
// Daily challenge
// ---------------------------------------------------------------------------

export function dailyTrackFor(dateKey: string): { trackId: string; difficulty: Difficulty; laps: number } {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  const unlockedByLevel = TRACKS; // daily always picks from full list, level-gated client-side
  const track = unlockedByLevel[h % unlockedByLevel.length];
  const diffs: Difficulty[] = ['normal', 'hard', 'hard', 'expert'];
  return {
    trackId: track.id,
    difficulty: diffs[h % diffs.length],
    laps: 2 + (h % 2),
  };
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
