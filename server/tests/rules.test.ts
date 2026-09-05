import { describe, expect, it } from 'vitest';
import { validateRaceResult, calculateScore, calculateXp, clampEvents } from 'shared';
import { getTrack, getCar } from 'shared';
import { carTopSpeedKmh } from 'shared';

const city = getTrack('city-rush')!;
const streetHawk = getCar('street-hawk')!;

const baseEvents = {
  overtakes: 2,
  nearMisses: 1,
  driftPoints: 500,
  nitroChains: 1,
  topSpeedKmh: 220,
  collisions: 0,
  bestLapMs: 70_000,
  lapTimesMs: [70_000, 71_000, 69_500],
  checkpointTimestampsMs: [],
};

function validFinish(overrides: Partial<Parameters<typeof validateRaceResult>[0]> = {}) {
  return validateRaceResult(
    {
      raceTimeMs: 211_000,
      events: baseEvents,
      finished: true,
      position: 1,
      carTopSpeedKmh: carTopSpeedKmh(streetHawk),
      ...overrides,
    },
    { track: city, difficulty: 'normal', laps: 3, grid: 8 }
  );
}

describe('anti-cheat validation', () => {
  it('accepts a plausible race result', () => {
    expect(validFinish().valid).toBe(true);
  });

  it('rejects impossible lap times', () => {
    const res = validFinish({
      events: { ...baseEvents, lapTimesMs: [1_000, 71_000, 69_500], bestLapMs: 1_000 },
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('impossible_lap_time');
  });

  it('rejects impossible top speeds', () => {
    const res = validFinish({
      events: { ...baseEvents, topSpeedKmh: 900 },
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('impossible_speed');
  });

  it('rejects lap count mismatch', () => {
    const res = validFinish({
      events: { ...baseEvents, lapTimesMs: [70_000, 71_000] },
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('lap_count_mismatch');
  });

  it('rejects race time below lap sum', () => {
    const res = validFinish({ raceTimeMs: 100_000 });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('race_time_inconsistent');
  });

  it('rejects invalid positions', () => {
    expect(validFinish({ position: 9 }).valid).toBe(false);
    expect(validFinish({ position: 0 }).valid).toBe(false);
  });

  it('rejects absurd drift points relative to race time', () => {
    const res = validFinish({
      events: { ...baseEvents, driftPoints: 100_000 },
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('impossible_events');
  });

  it('rejects too many overtakes', () => {
    const res = validFinish({
      events: { ...baseEvents, overtakes: 100 },
    });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('impossible_events');
  });

  it('rejects missing race time on finish', () => {
    const res = validFinish({ raceTimeMs: null });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('missing_race_time');
  });
});

describe('score calculation', () => {
  it('scores a 1st place higher than 4th', () => {
    const mk = (position: number) =>
      calculateScore({
        track: city,
        mode: 'quick',
        difficulty: 'normal',
        position,
        grid: 8,
        raceTimeMs: 211_000,
        isFastLap: true,
        events: baseEvents,
        finished: true,
      });
    expect(mk(1)).toBeGreaterThan(mk(4));
  });

  it('rewards clean racing', () => {
    const dirty = calculateScore({
      track: city, mode: 'quick', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 211_000, isFastLap: false,
      events: { ...baseEvents, collisions: 5 }, finished: true,
    });
    const clean = calculateScore({
      track: city, mode: 'quick', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 211_000, isFastLap: false, events: baseEvents, finished: true,
    });
    expect(clean - dirty).toBe(Math.round(2000 * 1.15));
  });

  it('applies difficulty multipliers', () => {
    const normal = calculateScore({
      track: city, mode: 'quick', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 211_000, isFastLap: false, events: baseEvents, finished: true,
    });
    const insane = calculateScore({
      track: city, mode: 'quick', difficulty: 'insane', position: 1, grid: 8,
      raceTimeMs: 211_000, isFastLap: false, events: baseEvents, finished: true,
    });
    expect(insane).toBeGreaterThan(normal);
  });

  it('gives partial credit for DNF', () => {
    const dnf = calculateScore({
      track: city, mode: 'quick', difficulty: 'normal', position: 8, grid: 8,
      raceTimeMs: null, isFastLap: false, events: baseEvents, finished: false,
    });
    expect(dnf).toBeGreaterThanOrEqual(0);
  });

  it('scales endless score with survival time', () => {
    const short = calculateScore({
      track: city, mode: 'endless', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 30_000, isFastLap: false, events: baseEvents, finished: false,
    });
    const long = calculateScore({
      track: city, mode: 'endless', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 120_000, isFastLap: false, events: baseEvents, finished: false,
    });
    expect(long).toBeGreaterThan(short);
  });
});

describe('xp calculation', () => {
  it('gives a win bonus', () => {
    const win = calculateXp({ score: 10_000, position: 1, grid: 8, mode: 'quick', isFastLap: false });
    const second = calculateXp({ score: 10_000, position: 2, grid: 8, mode: 'quick', isFastLap: false });
    expect(win).toBeGreaterThan(second);
  });

  it('never returns less than 10 xp', () => {
    const xp = calculateXp({ score: 0, position: 8, grid: 8, mode: 'quick', isFastLap: false });
    expect(xp).toBeGreaterThanOrEqual(10);
  });
});

describe('clampEvents', () => {
  it('clamps nonsense values', () => {
    const e = clampEvents({
      overtakes: 1e9, nearMisses: -5, driftPoints: 1e9, nitroChains: NaN as unknown as number,
      topSpeedKmh: 1e9, collisions: 1e9, bestLapMs: null, lapTimesMs: [], checkpointTimestampsMs: [],
    });
    expect(e.overtakes).toBe(40);
    expect(e.nearMisses).toBe(0);
    expect(e.nitroChains).toBe(0);
    expect(e.topSpeedKmh).toBe(400);
  });
});
