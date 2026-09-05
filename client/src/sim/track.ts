import * as THREE from 'three';

/**
 * Closed-loop track spline with fast projection and ribbon-mesh building.
 * Deterministic: the same seed always yields the same circuit.
 */

export interface TrackPoint {
  x: number;
  z: number;
  y: number;
}

export interface TrackControl {
  seed: number;
  radius: number;
  points: number;
  w1: number;
  w2: number;
  w3: number;
  elev: number;
  elevFreq: number;
  width: number;
  squashX: number;
  squashZ: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function controlPoints(def: TrackControl): THREE.Vector3[] {
  const rand = mulberry32(def.seed);
  const p1 = rand() * Math.PI * 2;
  const p2 = rand() * Math.PI * 2;
  const p3 = rand() * Math.PI * 2;
  const e1 = rand() * Math.PI * 2;
  const e2 = rand() * Math.PI * 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < def.points; i++) {
    const a = (i / def.points) * Math.PI * 2;
    const r =
      def.radius *
      (1 + def.w1 * Math.sin(a * 3 + p1) + def.w2 * Math.sin(a * 5 + p2) + def.w3 * Math.sin(a * 8 + p3));
    pts.push(
      new THREE.Vector3(
        Math.sin(a) * r * def.squashX,
        def.elev * (0.6 * Math.sin(a * def.elevFreq + e1) + 0.4 * Math.sin(a * def.elevFreq * 2.4 + e2)),
        Math.cos(a) * r * def.squashZ
      )
    );
  }
  return pts;
}

export class TrackGeometry {
  readonly samples: number;
  readonly length: number;
  readonly width: number;
  readonly half: number;
  readonly px: Float32Array;
  readonly pz: Float32Array;
  readonly py: Float32Array;
  readonly tx: Float32Array;
  readonly tz: Float32Array;

  constructor(controls: THREE.Vector3[], width: number, samples = 1200) {
    const curve = new THREE.CatmullRomCurve3(controls, true, 'catmullrom', 0.5);
    this.samples = samples;
    this.width = width;
    this.half = width / 2;
    const pts = curve.getSpacedPoints(samples);
    this.px = new Float32Array(samples);
    this.pz = new Float32Array(samples);
    this.py = new Float32Array(samples);
    this.tx = new Float32Array(samples);
    this.tz = new Float32Array(samples);
    let length = 0;
    for (let i = 0; i < samples; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % samples];
      this.px[i] = a.x;
      this.py[i] = a.y;
      this.pz[i] = a.z;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      this.tx[i] = dx / len;
      this.tz[i] = dz / len;
      length += len;
    }
    this.length = length;
  }

  at(i: number): TrackPoint {
    const idx = ((i % this.samples) + this.samples) % this.samples;
    return { x: this.px[idx], z: this.pz[idx], y: this.py[idx] };
  }

  /** World position + tangent at loop distance s. */
  posAt(s: number, out: { x: number; z: number; y: number; tx: number; tz: number }) {
    const d = ((s % this.length) + this.length) % this.length;
    const f = (d / this.length) * this.samples;
    const i = Math.floor(f) % this.samples;
    const t = f - Math.floor(f);
    const j = (i + 1) % this.samples;
    out.x = this.px[i] + (this.px[j] - this.px[i]) * t;
    out.z = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    out.y = this.py[i] + (this.py[j] - this.py[i]) * t;
    out.tx = this.tx[i];
    out.tz = this.tz[i];
  }

  /** Signed curvature estimate (rad/m, positive = left). */
  curvatureAt(i: number): number {
    const n = this.samples;
    const a = (((i - 6) % n) + n) % n;
    const c = (i + 6) % n;
    return (this.tx[a] * this.tz[c] - this.tz[a] * this.tx[c]) / 12;
  }

  /** Nearest-point projection, locally around a hint (global fallback if stale). */
  project(x: number, z: number, hint: number): { idx: number; s: number; lateral: number; tx: number; tz: number; y: number } {
    const n = this.samples;
    let best = hint;
    let bestD = Infinity;
    for (let k = -60; k <= 60; k++) {
      const i = (((hint + k) % n) + n) % n;
      const dx = x - this.px[i];
      const dz = z - this.pz[i];
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (bestD > 3600) {
      for (let i = 0; i < n; i += 8) {
        const dx = x - this.px[i];
        const dz = z - this.pz[i];
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      for (let k = -8; k <= 8; k++) {
        const i = (((best + k) % n) + n) % n;
        const dx = x - this.px[i];
        const dz = z - this.pz[i];
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    const tx = this.tx[best];
    const tz = this.tz[best];
    const dx = x - this.px[best];
    const dz = z - this.pz[best];
    return {
      idx: best,
      s: (best / n) * this.length + dx * tx + dz * tz,
      lateral: dx * tz - dz * tx,
      tx,
      tz,
      y: this.py[best],
    };
  }

  zone(lateralAbs: number): 'road' | 'shoulder' | 'off' {
    if (lateralAbs <= this.half) return 'road';
    if (lateralAbs <= this.half + 2.5) return 'shoulder';
    return 'off';
  }

  /** Triangle ribbon for the road surface. */
  roadMesh(across = 6): THREE.BufferGeometry {
    const n = this.samples;
    const row = across + 1;
    const pos = new Float32Array(n * row * 3);
    const uv = new Float32Array(n * row * 2);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const nx = this.tz[i];
      const nz = -this.tx[i];
      for (let k = 0; k <= across; k++) {
        const t = k / across;
        const off = (t - 0.5) * this.width;
        const b = (i * row + k) * 3;
        pos[b] = this.px[i] + nx * off;
        pos[b + 1] = this.py[i];
        pos[b + 2] = this.pz[i] + nz * off;
        const u = (i * row + k) * 2;
        uv[u] = (i / n) * 40;
        uv[u + 1] = t * 3;
      }
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      for (let k = 0; k < across; k++) {
        const a = i * row + k;
        const b = j * row + k;
        idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  get start(): TrackPoint {
    return { x: this.px[0], z: this.pz[0], y: this.py[0] };
  }
}
