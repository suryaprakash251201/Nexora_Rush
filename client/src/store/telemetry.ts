import { create } from 'zustand';
import type { RacerStanding } from '@/game/engine/race';

/**
 * Live telemetry bridge between the 3D race loop and React HUD.
 * High-frequency values are written every ~80ms; flash ticks let the HUD
 * trigger effects without prop churn.
 */

export interface TelemetryState {
  phase: 'countdown' | 'racing' | 'finished';
  countdown: number; // 3,2,1,0
  speedKmh: number;
  lap: number;
  laps: number; // 0 = endless
  position: number;
  gridSize: number;
  nitro: number; // 0..1
  boosting: boolean;
  raceTimeMs: number;
  currentLapMs: number;
  bestLapMs: number | null;
  lastLapMs: number | null;
  driftPoints: number;
  standings: RacerStanding[];
  fps: number;
  wrecked: boolean;
  // event ticks (incremented; HUD reacts to changes)
  nearMissTick: number;
  collisionTick: number;
  overtakeTick: number;
  lapTick: number;
  driftTick: number;
}

export const useTelemetry = create<TelemetryState>(() => ({
  phase: 'countdown',
  countdown: 3,
  speedKmh: 0,
  lap: 1,
  laps: 3,
  position: 1,
  gridSize: 1,
  nitro: 1,
  boosting: false,
  raceTimeMs: 0,
  currentLapMs: 0,
  bestLapMs: null,
  lastLapMs: null,
  driftPoints: 0,
  standings: [],
  fps: 60,
  wrecked: false,
  nearMissTick: 0,
  collisionTick: 0,
  overtakeTick: 0,
  lapTick: 0,
  driftTick: 0,
}));

export function resetTelemetry(partial: Partial<TelemetryState> = {}) {
  useTelemetry.setState({
    phase: 'countdown',
    countdown: 3,
    speedKmh: 0,
    lap: 1,
    position: 1,
    nitro: 1,
    boosting: false,
    raceTimeMs: 0,
    currentLapMs: 0,
    bestLapMs: null,
    lastLapMs: null,
    driftPoints: 0,
    standings: [],
    wrecked: false,
    nearMissTick: 0,
    collisionTick: 0,
    overtakeTick: 0,
    lapTick: 0,
    driftTick: 0,
    ...partial,
  });
}

/** Mutable per-frame minimap dot positions (kept out of React for perf). */
export const minimapDots: { x: number; y: number; isPlayer: boolean }[] = [];
