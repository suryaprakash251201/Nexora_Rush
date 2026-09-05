import type { CarDef, Difficulty } from 'shared';
import { DIFFICULTIES } from 'shared';
import type { TrackGeometry } from './track';
import { mulberry32 } from './track';

/**
 * AIController — kinematic spline followers with racing lines, braking
 * before corners, overtaking offsets, mistakes and nitro on straights.
 * Kinematic (not full physics) keeps 7 opponents cheap and race-competitive.
 */

export interface AIState {
  id: string;
  name: string;
  color: string;
  carId: string;
  s: number; // distance along track
  lateral: number; // current lateral offset
  lateralTarget: number;
  speed: number; // m/s
  nitroActive: boolean;
  mistakeT: number; // remaining mistake time
  mistakeCooldown: number;
  x: number;
  z: number;
  y: number;
  heading: number;
  lap: number;
  sProgress: number;
  lastS: number;
  lapStartMs: number;
  bumpCooldown: number;
}

const AI_NAMES = [
  'Viper', 'Nova', 'Rogue', 'Echo', 'Blitz', 'Havoc', 'Falcon', 'Rex',
  'Static', 'Cobra', 'Jinx', 'Onyx',
];

export class AIController {
  state: AIState;
  private skill: number;
  private speedMult: number;
  private rubberband: number;
  private mistakeRate: number;
  private vmax: number;
  private rand: () => number;
  private lanePhase: number;
  private laneFreq: number;
  private bumpV = 0;

  constructor(
    idx: number,
    car: CarDef,
    track: TrackGeometry,
    difficulty: Difficulty,
    private playerVmax: number
  ) {
    const d = DIFFICULTIES[difficulty];
    this.skill = d.aiSkill;
    this.speedMult = d.aiSpeedMult;
    this.rubberband = d.rubberband;
    this.mistakeRate = d.mistakeRate;
    this.vmax = carTopSpeedMs(car) * this.speedMult;
    this.rand = mulberry32(9000 + idx * 131);
    this.lanePhase = this.rand() * Math.PI * 2;
    this.laneFreq = 2 + this.rand() * 2;
    const startS = track.length - 12 - idx * 6.5;
    this.state = {
      id: `ai-${idx}`,
      name: AI_NAMES[idx % AI_NAMES.length],
      color: AI_COLORS[idx % AI_COLORS.length],
      carId: car.id,
      s: startS,
      lateral: idx % 2 === 0 ? -2.8 : 2.8,
      lateralTarget: 0,
      speed: 0,
      nitroActive: false,
      mistakeT: 0,
      mistakeCooldown: 4 + this.rand() * 6,
      x: 0,
      z: 0,
      y: 0,
      heading: 0,
      lap: 0,
      sProgress: 0,
      lastS: startS,
      lapStartMs: 0,
      bumpCooldown: 0,
    };
    this.syncWorld(track);
  }

  update(dt: number, track: TrackGeometry, timeMs: number, playerProgress: number, myProgress: number) {
    const st = this.state;
    const samples = track.sampleCount;

    // Look ahead for corner speed.
    const idx = Math.floor((st.s / track.length) * samples) % samples;
    const lookIdx = (idx + Math.round((26 + st.speed * 1.15) / (track.length / samples))) % samples;
    const curv = Math.abs(track.curvatureAt(lookIdx));
    const maxLatAccel = 26 * (0.55 + this.skill * 0.5);
    let target = Math.min(this.vmax, Math.sqrt(maxLatAccel / Math.max(curv, 1e-4)));

    // Racing line: smooth weave, hug inside of corners.
    const insideSign = -Math.sign(track.curvatureAt(lookIdx) || 1);
    const cornerPull = Math.min(1, curv * 55) * track.halfWidth * 0.55 * insideSign;
    const weave = Math.sin((st.s / 60) * this.laneFreq + this.lanePhase) * track.halfWidth * 0.18;
    st.lateralTarget = Math.max(
      -track.halfWidth + 2,
      Math.min(track.halfWidth - 2, cornerPull + weave)
    );

    // Mistakes
    st.mistakeCooldown -= dt;
    if (st.mistakeCooldown <= 0 && st.mistakeT <= 0) {
      if (this.rand() < this.mistakeRate * dt * 60) {
        st.mistakeT = 0.6 + this.rand() * 1.1;
      }
      st.mistakeCooldown = 2 + this.rand() * 5;
    }
    if (st.mistakeT > 0) {
      st.mistakeT -= dt;
      target *= 0.68;
      st.lateralTarget += Math.sin(timeMs / 90) * 2.2;
    }

    // Rubberband relative to player.
    const gap = playerProgress - myProgress;
    if (gap > 50) target *= 1 + this.rubberband;
    else if (gap < -90) target *= 1 - this.rubberband * 0.5;

    // Nitro on straights.
    st.nitroActive = curv < 0.004 && st.speed > this.vmax * 0.55 && this.rand() < 0.02 + this.skill * 0.05;
    if (st.nitroActive) target = Math.min(target * 1.16, this.vmax * 1.16);

    // Accelerate / brake toward target.
    const accel = 14 * this.skill + 6;
    if (st.speed < target) st.speed = Math.min(target, st.speed + accel * dt);
    else st.speed = Math.max(target, st.speed - 30 * dt);

    // Bump impulse from collisions decays.
    if (Math.abs(this.bumpV) > 0.01) {
      st.speed = Math.max(2, st.speed + this.bumpV);
      this.bumpV *= Math.exp(-6 * dt);
    }
    if (st.bumpCooldown > 0) st.bumpCooldown -= dt;

    // Advance along the spline.
    const prevS = st.s;
    st.s += st.speed * dt;
    const wrapped = st.s - track.length;
    if (wrapped >= 0) {
      st.s = wrapped;
      st.lap += 1;
    }
    // Progress accumulation for standings (handles wrap).
    const ds = st.s - st.lastS;
    const dsn = ds > track.length / 2 ? ds - track.length : ds < -track.length / 2 ? ds + track.length : ds;
    st.sProgress += dsn;
    st.lastS = st.s;
    void prevS;

    // Lateral easing + avoidance.
    st.lateral += (st.lateralTarget - st.lateral) * Math.min(1, dt * 2.2);

    this.syncWorld(track);
    st.lapStartMs = st.lapStartMs || timeMs;
  }

  /** Push from a collision (player or another AI). */
  bump(impulse: number) {
    if (this.state.bumpCooldown <= 0) {
      this.bumpV = impulse;
      this.state.speed *= 0.86;
      this.state.bumpCooldown = 0.8;
    }
  }

  private syncWorld(track: TrackGeometry) {
    const p = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
    track.posAtDistance(this.state.s, p);
    this.state.x = p.x + p.tz * this.state.lateral;
    this.state.z = p.z - p.tx * this.state.lateral;
    this.state.y = p.y;
    this.state.heading = Math.atan2(p.tx, p.tz);
  }
}

export function carTopSpeedMs(car: CarDef): number {
  return (180 + car.stats.speed * 1.4) / 3.6;
}

export const AI_COLORS = ['#e11d48', '#22d3ee', '#fbbf24', '#34d399', '#a78bfa', '#f97316', '#60a5fa', '#f43f5e'];
