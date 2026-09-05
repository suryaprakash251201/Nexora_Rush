import type { CarDef, Difficulty, RaceMode, Weather } from 'shared';
import { DIFFICULTIES } from 'shared';
import type { TrackGeometry } from './track';
import { freshCar, toGrid, toTrack, tuneFor, stepCar } from './physics';
import { RivalDriver } from './ai';
import { NEUTRAL, type CarState, type Controls, type EventCounters } from './types';

export type EnginePhase = 'countdown' | 'racing' | 'finished';

export interface RacerStanding {
  id: string;
  name: string;
  me: boolean;
  color: string;
  progress: number;
  position: number;
}

export interface EngineEvents {
  onTick?: (n: number) => void; // 3,2,1
  onGo?: () => void;
  onLap?: () => void;
  onHit?: (hard: number) => void;
  onNear?: () => void;
  onPass?: () => void;
  onBoost?: () => void;
}

export interface EngineConfig {
  track: TrackGeometry;
  car: CarDef;
  rivals: CarDef[];
  difficulty: Difficulty;
  laps: number;
  mode: RaceMode;
  weather: Weather;
}

export const COUNTDOWN_MS = 3900;
const WRECK_HITS = 10;

export interface FinishedSummary {
  position: number;
  grid: number;
  raceMs: number | null;
  bestMs: number | null;
  lapsMs: number[];
  overtakes: number;
  nearMisses: number;
  drift: number;
  boosts: number;
  topKmh: number;
  hits: number;
  wrecked: boolean;
  fastLap: boolean;
}

export class RaceEngine {
  readonly cfg: EngineConfig;
  readonly track: TrackGeometry;
  phase: EnginePhase = 'countdown';
  timeMs = -COUNTDOWN_MS;
  player: CarState;
  rivals: RivalDriver[] = [];
  events: EventCounters = { overtakes: 0, nearMisses: 0, driftPoints: 0, nitroChains: 0, collisions: 0, topSpeedKmh: 0 };
  lapTimesMs: number[] = [];
  bestLapMs: number | null = null;
  lastLapMs: number | null = null;
  lapClockMs = 0;
  finishPosition = 0;
  raceFinishedMs: number | null = null;
  wrecked = false;

  private tick = 4;
  private behind: boolean[] = [];
  private nearWait: number[] = [];
  private hitWait: number[] = [];
  private wasBoost = false;
  private lastPos = 99;
  private ev: EngineEvents;

  constructor(cfg: EngineConfig, ev: EngineEvents = {}) {
    this.cfg = cfg;
    this.track = cfg.track;
    this.ev = ev;
    const tune = tuneFor(cfg.car);
    this.player = freshCar(true, tune.tank);
    toGrid(this.player, this.track, 0, tune.tank);
    if (cfg.mode !== 'time-trial') {
      const count = DIFFICULTIES[cfg.difficulty].aiCount;
      cfg.rivals.slice(0, count).forEach((c, i) => {
        this.rivals.push(new RivalDriver(i, c, this.track, cfg.difficulty));
        this.behind.push(true);
        this.nearWait.push(0);
        this.hitWait.push(0);
      });
    }
  }

  get gridSize(): number {
    return 1 + this.rivals.length;
  }

  get currentLap(): number {
    return this.cfg.mode === 'endless' ? 99 : Math.min(this.player.lap + 1, this.cfg.laps);
  }

  /**
   * Advance the simulation. Call with FIXED steps (e.g. 1/60) accumulated from
   * wall-clock time so the race progresses in real time at any frame rate.
   */
  update(dtMs: number, controls: Controls) {
    const dt = Math.min(dtMs, 100) / 1000;
    this.timeMs += dtMs;

    if (this.phase === 'countdown') {
      const tick = Math.ceil(-this.timeMs / 1000);
      if (tick !== this.tick && tick >= 0) {
        this.tick = tick;
        if (tick > 0) this.ev.onTick?.(tick);
        else this.ev.onGo?.();
      }
      if (this.timeMs >= 0) {
        this.phase = 'racing';
        this.player.lapStartMs = 0;
      }
    }

    const input = this.phase === 'countdown' || this.wrecked ? NEUTRAL : controls;
    const tune = tuneFor(this.cfg.car);
    const half = dt / 2;
    for (let i = 0; i < 2; i++) {
      stepCar(this.player, this.track, {
        dt: half,
        controls: input,
        tune,
        weather: this.cfg.weather,
        clockMs: this.phase === 'countdown' ? -100 : this.timeMs,
        events: (e) => this.onPlayerEvent(e),
      });
    }

    if (this.phase === 'racing') {
      this.lapClockMs = this.timeMs - this.player.lapStartMs;
      this.events.topSpeedKmh = Math.max(this.events.topSpeedKmh, Math.abs(this.player.speed) * 3.6);
      if (this.player.drift > 0.25 && Math.abs(this.player.speed) > 9) {
        this.events.driftPoints += this.player.drift * 120 * dt;
      }
      if (this.player.boosting && !this.wasBoost && this.player.speed > tune.top * 0.78) {
        this.events.nitroChains += 1;
      }
      this.wasBoost = this.player.boosting;
    }

    if (this.phase !== 'countdown' && !this.wrecked) {
      const mine = this.progressOf(this.player.lap, this.player.progress);
      for (const r of this.rivals) {
        const st = r.state;
        r.update(dt, this.track, this.timeMs, mine, this.progressOf(st.lap, st.progress));
      }
      this.collide(dt);
    }

    if (this.phase === 'racing') {
      const pos = this.computePosition();
      if (pos < this.lastPos) this.ev.onPass?.();
      this.lastPos = pos;
      const laps = this.cfg.mode === 'endless' ? Infinity : this.cfg.laps;
      if (this.player.lap >= laps) this.finish();
      else if (this.cfg.mode === 'endless' && this.events.collisions >= WRECK_HITS) {
        this.wrecked = true;
        this.finish();
      }
    }
  }

