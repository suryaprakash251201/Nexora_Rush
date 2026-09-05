import { describe, expect, it } from 'vitest';
import { levelFromXp, xpProgress, carTopSpeedKmh, getCar, positionPoints } from '../src';

describe('shared game data', () => {
  it('has 9 cars across 3 classes', () => {
    expect(getCar('street-hawk')).toBeDefined();
    expect(getCar('titan-z')?.class).toBe('elite');
  });

  it('maps car stats to physics consistently', () => {
    const hawk = getCar('street-hawk')!;
    const titan = getCar('titan-z')!;
    expect(carTopSpeedKmh(titan)).toBeGreaterThan(carTopSpeedKmh(hawk));
  });
});

describe('xp / level curve', () => {
  it('starts at level 1 with 0 xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('levels up monotonically and caps at 50', () => {
    expect(levelFromXp(600)).toBe(2);
    expect(levelFromXp(10_000_000)).toBe(50);
  });

  it('reports progress within the current level', () => {
    const p = xpProgress(700);
    expect(p.level).toBe(2);
    expect(p.current).toBe(100);
  });
});

describe('scoring table', () => {
  it('gives 1st place more than 8th', () => {
    expect(positionPoints(1, 8)).toBeGreaterThan(positionPoints(8, 8));
  });
});
