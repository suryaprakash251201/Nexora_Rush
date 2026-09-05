import type {
  Difficulty,
  RaceEventSummary,
  RaceMode,
  TrackDef,
} from './types';
import { DIFFICULTIES, SCORING, XP } from './game-data';

// ---------------------------------------------------------------------------
// Authoritative score calculation. The client displays its own live estimate,
// but the server ALWAYS recomputes from validated inputs.
// ---------------------------------------------------------------------------

export function positionPoints(position: number, grid: number): number {
  const table = SCORING.positionPoints;
  const idx = Math.min(Math.max(position - 1, 0), table.length - 1);
  const base = table[idx];
  // Gaining places relative to grid size is already reflected by the table.
  return base;
}

export interface ScoreInput {
  track: TrackDef;
  mode: RaceMode;
  difficulty: Difficulty;
  position: number;
  grid: number;
  raceTimeMs: number | null;
  isFastLap: boolean;
  events: RaceEventSummary;
  finished: boolean;
}

export function clampEvents(e: Partial<RaceEventSummary>): RaceEventSummary {
  return {
    overtakes: clampInt(e.overtakes, 0, 40),
    nearMisses: clampInt(e.nearMisses, 0, 100),
    driftPoints: clampInt(e.driftPoints, 0, SCORING.driftPointCap),
    nitroChains: clampInt(e.nitroChains, 0, 30),
    topSpeedKmh: clampNum(e.topSpeedKmh, 0, 400),
    collisions: clampInt(e.collisions, 0, 500),
    bestLapMs: e.bestLapMs != null ? clampInt(e.bestLapMs, 0, 3600_000) : null,
    lapTimesMs: (e.lapTimesMs || []).slice(0, 30).map((t) => clampInt(t, 0, 3600_000)),
    checkpointTimestampsMs: (e.checkpointTimestampsMs || []).slice(0, 400),
  };
}

export function calculateScore(input: ScoreInput): number {
  const { track, mode, difficulty, position, grid, raceTimeMs, isFastLap, events, finished } = input;
  const e = clampEvents(events);
  const diffMult = DIFFICULTIES[difficulty].scoreMult;
  let score = 0;

  if (mode === 'endless') {
    // Endless: survival time dominates.
    const seconds = (raceTimeMs ?? 0) / 1000;
    score = seconds * SCORING.endlessPerSecond * diffMult;
    score += e.driftPoints * SCORING.driftPerPoint * 0.5;
    score += e.overtakes * SCORING.overtake;
    return Math.round(score);
  }

  if (mode === 'time-trial') {
    // Time trial: lap pace is everything.
    if (e.bestLapMs && raceTimeMs) {
      const laps = Math.max(e.lapTimesMs.length, 1);
      const avgLap = e.lapTimesMs.length
        ? e.lapTimesMs.reduce((a, b) => a + b, 0) / laps
        : e.bestLapMs;
      const target = track.parRaceSeconds * 1000 / Math.max(laps, 1);
      score = 2000 + Math.max(0, (target - avgLap) / 1000) * SCORING.timeBonusPerSecondUnderPar * 2;
      score += e.driftPoints * SCORING.driftPerPoint * 0.25;
    }
    return Math.round(score * diffMult);
  }

  // Circuit races (quick / championship / daily).
  if (finished) {
    score += positionPoints(position, grid);
    if (isFastLap) score += SCORING.fastLap;
    score += e.overtakes * SCORING.overtake;
    score += e.nearMisses * SCORING.nearMiss;
    score += e.nitroChains * SCORING.nitroChain;
    score += Math.min(e.driftPoints, SCORING.driftPointCap) * SCORING.driftPerPoint;
    if (e.collisions === 0) score += SCORING.cleanRace;
    score += e.lapTimesMs.length * SCORING.checkpoint;
    if (raceTimeMs) {
      const underPar = (track.parRaceSeconds * 1000 - raceTimeMs) / 1000;
      if (underPar > 0) score += underPar * SCORING.timeBonusPerSecondUnderPar;
    }
  } else {
    // DNF: partial credit from progress events only.
    score += e.nearMisses * SCORING.nearMiss * 0.5;
    score += e.nitroChains * SCORING.nitroChain * 0.5;
    score += Math.min(e.driftPoints, SCORING.driftPointCap) * SCORING.driftPerPoint * 0.5;
  }

  return Math.round(score * diffMult);
}

