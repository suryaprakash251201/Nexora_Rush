// Simulation primitives shared by physics, AI and the race orchestrator.

export type Surface = 'asphalt' | 'wet' | 'ice' | 'sand' | 'gravel' | 'grass';

export interface SurfaceProfile {
  grip: number; // lateral grip multiplier
  topMult: number; // top-speed multiplier
  accelMult: number;
}

export const SURFACES: Record<Surface, SurfaceProfile> = {
  asphalt: { grip: 1, topMult: 1, accelMult: 1 },
  wet: { grip: 0.72, topMult: 0.96, accelMult: 0.85 },
  ice: { grip: 0.32, topMult: 0.9, accelMult: 0.5 },
  sand: { grip: 0.62, topMult: 0.7, accelMult: 0.6 },
  gravel: { grip: 0.58, topMult: 0.72, accelMult: 0.65 },
  grass: { grip: 0.5, topMult: 0.6, accelMult: 0.5 },
};

export interface CarState {
  isPlayer: boolean;
  x: number;
  z: number;
  y: number;
  heading: number; // radians; forward = (sin h, cos h)
  vx: number;
  vz: number;
  vy: number;
  airborne: boolean;
  speed: number; // signed forward speed, m/s
  vLat: number; // lateral velocity, m/s
  nitro: number; // seconds remaining in tank
  boosting: boolean;
  lap: number; // completed laps
  s: number; // distance along track
  lastS: number;
  progress: number; // accumulated forward travel since lap start
  lapStartMs: number;
  proj: number; // projection hint index
  surface: Surface;
  drift: number; // 0..1 smoothed slide amount (fx + scoring)
  hitCooldown: number;
}

export interface Controls {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1
  handbrake: boolean;
  nitro: boolean;
}

export const NEUTRAL: Controls = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };

export interface EventCounters {
  overtakes: number;
  nearMisses: number;
  driftPoints: number;
  nitroChains: number;
  collisions: number;
  topSpeedKmh: number;
}
