import { carAccelSeconds, carBrakeForce, carGripFactor, carNitroCapacity, carTopSpeedKmh, type CarDef } from 'shared';
import { SURFACES, type CarState, type Controls, type Surface } from './types';
import type { TrackGeometry } from './track';

/**
 * Arcade vehicle physics — smooth, predictable, fun-first.
 * Velocity is decomposed into forward/lateral components each step so
 * drifting (lateral slide) emerges naturally from grip + handbrake + surface.
 */

export interface CarPhysicsParams {
  maxSpeed: number; // m/s
  engineAccel: number; // m/s^2 at zero speed
  brakeForce: number; // m/s^2
  grip: number; // 0..1 handling
  nitroCapacity: number; // seconds at full tank
  reverseMax: number; // m/s
}

export function physicsParams(car: CarDef): CarPhysicsParams {
  return {
    maxSpeed: carTopSpeedKmh(car) / 3.6,
    engineAccel: 27.8 / carAccelSeconds(car),
    brakeForce: 26 * carBrakeForce(car),
    grip: carGripFactor(car),
    nitroCapacity: carNitroCapacity(car),
    reverseMax: -14,
  };
}

export function createCarState(id: string, isPlayer: boolean, nitroCapacity: number): CarState {
  return {
    id,
    isPlayer,
    x: 0,
    z: 0,
    y: 0,
    heading: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    airborne: false,
    speed: 0,
    vLat: 0,
    nitro: nitroCapacity,
    nitroActive: false,
    lap: 0,
    s: 0,
    lastS: 0,
    sProgress: 0,
    lapStartMs: 0,
    projIdx: 0,
    surface: 'asphalt',
    worldAngle: 0,
    driftAmount: 0,
    collisionCooldown: 0,
  };
}

/** Places a car on the grid (behind the start line). */
export function placeOnGrid(
  car: CarState,
  track: TrackGeometry,
  gridIndex: number,
  nitroCapacity: number,
  startOffset = 0
) {
  const s = track.length - 6 - gridIndex * 6.5 + startOffset;
  const p = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
  track.posAtDistance(s, p);
  const lateral = gridIndex % 2 === 0 ? -2.6 : 2.6;
  car.x = p.x + p.tz * lateral;
  car.z = p.z - p.tx * lateral;
  car.y = p.y;
  car.heading = Math.atan2(p.tx, p.tz);
  car.speed = 0;
  car.vLat = 0;
  car.vx = Math.sin(car.heading) * car.speed;
  car.vz = Math.cos(car.heading) * car.speed;
  car.vy = 0;
  car.airborne = false;
  car.lap = 0;
  const proj = track.project(car.x, car.z, 0);
  car.projIdx = proj.idx;
  car.s = proj.s;
  car.lastS = proj.s;
  car.sProgress = 0;
  car.nitro = nitroCapacity;
  car.driftAmount = 0;
}

export interface StepContext {
  dt: number;
  controls: Controls;
  params: CarPhysicsParams;
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'sandstorm';
  timeMs: number; // race clock
  onEvent?: (e: { type: 'lap' | 'wall' | 'landed' | 'nitro-start'; lapTimeMs?: number }) => void;
}

const GRAVITY = 22;

