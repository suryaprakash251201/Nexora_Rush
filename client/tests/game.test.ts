import { describe, expect, it } from 'vitest';
import { TrackGeometry, generateControlPoints } from '@/game/engine/track';
import { createCarState, placeOnGrid, physicsParams, stepCar, resetCar } from '@/game/engine/physics';
import { RaceEngine } from '@/game/engine/race';
import { getCar, getTrack, calculateScore } from 'shared';
import { EMPTY_CONTROLS, type Controls, type CarState } from '@/game/engine/types';
import type { TrackGeometry as TG } from '@/game/engine/track';

const trackDef = getTrack('city-rush')!;
const carDef = getCar('street-hawk')!;

function makeTrack(): TG {
  const pts = generateControlPoints({
    seed: 42, radius: 260, points: 24, wobble1: 0.2, wobble2: 0.1, wobble3: 0.04,
    elevation: 4, elevationFreq: 3, width: 14, squishX: 1, squishZ: 1,
  });
  return new TrackGeometry(pts, 14);
}

/** Steers toward a point `lookahead` meters ahead on the racing line. */
function steerToward(track: TG, car: CarState): Controls {
  const ahead = track.sampleAt(Math.floor(((car.s + 40) / track.length) * track.sampleCount));
  const desired = Math.atan2(ahead.x - car.x, ahead.z - car.z);
  let diff = desired - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { ...EMPTY_CONTROLS, throttle: 1, steer: Math.max(-1, Math.min(1, diff * 2)) };
}

describe('track geometry', () => {
  it('builds a closed loop with matching start/end', () => {
    const t = makeTrack();
    expect(t.length).toBeGreaterThan(1000);
    expect(Math.hypot(t.px[0] - t.px[t.sampleCount - 1], t.pz[0] - t.pz[t.sampleCount - 1])).toBeLessThan(30);
  });

  it('projects points near the centerline back onto the track', () => {
    const t = makeTrack();
    const p = t.project(t.px[100] + 1, t.pz[100] + 1, 100);
    expect(p.lateral).toBeLessThan(5);
    expect(p.idx).toBeGreaterThanOrEqual(95);
    expect(p.idx).toBeLessThanOrEqual(105);
  });

  it('classifies surfaces by lateral offset', () => {
    const t = makeTrack();
    expect(t.surfaceFor(2)).toBe('road');
    expect(t.surfaceFor(t.halfWidth + 1)).toBe('shoulder');
    expect(t.surfaceFor(t.halfWidth + 50)).toBe('offroad');
  });
});

describe('vehicle physics', () => {
  it('accelerates under throttle toward a top speed', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const car = createCarState('p', true, params.nitroCapacity);
    placeOnGrid(car, t, 0, params.nitroCapacity);
    let time = 0;
    let maxKmh = 0;
    for (let i = 0; i < 60 * 15; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: steerToward(t, car), params, weather: 'clear', timeMs: time });
      maxKmh = Math.max(maxKmh, car.speed * 3.6);
      time += 1000 / 60;
    }
    expect(maxKmh).toBeGreaterThan(100);
    expect(maxKmh).toBeLessThanOrEqual(params.maxSpeed * 3.6 + 1);
  });

  it('brakes and can reverse', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const car = createCarState('p', true, params.nitroCapacity);
    placeOnGrid(car, t, 0, params.nitroCapacity);
    let time = 0;
    for (let i = 0; i < 60 * 5; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: steerToward(t, car), params, weather: 'clear', timeMs: time });
      time += 1000 / 60;
    }
    expect(car.speed).toBeGreaterThan(14);
    for (let i = 0; i < 60 * 5; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: { ...EMPTY_CONTROLS, brake: 1 }, params, weather: 'clear', timeMs: time });
      time += 1000 / 60;
    }
    expect(car.speed).toBeLessThan(0);
  });

  it('steers the car', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const car = createCarState('p', true, params.nitroCapacity);
    placeOnGrid(car, t, 0, params.nitroCapacity);
    const heading0 = car.heading;
    let time = 0;
    for (let i = 0; i < 120; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: { ...EMPTY_CONTROLS, throttle: 1, steer: 1 }, params, weather: 'clear', timeMs: time });
      time += 1000 / 60;
    }
    expect(Math.abs(car.heading - heading0)).toBeGreaterThan(0.2);
  });

  it('ice retains more lateral slip than asphalt', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const slide = (weather: 'clear' | 'snow') => {
      const car = createCarState('p', true, params.nitroCapacity);
      placeOnGrid(car, t, 0, params.nitroCapacity);
      car.speed = 30;
      car.vLat = 6;
      let time = 0;
      for (let i = 0; i < 30; i++) {
        stepCar(car, t, { dt: 1 / 60, controls: EMPTY_CONTROLS, params, weather, timeMs: time });
        time += 1000 / 60;
      }
      return car.vLat;
    };
    expect(slide('snow')).toBeGreaterThan(slide('clear'));
  });

  it('handbrake retains more lateral slip than normal grip', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const slide = (handbrake: boolean) => {
      const car = createCarState('p', true, params.nitroCapacity);
      placeOnGrid(car, t, 0, params.nitroCapacity);
      car.speed = 30;
      car.vLat = 6;
      let time = 0;
      for (let i = 0; i < 30; i++) {
        stepCar(car, t, { dt: 1 / 60, controls: { ...EMPTY_CONTROLS, handbrake }, params, weather: 'clear', timeMs: time });
        time += 1000 / 60;
      }
      return car.vLat;
    };
    expect(slide(true)).toBeGreaterThan(slide(false));
  });

  it('nitro boosts speed and depletes the tank', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const base = createCarState('p', true, params.nitroCapacity);
    const boosted = createCarState('p2', true, params.nitroCapacity);
    placeOnGrid(base, t, 0, params.nitroCapacity);
    placeOnGrid(boosted, t, 0, params.nitroCapacity);
    let time = 0;
    let baseMax = 0;
    let boostMax = 0;
    for (let i = 0; i < 60 * 10; i++) {
      stepCar(base, t, { dt: 1 / 60, controls: steerToward(t, base), params, weather: 'clear', timeMs: time });
      stepCar(boosted, t, { dt: 1 / 60, controls: { ...steerToward(t, boosted), nitro: true }, params, weather: 'clear', timeMs: time });
      baseMax = Math.max(baseMax, base.speed);
      boostMax = Math.max(boostMax, boosted.speed);
      time += 1000 / 60;
    }
    expect(boostMax).toBeGreaterThan(baseMax);
    expect(boosted.nitro).toBeLessThan(params.nitroCapacity);
  });

  it('reset places the car back on the track with zero speed', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const car = createCarState('p', true, params.nitroCapacity);
    placeOnGrid(car, t, 0, params.nitroCapacity);
    let time = 0;
    for (let i = 0; i < 240; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: { ...EMPTY_CONTROLS, throttle: 1, steer: 1 }, params, weather: 'clear', timeMs: time });
      time += 1000 / 60;
    }
    resetCar(car, t, params.nitroCapacity);
    const proj = t.project(car.x, car.z, car.projIdx);
    expect(Math.abs(proj.lateral)).toBeLessThan(1.5);
    expect(car.speed).toBe(0);
  });
});

