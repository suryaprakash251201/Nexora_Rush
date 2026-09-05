import { carAccelSeconds, carBrakeForce, carGripFactor, carNitroCapacity, carTopSpeedKmh, type CarDef } from 'shared';
import { SURFACES, type CarState, type Controls, type Surface } from './types';
import type { TrackGeometry } from './track';

/**
 * Arcade vehicle model. Velocity is split into forward + lateral parts every
 * step; lateral slide is damped by grip, so drifts emerge from steering,
 * handbrake and surface instead of being scripted.
 */

export interface Tune {
  top: number; // m/s
  accel: number; // m/s^2 at standstill
  brake: number; // m/s^2
  grip: number; // 0..1
  tank: number; // nitro seconds at full
  revMax: number; // m/s reverse cap
}

export function tuneFor(car: CarDef): Tune {
  return {
    top: carTopSpeedKmh(car) / 3.6,
    accel: 27.8 / carAccelSeconds(car),
    brake: 26 * carBrakeForce(car),
    grip: carGripFactor(car),
    tank: carNitroCapacity(car),
    revMax: -14,
  };
}

export function freshCar(isPlayer: boolean, tank: number, s = 0): CarState {
  return {
    isPlayer,
    x: 0, z: 0, y: 0,
    heading: 0,
    vx: 0, vz: 0, vy: 0,
    airborne: false,
    speed: 0, vLat: 0,
    nitro: tank, boosting: false,
    lap: 0, s, lastS: s, progress: 0, lapStartMs: 0,
    proj: 0,
    surface: 'asphalt',
    drift: 0,
    hitCooldown: 0,
  };
}

/** Slot a car onto the starting grid. */
export function toGrid(car: CarState, track: TrackGeometry, slot: number, tank: number) {
  const p = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
  track.posAt(track.length - 6 - slot * 6.5, p);
  const side = slot % 2 === 0 ? -2.6 : 2.6;
  car.x = p.x + p.tz * side;
  car.z = p.z - p.tx * side;
  car.y = p.y;
  car.heading = Math.atan2(p.tx, p.tz);
  car.speed = 0;
  car.vLat = 0;
  car.vx = 0;
  car.vz = 0;
  car.vy = 0;
  car.airborne = false;
  car.lap = 0;
  car.nitro = tank;
  car.boosting = false;
  car.drift = 0;
  car.hitCooldown = 0;
  const proj = track.project(car.x, car.z, 0);
  car.proj = proj.idx;
  car.s = proj.s;
  car.lastS = proj.s;
  car.progress = 0;
}

/** Snap a spun car back onto the racing surface. */
export function toTrack(car: CarState, track: TrackGeometry, tank: number) {
  const proj = track.project(car.x, car.z, car.proj);
  const p = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
  track.posAt(proj.s, p);
  car.x = p.x;
  car.z = p.z;
  car.y = p.y;
  car.heading = Math.atan2(p.tx, p.tz);
  car.speed = 0;
  car.vLat = 0;
  car.vx = 0;
  car.vz = 0;
  car.vy = 0;
  car.airborne = false;
  car.nitro = Math.max(car.nitro, tank * 0.5);
  car.drift = 0;
}

export interface StepInput {
  dt: number;
  controls: Controls;
  tune: Tune;
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'sandstorm';
  clockMs: number; // race clock (negative = countdown lock)
  events?: (e: { type: 'lap' | 'wall' | 'landed' | 'boost'; lapMs?: number }) => void;
}

const GRAVITY = 22;

