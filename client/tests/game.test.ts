import { describe, expect, it } from 'vitest';
import { TrackGeometry, controlPoints, type TrackControl } from '@/sim/track';
import { freshCar, toGrid, tuneFor, stepCar, toTrack } from '@/sim/physics';
import { RaceEngine } from '@/sim/race';
import { getCar, getTrack, calculateScore } from 'shared';
import { NEUTRAL, type Controls, type CarState } from '@/sim/types';
import type { TrackGeometry as TG } from '@/sim/track';

const trackDef = getTrack('city-rush')!;
const carDef = getCar('street-hawk')!;

const CTL: TrackControl = {
  seed: 42, radius: 260, points: 24, w1: 0.2, w2: 0.1, w3: 0.04,
  elev: 4, elevFreq: 3, width: 14, squashX: 1, squashZ: 1,
};

function makeTrack(): TG {
  return new TrackGeometry(controlPoints(CTL), 14);
}

/** Steer toward a point ahead on the racing line. */
function chase(track: TG, car: CarState): Controls {
  const ahead = track.at(Math.floor(((car.s + 40) / track.length) * track.samples));
  const want = Math.atan2(ahead.x - car.x, ahead.z - car.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // NB: steer +1 = RIGHT = heading decreases (see physics.ts), so negate.
  return { ...NEUTRAL, throttle: 1, steer: Math.max(-1, Math.min(1, -diff * 2)) };
}

function drive(car: CarState, t: TG, tune: ReturnType<typeof tuneFor>, ctl: Controls, frames: number, weather: 'clear' | 'snow' = 'clear', clock = { ms: 0 }) {
  for (let i = 0; i < frames; i++) {
    stepCar(car, t, { dt: 1 / 60, controls: ctl, tune, weather, clockMs: clock.ms });
    clock.ms += 1000 / 60;
  }
}

describe('track geometry', () => {
  it('builds a closed loop', () => {
    const t = makeTrack();
    expect(t.length).toBeGreaterThan(1000);
    expect(Math.hypot(t.px[0] - t.px[t.samples - 1], t.pz[0] - t.pz[t.samples - 1])).toBeLessThan(30);
  });

  it('projects near-centerline points back onto the track', () => {
    const t = makeTrack();
    const p = t.project(t.px[100] + 1, t.pz[100] + 1, 100);
    expect(p.lateral).toBeLessThan(5);
    expect(p.idx).toBeGreaterThanOrEqual(95);
    expect(p.idx).toBeLessThanOrEqual(105);
  });

  it('classifies zones by lateral offset', () => {
    const t = makeTrack();
    expect(t.zone(2)).toBe('road');
    expect(t.zone(t.half + 1)).toBe('shoulder');
    expect(t.zone(t.half + 50)).toBe('off');
  });
});

describe('vehicle physics', () => {
  it('accelerates toward a top speed', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const car = freshCar(true, tune.tank);
    toGrid(car, t, 0, tune.tank);
    let maxKmh = 0;
    const clock = { ms: 0 };
    for (let i = 0; i < 60 * 15; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: chase(t, car), tune, weather: 'clear', clockMs: clock.ms });
      maxKmh = Math.max(maxKmh, car.speed * 3.6);
      clock.ms += 1000 / 60;
    }
    expect(maxKmh).toBeGreaterThan(100);
    expect(maxKmh).toBeLessThanOrEqual(tune.top * 3.6 + 1);
  });

  it('brakes and reverses', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const car = freshCar(true, tune.tank);
    toGrid(car, t, 0, tune.tank);
    const clock = { ms: 0 };
    for (let i = 0; i < 60 * 5; i++) {
      stepCar(car, t, { dt: 1 / 60, controls: chase(t, car), tune, weather: 'clear', clockMs: clock.ms });
      clock.ms += 1000 / 60;
    }
    expect(car.speed).toBeGreaterThan(14);
    drive(car, t, tune, { ...NEUTRAL, brake: 1 }, 60 * 5, 'clear', clock);
    expect(car.speed).toBeLessThan(0);
  });

  it('steers', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const car = freshCar(true, tune.tank);
    toGrid(car, t, 0, tune.tank);
    const h0 = car.heading;
    drive(car, t, tune, { ...NEUTRAL, throttle: 1, steer: 1 }, 120);
    expect(Math.abs(car.heading - h0)).toBeGreaterThan(0.2);
  });

  it('ice keeps more slide than asphalt', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const slide = (weather: 'clear' | 'snow') => {
      const car = freshCar(true, tune.tank);
      toGrid(car, t, 0, tune.tank);
      car.speed = 30;
      car.vLat = 6;
      drive(car, t, tune, NEUTRAL, 30, weather);
      return car.vLat;
    };
    expect(slide('snow')).toBeGreaterThan(slide('clear'));
  });

  it('handbrake keeps more slide than gripped cornering', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const slide = (hb: boolean) => {
      const car = freshCar(true, tune.tank);
      toGrid(car, t, 0, tune.tank);
      car.speed = 30;
      car.vLat = 6;
      drive(car, t, tune, { ...NEUTRAL, handbrake: hb }, 30);
      return car.vLat;
    };
    expect(slide(true)).toBeGreaterThan(slide(false));
  });

  it('nitro boosts and drains', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const a = freshCar(true, tune.tank);
    const b = freshCar(true, tune.tank);
    toGrid(a, t, 0, tune.tank);
    toGrid(b, t, 0, tune.tank);
    const clock = { ms: 0 };
    let aMax = 0;
    let bMax = 0;
    for (let i = 0; i < 60 * 10; i++) {
      stepCar(a, t, { dt: 1 / 60, controls: chase(t, a), tune, weather: 'clear', clockMs: clock.ms });
      stepCar(b, t, { dt: 1 / 60, controls: { ...chase(t, b), nitro: true }, tune, weather: 'clear', clockMs: clock.ms });
      aMax = Math.max(aMax, a.speed);
      bMax = Math.max(bMax, b.speed);
      clock.ms += 1000 / 60;
    }
    expect(bMax).toBeGreaterThan(aMax);
    expect(b.nitro).toBeLessThan(tune.tank);
  });

  it('reset returns the car to the road at standstill', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const car = freshCar(true, tune.tank);
    toGrid(car, t, 0, tune.tank);
    drive(car, t, tune, { ...NEUTRAL, throttle: 1, steer: 1 }, 240);
    toTrack(car, t, tune.tank);
    expect(Math.abs(t.project(car.x, car.z, car.proj).lateral)).toBeLessThan(1.5);
    expect(car.speed).toBe(0);
  });
});

