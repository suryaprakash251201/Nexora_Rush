/**
 * Seed: catalog (cars/tracks/achievements), optional admin from env,
 * and a handful of demo racers with genuine (stored) sample results so the
 * leaderboard isn't empty on first launch. All rows are real DB records.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ACHIEVEMENTS, CARS, TRACKS, carTopSpeedKmh } from 'shared';

const prisma = new PrismaClient();

async function main() {
  // ---- Catalog -------------------------------------------------------------
  for (const car of CARS) {
    await prisma.car.upsert({
      where: { id: car.id },
      create: {
        id: car.id,
        name: car.name,
        class: car.class,
        description: car.description,
        stats: car.stats as unknown as Record<string, number>,
        unlockLevel: car.unlockLevel,
      },
      update: {},
    });
  }
  for (const track of TRACKS) {
    await prisma.track.upsert({
      where: { id: track.id },
      create: {
        id: track.id,
        name: track.name,
        theme: track.theme,
        description: track.description,
        difficulty: track.difficulty,
        unlockLevel: track.unlockLevel,
        lengthKm: track.lengthKm,
        minLapSeconds: track.minLapSeconds,
        minRaceSeconds: track.minRaceSeconds,
        parRaceSeconds: track.parRaceSeconds,
      },
      update: {},
    });
  }
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      create: { id: a.id, name: a.name, description: a.description, icon: a.icon, xp: a.xp },
      update: {},
    });
  }
  console.log('✓ Catalog seeded');

  // ---- Optional admin (env only, never hard-coded) --------------------------
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    const username = (process.env.ADMIN_USERNAME ?? 'admin').slice(0, 20);
    await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      create: {
        email: process.env.ADMIN_EMAIL,
        username,
        passwordHash,
        xp: 999_999,
        avatarSeed: '8',
      },
      update: {},
    });
    console.log('✓ Admin account created from environment variables');
  }

  // ---- Demo racers + sample leaderboard entries -----------------------------
  const demoRacers = [
    { username: 'Nightwolf', car: 'inferno-x', track: 'city-rush', score: 21450, pos: 1, raceMs: 228_400, lapMs: 71_200 },
    { username: 'VortexQueen', car: 'apex-one', track: 'cyber-circuit', score: 20_310, pos: 1, raceMs: 336_100, lapMs: 82_400 },
    { username: 'DustDevil', car: 'phantom-gt', track: 'desert-storm', score: 18_900, pos: 1, raceMs: 268_500, lapMs: 84_900 },
    { username: 'GlacierX', car: 'velocity-r', track: 'arctic-run', score: 17_240, pos: 1, raceMs: 301_300, lapMs: 96_700 },
    { username: 'CoastKing', car: 'apex-one', track: 'tropical-coast', score: 19_880, pos: 1, raceMs: 305_900, lapMs: 96_100 },
    { username: 'Ridgeline', car: 'shadow-rs', track: 'mountain-pass', score: 18_310, pos: 1, raceMs: 312_600, lapMs: 98_800 },
    { username: 'TurboTom', car: 'thunder-gt', track: 'city-rush', score: 12_450, pos: 3, raceMs: 241_900, lapMs: 77_400 },
    { username: 'NeonNova', car: 'blaze-x', track: 'desert-storm', score: 11_300, pos: 4, raceMs: 284_200, lapMs: 91_300 },
    { username: 'Frostbite', car: 'street-hawk', track: 'arctic-run', score: 9_640, pos: 5, raceMs: 330_100, lapMs: 104_500 },
    { username: 'PalmPilot', car: 'thunder-gt', track: 'tropical-coast', score: 10_150, pos: 4, raceMs: 322_700, lapMs: 101_900 },
  ];

  let admin = await prisma.user.findUnique({ where: { username: 'demo-racers' } });
  for (const r of demoRacers) {
    let user = await prisma.user.findUnique({ where: { username: r.username } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          username: r.username,
          email: `${r.username.toLowerCase()}@demo.nexorarush.gg`,
          passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
          avatarSeed: String(1 + Math.floor(Math.random() * 8)),
          xp: 2_000 + r.score,
          winStreak: r.pos === 1 ? 2 : 0,
        },
      });
    }
    const exists = await prisma.raceResult.findFirst({
      where: { userId: user.id, score: r.score },
    });
    if (exists) continue;
    const race = await prisma.race.create({
      data: {
        userId: user.id,
        trackId: r.track,
        carId: r.car,
        mode: 'quick',
        difficulty: 'hard',
        laps: 3,
        weather: 'clear',
        timeOfDay: 'night',
        status: 'finished',
        finishedAt: new Date(),
      },
    });
    await prisma.raceResult.create({
      data: {
        raceId: race.id,
        userId: user.id,
        trackId: r.track,
        carId: r.car,
        mode: 'quick',
        difficulty: 'hard',
        laps: 3,
        weather: 'clear',
        timeOfDay: 'night',
        score: r.score,
        position: r.pos,
        grid: 8,
        raceTimeMs: r.raceMs,
        bestLapMs: r.lapMs,
        driftPoints: Math.round(r.score / 40),
        overtakes: 7 - r.pos,
        nearMisses: 3,
        nitroChains: 2,
        collisions: 0,
        topSpeedKmh: Math.round(carTopSpeedKmh(CARS.find((c) => c.id === r.car)!)),
        distanceKm: (TRACKS.find((t) => t.id === r.track)?.lengthKm ?? 3.5) * 3,
        finished: true,
        xpEarned: Math.round(r.score * 0.05),
      },
    });
  }
  console.log('✓ Demo racers seeded');
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
