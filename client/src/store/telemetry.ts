import { create } from 'zustand';
import type { RacerStanding } from '@/sim/race';

/**
 * Telemetry bridge: the 3D loop writes at ~12 Hz; the HUD reads.
 * High-frequency values (speed/timer/nitro) are pushed to the DOM directly
 * by the HUD's rAF loop to avoid React re-renders.
 */
export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface Telemetry {
  phase: RacePhase;
  count: number; // 3..0, 0 = GO
  speedKmh: number;
  lap: number;
  laps: number; // 0 = endless
  position: number;
  grid: number;
  nitro: number; // 0..1
  boosting: boolean;
  raceMs: number;
  lapMs: number;
  bestMs: number | null;
  lastMs: number | null;
  drift: number;
  standings: RacerStanding[];
  wrecked: boolean;
  fps: number;
  evNear: number;
  evHit: number;
  evPass: number;
  evLap: number;
}

const FRESH: Telemetry = {
  phase: 'countdown',
  count: 3,
  speedKmh: 0,
  lap: 1,
  laps: 3,
  position: 1,
  grid: 1,
  nitro: 1,
  boosting: false,
  raceMs: 0,
  lapMs: 0,
  bestMs: null,
  lastMs: null,
  drift: 0,
  standings: [],
  wrecked: false,
  fps: 60,
  evNear: 0,
  evHit: 0,
  evPass: 0,
  evLap: 0,
};

export const useTelemetry = create<Telemetry>(() => ({ ...FRESH }));

export function resetTelemetry(patch: Partial<Telemetry> = {}) {
  useTelemetry.setState({ ...FRESH, ...patch });
}

/** World-space dots for the minimap (mutated by the scene, read by HUD). */
export const mapDots: { x: number; z: number; me: boolean }[] = [];