describe('lap detection', () => {
  it('completes a lap around the loop', () => {
    const t = makeTrack();
    const tune = tuneFor(carDef);
    const car = freshCar(true, tune.tank);
    toGrid(car, t, 0, tune.tank);
    let lapMs = 0;
    const clock = { ms: 0 };
    for (let i = 0; i < 60 * 300 && car.lap === 0; i++) {
      stepCar(car, t, {
        dt: 1 / 60, controls: chase(t, car), tune, weather: 'clear', clockMs: clock.ms,
        events: (e) => {
          if (e.type === 'lap') lapMs = e.lapMs ?? 0;
        },
      });
      clock.ms += 1000 / 60;
    }
    expect(car.lap).toBe(1);
    expect(lapMs).toBeGreaterThan(0);
  });
});

describe('race engine', () => {
  it('counts down then races; rivals advance', () => {
    const t = makeTrack();
    const eng = new RaceEngine({
      track: t, car: carDef, rivals: [getCar('thunder-gt')!, getCar('blaze-x')!],
      difficulty: 'normal', laps: 1, mode: 'quick', weather: 'clear',
    });
    for (let i = 0; i < 40; i++) eng.update(50, NEUTRAL);
    expect(eng.phase).toBe('countdown');
    for (let i = 0; i < 80; i++) eng.update(50, NEUTRAL);
    expect(eng.phase).toBe('racing');
    expect(eng.gridSize).toBe(3);
    for (let i = 0; i < 200; i++) eng.update(50, NEUTRAL);
    expect(eng.rivals[0].state.s).toBeGreaterThan(0);
    expect(eng.computePosition()).toBeGreaterThanOrEqual(1);
    expect(eng.computePosition()).toBeLessThanOrEqual(3);
  });

  it('tracks telemetry events', () => {
    const t = makeTrack();
    const eng = new RaceEngine({
      track: t, car: carDef, rivals: [getCar('thunder-gt')!],
      difficulty: 'easy', laps: 1, mode: 'quick', weather: 'clear',
    });
    for (let i = 0; i < 300; i++) eng.update(50, { ...NEUTRAL, throttle: 1 });
    expect(eng.events.topSpeedKmh).toBeGreaterThan(0);
    expect(eng.timeMs).toBeGreaterThan(0);
  });
});

describe('score display', () => {
  it('scores a win above ten thousand', () => {
    const score = calculateScore({
      track: trackDef, mode: 'quick', difficulty: 'normal', position: 1, grid: 8,
      raceTimeMs: 200_000, isFastLap: true,
      events: { overtakes: 3, nearMisses: 2, driftPoints: 600, nitroChains: 2, topSpeedKmh: 210, collisions: 0, bestLapMs: 62_000, lapTimesMs: [62_000, 63_000, 61_500], checkpointTimestampsMs: [] },
      finished: true,
    });
    expect(score).toBeGreaterThan(10_000);
  });
});