export function stepCar(car: CarState, track: TrackGeometry, ctx: StepInput) {
  const dt = ctx.dt;
  const T = ctx.tune;
  const locked = ctx.clockMs < 0;

  // --- surface ---
  const proj = track.project(car.x, car.z, car.proj);
  car.proj = proj.idx;
  car.s = proj.s;
  const zone = track.zone(Math.abs(proj.lateral));
  let surface: Surface = 'asphalt';
  if (zone === 'road') surface = ctx.weather === 'rain' ? 'wet' : ctx.weather === 'snow' ? 'ice' : 'asphalt';
  else if (zone === 'shoulder') surface = 'gravel';
  else surface = 'grass';
  car.surface = surface;
  const S = SURFACES[surface];

  // --- nitro (drift charges the tank) ---
  const wantBoost = ctx.controls.nitro && car.nitro > 0.05 && !locked;
  if (wantBoost && !car.boosting) ctx.events?.({ type: 'boost' });
  car.boosting = wantBoost;
  if (wantBoost) car.nitro = Math.max(0, car.nitro - dt);
  else car.nitro = Math.min(T.tank, car.nitro + dt * (0.055 + car.drift * 0.55));

  // --- longitudinal ---
  const cap = T.top * S.topMult * (car.boosting ? 1.14 : 1);
  let accel = 0;
  if (!locked) {
    if (ctx.controls.throttle > 0) {
      accel = T.accel * S.accelMult * (car.boosting ? 1.9 : 1) * ctx.controls.throttle;
      accel *= Math.max(0.12, 1 - Math.max(0, car.speed) / cap);
    }
    if (ctx.controls.brake > 0) {
      if (car.speed > 0.5) accel -= T.brake * ctx.controls.brake;
      else accel -= T.accel * 0.5 * ctx.controls.brake;
    }
    const drag = (T.accel / cap) * Math.abs(car.speed) + 0.4;
    if (ctx.controls.throttle === 0 && ctx.controls.brake === 0 && Math.abs(car.speed) < 1.2) {
      accel = -Math.sign(car.speed) * Math.min(drag, Math.abs(car.speed) / dt);
    } else {
      accel -= drag * Math.sign(car.speed);
    }
  }
  car.speed += accel * dt;
  if (car.speed > cap) car.speed = cap;
  if (car.speed < T.revMax) car.speed = T.revMax;
  if (!locked && Math.abs(car.speed) < 0.05 && ctx.controls.throttle === 0 && ctx.controls.brake === 0) car.speed = 0;

  // --- steering ---
  const absV = Math.abs(car.speed);
  const steer = locked ? 0 : ctx.controls.steer;
  const gripNow = T.grip * S.grip;
  const sliding = ctx.controls.handbrake && absV > 4;
  const rate = 2.4 * (1 / (1 + absV * 0.028)) * (0.55 + gripNow * 0.75) * (sliding ? 1.35 : 1) * (car.boosting ? 0.96 : 1);
  car.heading += steer * rate * dt * (car.speed < -0.5 ? -1 : 1) * (0.35 + Math.min(1, absV / 14));

  // --- lateral grip: rotate velocity toward the nose, bleed the slide ---
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const sx = fz;
  const sz = -fx;
  let vx = fx * car.speed + sx * car.vLat;
  let vz = fz * car.speed + sz * car.vLat;
  const vF = vx * fx + vz * fz;
  const vL = vx * sx + vz * sz;
  const hold = gripNow * (sliding ? 1.6 : 9.5) * (car.airborne ? 0 : 1);
  car.vLat = vL * Math.exp(-hold * dt);
  car.speed = vF;
  car.vx = fx * car.speed + sx * car.vLat;
  car.vz = fz * car.speed + sz * car.vLat;

  const rawDrift = Math.min(1, Math.abs(car.vLat) / 12);
  car.drift += (rawDrift - car.drift) * Math.min(1, dt * 6);

  // --- integrate ---
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  // --- elevation ---
  const groundY = track.project(car.x, car.z, car.proj).y;
  if (!car.airborne) {
    const dy = groundY - car.y;
    if (dy > 0.05) {
      car.y += dy * Math.min(1, dt * 10);
      car.vy = 0;
    } else if (dy < -0.4) {
      car.airborne = true;
      car.vy = 0;
    } else {
      car.y = groundY;
    }
  } else {
    car.vy -= GRAVITY * dt;
    car.y += car.vy * dt;
    if (car.y <= groundY) {
      car.y = groundY;
      car.airborne = false;
      ctx.events?.({ type: 'landed' });
    }
  }

  // --- barriers ---
  const limit = track.half + 9;
  const edge = track.project(car.x, car.z, car.proj);
  if (Math.abs(edge.lateral) > limit) {
    const sign = Math.sign(edge.lateral);
    const nx = edge.tz * sign;
    const nz = -edge.tx * sign;
    const over = Math.abs(edge.lateral) - limit;
    car.x -= nx * over;
    car.z -= nz * over;
    const out = car.vx * nx + car.vz * nz;
    if (out > 0) {
      car.vx -= nx * out * 1.6;
      car.vz -= nz * out * 1.6;
      car.speed *= 0.82;
      car.vLat *= -0.3;
      ctx.events?.({ type: 'wall' });
    }
    const fixed = track.project(car.x, car.z, car.proj);
    car.proj = fixed.idx;
    car.s = fixed.s;
  }

  // --- lap tracking (compare RAW delta so the start-line jump registers) ---
  const raw = car.s - car.lastS;
  const wrapped = raw > track.length / 2 ? raw - track.length : raw < -track.length / 2 ? raw + track.length : raw;
  car.progress += Math.max(-30, Math.min(30, wrapped));
  car.lastS = car.s;
  if (raw < -track.length * 0.5 && car.progress > track.length * 0.5) {
    const lapMs = ctx.clockMs - car.lapStartMs;
    car.lap += 1;
    car.progress = 0;
    car.lapStartMs = ctx.clockMs;
    ctx.events?.({ type: 'lap', lapMs });
  } else if (raw > track.length * 0.5) {
    car.progress = Math.max(0, car.progress - track.length);
  }

  if (car.hitCooldown > 0) car.hitCooldown -= dt;
}