describe('lap detection', () => {
  it('completes a lap after driving the full loop', () => {
    const t = makeTrack();
    const params = physicsParams(carDef);
    const car = createCarState('p', true, params.nitroCapacity);
    placeOnGrid(car, t, 0, params.nitroCapacity);
    let time = 0;
    let lapTime = 0;
    for (let i = 0; i < 60 * 300 && car.lap === 0; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: steerToward(t, car), params, weather: 'clear', timeMs: time, onEvent: (e) => { if (e.type === 'lap') lapTime = e.lapTimeMs ?? 0; } });
      time += 1000 / 60;
    }
    expect(car.lap).toBe(1);
    expect(lapTime).toBeGreaterThan(0);
  });
});

describe('race engine', () => {
  it('runs a countdown then racing phase, AI cars move', () => {
    const t = makeTrack();
    const engine = new RaceEngine({
      track: t, car: carDef, aiCars: [getCar('thunder-gt')!, getCar('blaze-x')!],
      difficulty: 'normal', laps: 1, mode: 'quick', weather: 'clear',
    });
    for (let i = 0; i < 40; i++) engine.update(50, EMPTY_CONTROLS); // 2s
    expect(engine.phase).toBe('countdown');
    for (let i = 0; i < 80; i++) engine.update(50, EMPTY_CONTROLS); // +4s
    expect(engine.phase).toBe('racing');
    expect(engine.gridSize).toBe(3);
    for (let i = 0; i < 200; i++) engine.update(50, EMPTY_CONTROLS); // +10s
    expect(engine.ais[0].state.s).toBeGreaterThan(0);
    expect(engine.computePosition()).toBeGreaterThanOrEqual(1);
    expect(engine.computePosition()).toBeLessThanOrEqual(3);
  });

  it('accumulates telemetry events during a race', () => {
    const t = makeTrack();
    const engine = new RaceEngine({
      track: t, car: carDef, aiCars: [getCar('thunder-gt')!],
      difficulty: 'easy', laps: 1, mode: 'quick', weather: 'clear',
    });
    for (let i = 0; i < 300; i++) engine.update(50, { ...EMPTY_CONTROLS, throttle: 1 });
    expect(engine.events.topSpeedKmh).toBeGreaterThan(0);
    expect(engine.timeMs).toBeGreaterThan(0);
  });
});

describe('score display', () => {
  it('calculates a positive score for a completed race', () => {
    const score = calculateScore({
      track: trackDef, mode: 'quick', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 200_000, isFastLap: true,
      events: { overtakes: 3, nearMisses: 2, driftPoints: 600, nitroChains: 2, topSpeedKmh: 210, collisions: 0, bestLapMs: 62_000, lapTimesMs: [62_000, 63_000, 61_500], checkpointTimestampsMs: [] },
      finished: true,
    });
    expect(score).toBeGreaterThan(10_000);
  });
});
