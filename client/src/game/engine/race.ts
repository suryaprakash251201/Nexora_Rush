import type { CarDef, Difficulty, RaceMode, Weather } from 'shared';
import { DIFFICULTIES } from 'shared';
import type { TrackGeometry } from './track';
import {
  createCarState,
  placeOnGrid,
  physicsParams,
  stepCar,
  resetCar,
  wrapDelta,
} from './physics';
import { AIController } from './ai';
import type { CarState, Controls, RaceEventCounters } from './types';
import { EMPTY_CONTROLS } from './types';

export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface RacerStanding {
  id: string;
  name: string;
  isPlayer: boolean;
  color: string;
  lap: number;
  progress: number; // lap * length + s (m)
  position: number;
  finished: boolean;
}

export interface RaceEngineEvents {
  onCountdownTick?: (n: number) => void; // 3,2,1,0(=GO)
  onGo?: () => void;
  onLap?: (lapNumber: number, lapTimeMs: number) => void;
  onCollision?: (intensity: number) => void;
  onNearMiss?: () => void;
  onOvertake?: () => void;
  onNitroStart?: () => void;
  onLanded?: () => void;
  onFinish?: (position: number) => void;
  onDriftScore?: (points: number) => void;
}

export interface RaceEngineConfig {
  track: TrackGeometry;
  car: CarDef;
  aiCars: CarDef[];
  difficulty: Difficulty;
  laps: number;
  mode: RaceMode;
  weather: Weather;
}

const COUNTDOWN_MS = 3900;
const COLLISION_LIMIT_ENDLESS = 10;

export class RaceEngine {
  readonly config: RaceEngineConfig;
  readonly track: TrackGeometry;
  phase: RacePhase = 'countdown';
  timeMs = -COUNTDOWN_MS;
  player: CarState;
  ais: AIController[] = [];
  events: RaceEventCounters = {
    overtakes: 0,
    nearMisses: 0,
    driftPoints: 0,
    nitroChains: 0,
    collisions: 0,
    topSpeedKmh: 0,
  };
  lapTimesMs: number[] = [];
  bestLapMs: number | null = null;
  currentLapTimeMs = 0;
  lastLapMs: number | null = null;
  finishPosition = 0;
  raceFinishedMs: number | null = null;
  driftChain = 0;
  driftChainTimer = 0;
  wrecked = false;
  private countdownLastTick = 4;
  private aiWasBehind: boolean[] = [];
  private aiNearMissCooldown: number[] = [];
  private aiCollisionCooldown: number[] = [];
  private ev: RaceEngineEvents;

  constructor(config: RaceEngineConfig, ev: RaceEngineEvents = {}) {
    this.config = config;
    this.track = config.track;
    this.ev = ev;
    const P = physicsParams(config.car);
    this.player = createCarState('player', true, P.nitroCapacity);
    placeOnGrid(this.player, this.track, 0, P.nitroCapacity);

    if (config.mode !== 'time-trial') {
      const count = DIFFICULTIES[config.difficulty].aiCount;
      for (let i = 0; i < Math.min(count, config.aiCars.length); i++) {
        const ai = new AIController(i, config.aiCars[i], this.track, config.difficulty, P.maxSpeed);
        this.ais.push(ai);
        this.aiWasBehind.push(true);
        this.aiNearMissCooldown.push(0);
        this.aiCollisionCooldown.push(0);
      }
    }
  }

  get gridSize(): number {
    return 1 + this.ais.length;
  }

  get currentLap(): number {
    return Math.min(this.player.lap + 1, this.config.mode === 'endless' ? 99 : this.config.laps);
  }

