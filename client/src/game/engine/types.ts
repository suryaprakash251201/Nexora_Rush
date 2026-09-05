// Core simulation types shared by physics, AI, and the race orchestrator.

export interface Vec2 {
  x: number;
  z: number;
}

export interface CarState {
  id: string;
  isPlayer: boolean;
  x: number;
  z: number;
  y: number; // world height
  heading: number; // radians; forward = (sin h, cos h)
  vx: number;
  vz: number;
  vy: number;
  airborne: boolean;
  speed: number; // forward speed m/s (signed)
  vLat: number; // lateral velocity m/s
  nitro: number; // 0..capacity seconds
  nitroActive: boolean;
  lap: number; // completed laps
  s: number; // distance along track (m)
  lastS: number;
  sProgress: number; // accumulated progress since lap start
  lapStartMs: number;
  projIdx: number; // hint index for track projection
  surface: Surface;
  worldAngle: number; // visual heading (includes drift)
  driftAmount: number; // 0..1 smoothed, for effects/score
  collisionCooldown: number;
}

export type Surface = 'asphalt' | 'wet' | 'ice' | 'sand' | 'gravel' | 'grass';

export interface SurfaceProfile {
  grip: number; // lateral grip multiplier
  speedMult: number; // top speed multiplier
  accelMult: number;
  dust: boolean;
}

export const SURFACES: Record<Surface, SurfaceProfile> = {
  asphalt: { grip: 1, speedMult: 1, accelMult: 1, dust: false },
  wet: { grip: 0.72, speedMult: 0.96, accelMult: 0.85, dust: false },
  ice: { grip: 0.32, speedMult: 0.9, accelMult: 0.5, dust: false },
  sand: { grip: 0.62, speedMult: 0.7, accelMult: 0.6, dust: true },
  gravel: { grip: 0.58, speedMult: 0.72, accelMult: 0.65, dust: true },
  grass: { grip: 0.5, speedMult: 0.6, accelMult: 0.5, dust: true },
};

export interface Controls {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1
  handbrake: boolean;
  nitro: boolean;
}

export const EMPTY_CONTROLS: Controls = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  nitro: false,
};

export interface RaceEventCounters {
  overtakes: number;
  nearMisses: number;
  driftPoints: number;
  nitroChains: number;
  collisions: number;
  topSpeedKmh: number;
}