  private progressOf(lap: number, p: number): number {
    return lap * this.track.length + p;
  }

  private onPlayerEvent(e: { type: string; lapMs?: number }) {
    if (e.type === 'lap') {
      const t = e.lapMs ?? 0;
      this.lapTimesMs.push(t);
      this.lastLapMs = t;
      if (this.bestLapMs == null || t < this.bestLapMs) this.bestLapMs = t;
      this.ev.onLap?.();
    } else if (e.type === 'wall') {
      if (this.player.hitCooldown <= 0) {
        this.player.hitCooldown = 0.8;
        this.events.collisions += 1;
        this.ev.onHit?.(0.6);
      }
    } else if (e.type === 'boost') {
      this.ev.onBoost?.();
    }
  }

  private collide(dt: number) {
    const p = this.player;
    for (let i = 0; i < this.rivals.length; i++) {
      const a = this.rivals[i].state;
      const dx = a.x - p.x;
      const dz = a.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 3.6 && dist > 0.01) {
        const nx = dx / dist;
        const nz = dz / dist;
        const push = (3.6 - dist) * 0.5;
        p.x -= nx * push;
        p.z -= nz * push;
        const closing = Math.hypot(p.vx, p.vz) - a.speed;
        if (this.hitWait[i] <= 0 && Math.abs(closing) > 5) {
          this.hitWait[i] = 1;
          this.events.collisions += 1;
          p.speed *= 0.9;
          this.ev.onHit?.(0.9);
        }
        this.rivals[i].shove(-a.speed * 0.04);
      } else if (dist < 5.2 && this.nearWait[i] <= 0 && this.phase === 'racing') {
        if (Math.abs(a.speed - Math.abs(p.speed)) > 8) {
          this.nearWait[i] = 2.5;
          this.events.nearMisses += 1;
          this.ev.onNear?.();
        }
      }
      if (this.nearWait[i] > 0) this.nearWait[i] -= dt;
      if (this.hitWait[i] > 0) this.hitWait[i] -= dt;

      const mine = this.progressOf(p.lap, p.progress);
      const theirs = this.progressOf(a.lap, a.progress);
      const isBehind = theirs < mine;
      if (this.behind[i] && !isBehind && this.phase === 'racing') {
        this.events.overtakes += 1;
        this.ev.onPass?.();
      }
      this.behind[i] = isBehind;
    }
  }

  computePosition(): number {
    const mine = this.progressOf(this.player.lap, this.player.progress);
    let pos = 1;
    for (const r of this.rivals) {
      if (this.progressOf(r.state.lap, r.state.progress) > mine) pos++;
    }
    return pos;
  }

  standings(): RacerStanding[] {
    const list: RacerStanding[] = [
      { id: 'you', name: 'YOU', me: true, color: '#22d3ee', progress: this.progressOf(this.player.lap, this.player.progress), position: 0 },
    ];
    for (const r of this.rivals) {
      list.push({ id: r.state.id, name: r.state.name, me: false, color: r.state.color, progress: this.progressOf(r.state.lap, r.state.progress), position: 0 });
    }
    list.sort((a, b) => b.progress - a.progress);
    list.forEach((r, i) => (r.position = i + 1));
    return list;
  }

  resetPlayer() {
    toTrack(this.player, this.track, tuneFor(this.cfg.car).tank);
  }

  quitEarly() {
    if (this.phase === 'finished') return this.summary();
    this.phase = 'finished';
    this.raceFinishedMs = this.timeMs;
    this.finishPosition = this.computePosition();
    return this.summary();
  }

  private finish() {
    if (this.phase === 'finished') return;
    this.phase = 'finished';
    this.raceFinishedMs = this.timeMs;
    this.finishPosition = this.computePosition();
  }

  summary(): FinishedSummary {
    const fast =
      this.bestLapMs != null &&
      this.lapTimesMs.length > 0 &&
      this.bestLapMs <= Math.min(...this.lapTimesMs);
    return {
      position: this.finishPosition,
      grid: this.gridSize,
      raceMs: this.raceFinishedMs != null ? Math.round(this.raceFinishedMs) : null,
      bestMs: this.bestLapMs != null ? Math.round(this.bestLapMs) : null,
      lapsMs: this.lapTimesMs.map((t) => Math.round(t)),
      overtakes: this.events.overtakes,
      nearMisses: this.events.nearMisses,
      drift: Math.round(this.events.driftPoints),
      boosts: this.events.nitroChains,
      topKmh: Math.round(this.events.topSpeedKmh),
      hits: this.events.collisions,
      wrecked: this.wrecked,
      fastLap: fast,
    };
  }
}