export function calculateXp(opts: {
  score: number;
  position: number;
  grid: number;
  mode: RaceMode;
  isFastLap: boolean;
}): number {
  let xp = Math.round(opts.score * XP.perScore);
  if (opts.position === 1) xp += XP.winBonus;
  else if (opts.position <= 3) xp += XP.podiumBonus;
  if (opts.isFastLap) xp += XP.fastLapBonus;
  if (opts.mode === 'daily') xp += XP.dailyBonus;
  if (opts.mode === 'championship') xp += XP.championshipRoundBonus;
  return Math.max(10, Math.round(xp));
}

function clampInt(v: number | undefined, min: number, max: number): number {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, Math.floor(v)));
}
function clampNum(v: number | undefined, min: number, max: number): number {
  if (v == null || Number.isNaN(v) || !Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

// ---------------------------------------------------------------------------
// ANTI-CHEAT — server-side plausibility validation of race results.
// ---------------------------------------------------------------------------

export interface ValidationContext {
  track: TrackDef;
  difficulty: Difficulty;
  laps: number;
  grid: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateRaceResult(
  payload: {
    raceTimeMs: number | null;
    events: RaceEventSummary;
    finished: boolean;
    position: number;
    carTopSpeedKmh: number;
  },
  ctx: ValidationContext
): ValidationResult {
  const track = ctx.track;
  if (!track) return { valid: false, reason: 'invalid_track' };

  if (ctx.grid < 1 || ctx.grid > 8) return { valid: false, reason: 'invalid_grid' };
  if (ctx.laps < 1 || ctx.laps > 10) return { valid: false, reason: 'invalid_laps' };
  if (payload.position < 1 || payload.position > ctx.grid)
    return { valid: false, reason: 'invalid_position' };

  const e = clampEvents(payload.events);

  // Impossible top speed for the chosen car + track.
  const speedCeiling = Math.min(track.maxSpeedKmh, carSpeedCeilingKmh(payload.carTopSpeedKmh));
  if (e.topSpeedKmh > speedCeiling + 15)
    return { valid: false, reason: 'impossible_speed' };

  if (payload.finished) {
    if (payload.raceTimeMs == null) return { valid: false, reason: 'missing_race_time' };

    // Lap count sanity.
    const expectedLaps = ctx.laps;
    if (e.lapTimesMs.length < expectedLaps || e.lapTimesMs.length > expectedLaps)
      return { valid: false, reason: 'lap_count_mismatch' };

    // Total race time must at least equal the sum of laps (within tolerance).
    const lapSum = e.lapTimesMs.reduce((a, b) => a + b, 0);
    if (lapSum > payload.raceTimeMs + 2000)
      return { valid: false, reason: 'race_time_inconsistent' };

    // Each lap must clear the track's absolute floor.
    for (const lap of e.lapTimesMs) {
      if (lap < track.minLapSeconds * 1000)
        return { valid: false, reason: 'impossible_lap_time' };
    }

    // Whole race must clear the track floor for this lap count.
    if (payload.raceTimeMs < track.minRaceSeconds * 1000 * (ctx.laps / 3))
      return { valid: false, reason: 'impossible_race_time' };
  } else {
    // DNF still needs plausible lap times for laps actually completed.
    for (const lap of e.lapTimesMs) {
      if (lap < track.minLapSeconds * 1000)
        return { valid: false, reason: 'impossible_lap_time' };
    }
  }

  // Event plausibility: overtakes can't exceed grid size per lap.
  const maxOvertakes = ctx.grid * ctx.laps;
  if (e.overtakes > maxOvertakes) return { valid: false, reason: 'impossible_events' };

  // Drift points can't be absurd relative to race time (~30/s max sustained).
  if (payload.raceTimeMs) {
    const seconds = payload.raceTimeMs / 1000;
    if (e.driftPoints > seconds * 30 + 200)
      return { valid: false, reason: 'impossible_events' };
  }

  return { valid: true };
}

/** Anti-cheat ceiling per car: derived from the car's tuned top speed. */
function carSpeedCeilingKmh(carTopSpeed: number): number {
  return carTopSpeed * 1.08 + 10;
}