  update(dtMs: number, controls: Controls) {
    const dt = Math.min(dtMs, 50) / 1000;
    const prevPhase = this.phase;
    this.timeMs += dtMs;

    if (this.phase === 'countdown') {
      const tick = Math.ceil(-this.timeMs / 1000);
      if (tick !== this.countdownLastTick && tick >= 0) {
        this.countdownLastTick = tick;
        if (tick > 0) this.ev.onCountdownTick?.(tick);
        else this.ev.onGo?.();
      }
      if (this.timeMs >= 0) {
        this.phase = 'racing';
        this.player.lapStartMs = 0;
      }
    }

    const playerControls: Controls =
      this.phase === 'countdown' || this.wrecked ? EMPTY_CONTROLS : controls;

    // --- player physics (substeps for stability) ---
    const substeps = 2;
    for (let i = 0; i < substeps; i++) {
      stepCar(this.player, this.track, {
        dt: dt / substeps,
        controls: playerControls,
        params: physicsParams(this.config.car),
        weather: this.config.weather,
        timeMs: this.phase === 'countdown' ? -100 : this.timeMs,
        onEvent: (e) => this.handlePlayerEvent(e),
      });
    }

    if (this.phase === 'racing') {
      this.currentLapTimeMs = this.timeMs - this.player.lapStartMs;
      this.events.topSpeedKmh = Math.max(this.events.topSpeedKmh, Math.abs(this.player.speed) * 3.6);

      // Drift scoring
      if (this.player.driftAmount > 0.25 && Math.abs(this.player.speed) > 9) {
        const pts = this.player.driftAmount * 120 * dt;
        this.events.driftPoints += pts;
        this.driftChainTimer = 1.2;
        this.ev.onDriftScore?.(pts);
      } else if (this.driftChainTimer > 0) {
        this.driftChainTimer -= dt;
      }

      // Nitro chains (activated near top speed)
      if (this.player.nitroActive && !this.wasNitroActive && this.player.speed > physicsParams(this.config.car).maxSpeed * 0.78) {
        this.events.nitroChains += 1;
      }
      this.wasNitroActive = this.player.nitroActive;
    }

    // --- AI ---
    const playerProgress = this.player.lap * this.track.length + this.player.sProgress;
    if (this.phase !== 'countdown' && !this.wrecked) {
      for (const ai of this.ais) {
        const myProgress = ai.state.lap * this.track.length + ai.state.sProgress;
        ai.update(dt, this.track, this.timeMs, playerProgress, myProgress);
      }
      this.resolveCollisions(dt);
    }

    // --- standings / position ---
    if (this.phase === 'racing') {
      const pos = this.computePosition();
      if (pos < this.lastPosition) this.ev.onOvertake?.();
      this.lastPosition = pos;

      // finish check
      const targetLaps = this.config.mode === 'endless' ? Infinity : this.config.laps;
      if (this.player.lap >= targetLaps) {
        this.finish();
      } else if (this.config.mode === 'endless' && this.events.collisions >= COLLISION_LIMIT_ENDLESS) {
        this.wrecked = true;
        this.finish();
      }
    }

    if (prevPhase === 'countdown' && this.phase === 'racing') {
      // noop hook point
    }
  }

  private wasNitroActive = false;
  private lastPosition = 99;

  private handlePlayerEvent(e: { type: string; lapTimeMs?: number }) {
    switch (e.type) {
      case 'lap': {
        const t = e.lapTimeMs ?? 0;
        this.lapTimesMs.push(t);
        this.lastLapMs = t;
        if (this.bestLapMs == null || t < this.bestLapMs) this.bestLapMs = t;
        this.ev.onLap?.(this.player.lap, t);
        break;
      }
      case 'wall':
        if (this.player.collisionCooldown <= 0) {
          this.events.collisions += 1;
          this.player.collisionCooldown = 0.8;
          this.ev.onCollision?.(0.6);
        }
        break;
      case 'nitro-start':
        this.ev.onNitroStart?.();
        break;
      case 'landed':
        this.ev.onLanded?.();
        break;
    }
  }

