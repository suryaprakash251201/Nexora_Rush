import type { CarDef, Difficulty } from 'shared';
import { DIFFICULTIES } from 'shared';
import type { TrackGeometry } from './track';
import { mulberry32 } from './track';

/**
 * Kinematic AI rivals: spline followers with racing lines, corner braking,
 * overtaking weave, mistakes, straight-line nitro and rubber-banding.
 */

export interface Rival {
  id: string;
  name: string;
  color: string;
  carId: string;
  s: number;
  lateral: number;
  aim: number;
  speed: number;
  boosting: boolean;
  mistake: number;
  mistakeWait: number;
  x: number;
  z: number;
  y: number;
  heading: number;
  lap: number;
  progress: number;
  lastS: number;
  bump: number;
  bumpWait: number;
}

const NAMES = ['Viper', 'Nova', 'Rogue', 'Echo', 'Blitz', 'Havoc', 'Falcon', 'Rex'];
export const RIVAL_COLORS = ['#f43f5e', '#22d3ee', '#fbbf24', '#34d399', '#a78bfa', '#fb923c', '#60a5fa', '#e879f9'];

export function rivalTopSpeed(car: CarDef): number {
  return (180 + car.stats.speed * 1.4) / 3.6;
}

export class RivalDriver {
  state: Rival;
  private skill: number;
  private mult: number;
  private band: number;
  private errRate: number;
  private vmax: number;
  private rand: () => number;
  private phase: number;
  private freq: number;

  constructor(idx: number, car: CarDef, track: TrackGeometry, difficulty: Difficulty) {
    const d = DIFFICULTIES[difficulty];
    this.skill = d.aiSkill;
    this.mult = d.aiSpeedMult;
    this.band = d.rubberband;
    this.errRate = d.mistakeRate;
    this.vmax = rivalTopSpeed(car) * this.mult;
    this.rand = mulberry32(9000 + idx * 131);
    this.phase = this.rand() * Math.PI * 2;
    this.freq = 2 + this.rand() * 2;
    const startS = track.length - 12 - idx * 6.5;
    this.state = {
      id: `rival-${idx}`,
      name: NAMES[idx % NAMES.length],
      color: RIVAL_COLORS[idx % RIVAL_COLORS.length],
      carId: car.id,
      s: startS,
      lateral: idx % 2 === 0 ? -2.8 : 2.8,
      aim: 0,
      speed: 0,
      boosting: false,
      mistake: 0,
      mistakeWait: 4 + this.rand() * 6,
      x: 0, z: 0, y: 0, heading: 0,
      lap: 0,
      progress: 0,
      lastS: startS,
      bump: 0,
      bumpWait: 0,
    };
    this.place(track);
  }

  update(dt: number, track: TrackGeometry, clockMs: number, playerProgress: number, myProgress: number) {
    const st = this.state;
    const n = track.samples;
    const idx = Math.floor((st.s / track.length) * n) % n;
    const look = (idx + Math.round((26 + st.speed * 1.15) / (track.length / n))) % n;
    const curve = Math.abs(track.curvatureAt(look));
    const latG = 26 * (0.55 + this.skill * 0.5);
    let target = Math.min(this.vmax, Math.sqrt(latG / Math.max(curve, 1e-4)));

    // racing line: cut to the inside, gentle weave on straights
    const inside = -Math.sign(track.curvatureAt(look) || 1);
    const pull = Math.min(1, curve * 55) * track.half * 0.55 * inside;
    const weave = Math.sin((st.s / 60) * this.freq + this.phase) * track.half * 0.18;
    st.aim = Math.max(-track.half + 2, Math.min(track.half - 2, pull + weave));

    // mistakes
    st.mistakeWait -= dt;
    if (st.mistakeWait <= 0 && st.mistake <= 0) {
      if (this.rand() < this.errRate * dt * 60) st.mistake = 0.6 + this.rand() * 1.1;
      st.mistakeWait = 2 + this.rand() * 5;
    }
    if (st.mistake > 0) {
      st.mistake -= dt;
      target *= 0.68;
      st.aim += Math.sin(clockMs / 90) * 2.2;
    }

    // rubber-band to the player
    const gap = playerProgress - myProgress;
    if (gap > 50) target *= 1 + this.band;
    else if (gap < -90) target *= 1 - this.band * 0.5;

    // nitro on straights
    st.boosting = curve < 0.004 && st.speed > this.vmax * 0.55 && this.rand() < 0.02 + this.skill * 0.05;
    if (st.boosting) target = Math.min(target * 1.16, this.vmax * 1.16);

    const accel = 4.5 + this.skill * 3;
    if (st.speed < target) st.speed = Math.min(target, st.speed + accel * dt);
    else st.speed = Math.max(target, st.speed - 30 * dt);

    if (Math.abs(st.bump) > 0.01) {
      st.speed = Math.max(2, st.speed + st.bump);
      st.bump *= Math.exp(-6 * dt);
    }
    if (st.bumpWait > 0) st.bumpWait -= dt;

    st.s += st.speed * dt;
    if (st.s >= track.length) {
      st.s -= track.length;
      st.lap += 1;
    }
    const ds = st.s - st.lastS;
    st.progress += ds > track.length / 2 ? ds - track.length : ds < -track.length / 2 ? ds + track.length : ds;
    st.lastS = st.s;
    st.lateral += (st.aim - st.lateral) * Math.min(1, dt * 2.2);
    this.place(track);
  }

  shove(impulse: number) {
    if (this.state.bumpWait <= 0) {
      this.state.bump = impulse;
      this.state.speed *= 0.86;
      this.state.bumpWait = 0.8;
    }
  }

  private place(track: TrackGeometry) {
    const p = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
    track.posAt(this.state.s, p);
    this.state.x = p.x + p.tz * this.state.lateral;
    this.state.z = p.z - p.tx * this.state.lateral;
    this.state.y = p.y;
    this.state.heading = Math.atan2(p.tx, p.tz);
  }
}