export function stepCar(car: CarState, track: TrackGeometry, ctx: StepContext) {
  const dt = ctx.dt;
  const P = ctx.params;
  const locked = ctx.timeMs < 0; // countdown lock

  // --- surface from projection -------------------------------------------
  const proj = track.project(car.x, car.z, car.projIdx);
  car.projIdx = proj.idx;
  car.s = proj.s;
  const zone = track.surfaceFor(Math.abs(proj.lateral));
  let surface: Surface = 'asphalt';
  if (zone === 'road') {
    surface = ctx.weather === 'rain' ? 'wet' : ctx.weather === 'snow' ? 'ice' : 'asphalt';
  } else if (zone === 'shoulder') {
    surface = 'gravel';
  } else {
    surface = 'grass';
  }
  car.surface = surface;
  const S = SURFACES[surface];

  // --- nitro ---------------------------------------------------------------
  const wantNitro = ctx.controls.nitro && car.nitro > 0.05 && !locked;
  const wasNitro = car.nitroActive;
  car.nitroActive = wantNitro;
  if (wantNitro && !wasNitro) ctx.onEvent?.({ type: 'nitro-start' });
  if (wantNitro) car.nitro = Math.max(0, car.nitro - dt);
  // Passive regen + drift-charged regen (reward sliding).
  else
    car.nitro = Math.min(
      P.nitroCapacity,
      car.nitro + dt * (0.055 + car.driftAmount * 0.55)
    );

  // --- longitudinal ---------------------------------------------------------
  const boosting = car.nitroActive;
  const speedCap = P.maxSpeed * S.speedMult * (boosting ? 1.14 : 1);
  let accel = 0;
  if (!locked) {
    if (ctx.controls.throttle > 0) {
      accel = P.engineAccel * S.accelMult * (boosting ? 1.9 : 1) * ctx.controls.throttle;
      // power falls off near top speed (arcade-friendly)
      accel *= Math.max(0.12, 1 - Math.max(0, car.speed) / speedCap);
    }
    if (ctx.controls.brake > 0) {
      if (car.speed > 0.5) {
        accel -= P.brakeForce * ctx.controls.brake;
      } else {
        // reverse
        accel -= P.engineAccel * 0.5 * ctx.controls.brake;
        if (car.speed <= P.reverseMax) accel = Math.max(accel, 0);
      }
    }
    // drag + rolling resistance (never pushes speed through zero when coasting)
    const dragCoef = (P.engineAccel / speedCap) * Math.abs(car.speed);
    const rolling = 0.4;
    let dragDecel = dragCoef + rolling;
    if (ctx.controls.throttle === 0 && ctx.controls.brake === 0 && Math.abs(car.speed) < 1.2) {
      dragDecel = Math.min(dragDecel, Math.abs(car.speed) / dt);
    }
    accel -= dragDecel * Math.sign(car.speed);
    if (Math.abs(car.speed) < 0.05 && ctx.controls.throttle === 0 && ctx.controls.brake === 0) {
      car.speed = 0;
      accel = 0;
    }
  }
  car.speed += accel * dt;
  if (car.speed > speedCap) car.speed = speedCap;
  if (car.speed < P.reverseMax) car.speed = P.reverseMax;

  // --- steering & lateral grip ----------------------------------------------
  const absSpeed = Math.abs(car.speed);
  const steerInput = locked ? 0 : ctx.controls.steer;
  const gripBase = P.grip * S.grip;
  const handbrake = ctx.controls.handbrake && absSpeed > 4;
  // Turn rate: strong at low speed, easing off at high speed.
  const speedFactor = 1 / (1 + absSpeed * 0.028);
  const turnRate = 2.4 * speedFactor * (0.55 + gripBase * 0.75) * (handbrake ? 1.35 : 1) * (boosting ? 0.96 : 1);
  // Direction of steering flips when reversing.
  const steerDir = car.speed < -0.5 ? -1 : 1;
  car.heading += steerInput * turnRate * dt * steerDir * (0.35 + Math.min(1, absSpeed / 14));

  // Lateral slip: heading changes create lateral velocity, damped by grip.
  const fwdX = Math.sin(car.heading);
  const fwdZ = Math.cos(car.heading);
  const sideX = fwdZ;
  const sideZ = -fwdX;
  // Compose velocity from forward + lateral
  let vx = fwdX * car.speed + sideX * car.vLat;
  let vz = fwdZ * car.speed + sideZ * car.vLat;
  // Rotate velocity partially toward new heading (grip pulls the car along its nose)
  const vForward = vx * fwdX + vz * fwdZ;
  const vLateralOld = vx * sideX + vz * sideZ;
  const lateralGrip = gripBase * (handbrake ? 1.6 : 9.5) * (car.airborne ? 0 : 1);
  const vLateralNew = vLateralOld * Math.exp(-lateralGrip * dt);
  car.vLat = vLateralNew;
  car.speed = vForward; // forward speed follows actual velocity
  car.vx = fwdX * car.speed + sideX * car.vLat;
  car.vz = fwdZ * car.speed + sideZ * car.vLat;

  // drift amount for scoring/effects
  const rawDrift = Math.min(1, Math.abs(car.vLat) / 12);
  car.driftAmount += (rawDrift - car.driftAmount) * Math.min(1, dt * 6);

  // --- integration -----------------------------------------------------------
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  // --- vertical / elevation --------------------------------------------------
  const groundY = track.project(car.x, car.z, car.projIdx).elevation;
  if (!car.airborne) {
    const dy = groundY - car.y;
    if (dy > 0.05) {
      car.y += dy * Math.min(1, dt * 10); // climb
      car.vy = 0;
    } else if (dy < -0.4) {
      car.airborne = true;
      car.vy = 0;
    } else {
      car.y = groundY;
    }
  }
  if (car.airborne) {
    car.vy -= GRAVITY * dt;
    car.y += car.vy * dt;
    if (car.y <= groundY) {
      car.y = groundY;
      car.airborne = false;
      ctx.onEvent?.({ type: 'landed' });
    }
  }

  // --- barriers ---------------------------------------------------------------
  const limit = track.halfWidth + 9; // visual barrier line
  const proj2 = track.project(car.x, car.z, car.projIdx);
  if (Math.abs(proj2.lateral) > limit) {
    const sign = Math.sign(proj2.lateral);
    const nx = proj2.tangentZ * sign;
    const nz = -proj2.tangentX * sign;
    // push back inside
    const excess = Math.abs(proj2.lateral) - limit;
    car.x -= nx * excess;
    car.z -= nz * excess;
    // kill outward velocity, scrub speed
    const outV = car.vx * nx + car.vz * nz;
    if (outV > 0) {
      car.vx -= nx * outV * 1.6;
      car.vz -= nz * outV * 1.6;
      car.speed *= 0.82;
      car.vLat *= -0.3;
      ctx.onEvent?.({ type: 'wall' }); // wall hit (audio/camera shake)
    }
    // reproject
    const p3 = track.project(car.x, car.z, car.projIdx);
    car.projIdx = p3.idx;
    car.s = p3.s;
  }

  // --- lap / progress tracking -----------------------------------------------
  const raw = car.s - car.lastS;
  const wrapped = wrapDelta(raw, track.length);
  car.sProgress += Math.max(-30, Math.min(30, wrapped));
  car.lastS = car.s;
  if (raw < -track.length * 0.5 && car.sProgress > track.length * 0.5) {
    // crossed the start line forward → lap complete
    const lapTimeMs = ctx.timeMs - car.lapStartMs;
    car.lap += 1;
    car.sProgress = 0;
    car.lapStartMs = ctx.timeMs;
    ctx.onEvent?.({ type: 'lap', lapTimeMs });
  } else if (raw > track.length * 0.5) {
    car.sProgress = Math.max(0, car.sProgress - track.length); // went backwards over the line
  }
  if (car.collisionCooldown > 0) car.collisionCooldown -= dt;
}

export function wrapDelta(d: number, length: number): number {
  if (d > length / 2) return d - length;
  if (d < -length / 2) return d + length;
  return d;
}

/** Hard reset onto the track (R key / auto-reset). */
export function resetCar(car: CarState, track: TrackGeometry, capacity: number) {
  const proj = track.project(car.x, car.z, car.projIdx);
  const p = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
  track.posAtDistance(proj.s, p);
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
  car.nitro = Math.max(car.nitro, capacity * 0.5);
  car.driftAmount = 0;
}