  private resolveCollisions(dt: number) {
    const p = this.player;
    for (let i = 0; i < this.ais.length; i++) {
      const a = this.ais[i].state;
      const dx = a.x - p.x;
      const dz = a.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3.6 && dist > 0.01) {
        // separate
        const nx = dx / dist;
        const nz = dz / dist;
        const push = (3.6 - dist) * 0.5;
        p.x -= nx * push;
        p.z -= nz * push;
        const relSpeed = Math.hypot(p.vx - 0, p.vz - 0) - a.speed;
        if (this.aiCollisionCooldown[i] <= 0 && Math.abs(relSpeed) > 5) {
          this.aiCollisionCooldown[i] = 1.0;
          this.events.collisions += 1;
          p.speed *= 0.9;
          this.ev.onCollision?.(0.9);
        }
        this.ais[i].bump(-a.speed * 0.04);
      } else if (dist < 5.2 && this.aiNearMissCooldown[i] <= 0 && this.phase === 'racing') {
        const closing = Math.abs(a.speed - Math.abs(p.speed));
        if (closing > 8) {
          this.aiNearMissCooldown[i] = 2.5;
          this.events.nearMisses += 1;
          this.ev.onNearMiss?.();
        }
      }
      if (this.aiNearMissCooldown[i] > 0) this.aiNearMissCooldown[i] -= dt;
      if (this.aiCollisionCooldown[i] > 0) this.aiCollisionCooldown[i] -= dt;

      // overtake tracking
      const aiProgress = a.lap * this.track.length + a.sProgress;
      const myProgress = p.lap * this.track.length + p.sProgress;
      const isBehind = aiProgress < myProgress;
      if (this.aiWasBehind[i] && !isBehind && this.phase === 'racing') {
        this.events.overtakes += 1;
        this.ev.onOvertake?.();
      }
      this.aiWasBehind[i] = isBehind;
    }
  }

  computePosition(): number {
    const myProgress = this.player.lap * this.track.length + this.player.sProgress;
    let pos = 1;
    for (const ai of this.ais) {
      const ap = ai.state.lap * this.track.length + ai.state.sProgress;
      if (ap > myProgress) pos++;
    }
    return pos;
  }

  standings(): RacerStanding[] {
    const list: RacerStanding[] = [
      {
        id: 'player',
        name: 'YOU',
        isPlayer: true,
        color: '#22d3ee',
        lap: this.player.lap,
        progress: this.player.lap * this.track.length + this.player.sProgress,
        position: 0,
        finished: this.phase === 'finished',
      },
    ];
    for (const ai of this.ais) {
      list.push({
        id: ai.state.id,
        name: ai.state.name,
        isPlayer: false,
        color: ai.state.color,
        lap: ai.state.lap,
        progress: ai.state.lap * this.track.length + ai.state.sProgress,
        position: 0,
        finished: false,
      });
    }
    list.sort((a, b) => b.progress - a.progress);
    list.forEach((r, i) => (r.position = i + 1));
    return list;
  }

  /** Reset player onto the track (R key). */
  resetPlayer() {
    resetCar(this.player, this.track, physicsParams(this.config.car).nitroCapacity);
  }

  private finish() {
    if (this.phase === 'finished') return;
    this.phase = 'finished';
    this.raceFinishedMs = this.timeMs;
    this.finishPosition = this.computePosition();
    this.ev.onFinish?.(this.finishPosition);
  }

  /** Quitting early counts as a DNF finish. */
  quitEarly() {
    if (this.phase === 'finished') return;
    this.phase = 'finished';
    this.raceFinishedMs = this.timeMs;
    this.finishPosition = this.computePosition();
  }

  /** Client-side score estimate for live HUD display. */
  scoreEstimate(fastLap: boolean): number {
    const finished = this.phase === 'finished' && !this.wrecked;
    const position = this.finishPosition || this.computePosition();
    const table = [5000, 4200, 3600, 3100, 2600, 2200, 1800, 1400, 1000];
    let score = 0;
    if (this.config.mode === 'endless') {
      score += (this.timeMs / 1000) * 60;
      score += this.events.overtakes * 150;
    } else if (finished) {
      score += table[Math.min(position - 1, table.length - 1)];
      if (fastLap) score += 2500;
      score += this.events.nearMisses * 300;
      score += this.events.nitroChains * 400;
      score += this.events.collisions === 0 ? 2000 : 0;
    }
    score += Math.min(this.events.driftPoints, 8000) * 2;
    if (this.wrecked) score *= 0.7;
    return Math.round(score * DIFFICULTIES[this.config.difficulty].scoreMult);
  }
}
