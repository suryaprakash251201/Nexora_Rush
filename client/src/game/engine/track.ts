import * as THREE from 'three';

/**
 * Track geometry — a closed Catmull-Rom loop with sampled centerline arrays
 * for fast projection, plus road/edge mesh generation and surface queries.
 */

export interface TrackSample {
  x: number;
  z: number;
  y: number;
}

export interface TrackProjection {
  idx: number; // sample index
  s: number; // distance along track (m)
  lateral: number; // signed lateral offset from centerline (m, +right)
  tangentX: number;
  tangentZ: number;
  elevation: number;
}

export interface TrackControlDef {
  seed: number;
  radius: number; // base loop radius (m)
  points: number; // control point count
  wobble1: number; // harmonic amplitudes for shape character
  wobble2: number;
  wobble3: number;
  elevation: number; // max elevation amplitude (m)
  elevationFreq: number;
  width: number; // road width (m)
  squishX: number; // elliptical scale
  squishZ: number;
}

export class TrackGeometry {
  readonly sampleCount: number;
  readonly length: number;
  readonly width: number;
  readonly halfWidth: number;
  readonly px: Float32Array;
  readonly pz: Float32Array;
  readonly py: Float32Array;
  readonly tx: Float32Array;
  readonly tz: Float32Array;
  readonly curve: THREE.CatmullRomCurve3;

  constructor(controls: THREE.Vector3[], width: number, samples = 1200) {
    this.curve = new THREE.CatmullRomCurve3(controls, true, 'catmullrom', 0.5);
    this.sampleCount = samples;
    this.width = width;
    this.halfWidth = width / 2;
    const pts = this.curve.getSpacedPoints(samples); // returns samples+1 points, last == first
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

  sampleAt(i: number): TrackSample {
    const idx = ((i % this.sampleCount) + this.sampleCount) % this.sampleCount;
    return { x: this.px[idx], z: this.pz[idx], y: this.py[idx] };
  }

  /** Position at distance s along the loop. */
  posAtDistance(s: number, out: { x: number; z: number; y: number; tx: number; tz: number }) {
    let d = ((s % this.length) + this.length) % this.length;
    const f = (d / this.length) * this.sampleCount;
    const i = Math.floor(f) % this.sampleCount;
    const frac = f - Math.floor(f);
    const j = (i + 1) % this.sampleCount;
    out.x = this.px[i] + (this.px[j] - this.px[i]) * frac;
    out.z = this.pz[i] + (this.pz[j] - this.pz[i]) * frac;
    out.y = this.py[i] + (this.py[j] - this.py[i]) * frac;
    out.tx = this.tx[i];
    out.tz = this.tz[i];
  }

  /** Curvature estimate at sample i (rad per meter, positive = left turn). */
  curvatureAt(i: number): number {
    const a = ((i - 6) + this.sampleCount) % this.sampleCount;
    const b = i % this.sampleCount;
    const c = (i + 6) % this.sampleCount;
    // angle between tangents a->b and b->c
    const cross = this.tx[a] * this.tz[c] - this.tz[a] * this.tx[c];
    const dist = 12; // approx meters between a and c
    return cross / dist;
  }

  /** Nearest-point projection with local search around a hint index. */
  project(x: number, z: number, hint: number): TrackProjection {
    const n = this.sampleCount;
    let bestIdx = hint;
    let bestD = Infinity;
    const window = 60;
    for (let k = -window; k <= window; k++) {
      const i = (((hint + k) % n) + n) % n;
      const dx = x - this.px[i];
      const dz = z - this.pz[i];
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    // If hint is stale (e.g. after reset), do a global coarse search.
    if (bestD > 3600) {
      for (let i = 0; i < n; i += 8) {
        const dx = x - this.px[i];
        const dz = z - this.pz[i];
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      for (let k = -8; k <= 8; k++) {
        const i = (((bestIdx + k) % n) + n) % n;
        const dx = x - this.px[i];
        const dz = z - this.pz[i];
        const d = dx * dx + dz * dz;
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
    }
    const tx = this.tx[bestIdx];
    const tz = this.tz[bestIdx];
    const dx = x - this.px[bestIdx];
    const dz = z - this.pz[bestIdx];
    // right-hand normal of tangent (tx, tz) is (tz, -tx)
    const lateral = dx * tz - dz * tx;
    const along = dx * tx + dz * tz;
    const s = (bestIdx / n) * this.length + along;
    return {
      idx: bestIdx,
      s,
      lateral,
      tangentX: tx,
      tangentZ: tz,
      elevation: this.py[bestIdx],
    };
  }

  surfaceFor(lateralAbs: number): 'road' | 'shoulder' | 'offroad' {
    if (lateralAbs <= this.halfWidth) return 'road';
    if (lateralAbs <= this.halfWidth + 2.5) return 'shoulder';
    return 'offroad';
  }

  /**
   * Road ribbon mesh (top surface) with UVs, plus low barrier rails.
   */
  buildRoadGeometry(segments = 4): THREE.BufferGeometry {
    const n = this.sampleCount;
    const vertsPerRow = segments + 1;
    const positions = new Float32Array(n * vertsPerRow * 3);
    const uvs = new Float32Array(n * vertsPerRow * 2);
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const cx = this.px[i];
      const cz = this.pz[i];
      const cy = this.py[i];
      const nx = this.tz[i];
      const nz = -this.tx[i];
      for (let k = 0; k <= segments; k++) {
        const t = k / segments; // 0..1 across road
        const off = (t - 0.5) * this.width;
        const base = (i * vertsPerRow + k) * 3;
        positions[base] = cx + nx * off;
        positions[base + 1] = cy;
        positions[base + 2] = cz + nz * off;
        const uvBase = (i * vertsPerRow + k) * 2;
        uvs[uvBase] = (i / n) * 40;
        uvs[uvBase + 1] = t * 3;
      }
    }
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      for (let k = 0; k < segments; k++) {
        const a = i * vertsPerRow + k;
        const b = i2 * vertsPerRow + k;
        const c = i2 * vertsPerRow + k + 1;
        const d = i * vertsPerRow + k + 1;
        indices.push(a, b, c, a, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /** Start/finish line position (index 0). */
  get startLine(): TrackSample {
    return { x: this.px[0], z: this.pz[0], y: this.py[0] };
  }
}

/** Deterministic PRNG so tracks are identical on every client. */
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

/** Generates a characterful closed loop from a compact parameter set. */
export function generateControlPoints(def: TrackControlDef): THREE.Vector3[] {
  const rand = mulberry32(def.seed);
  const phase1 = rand() * Math.PI * 2;
  const phase2 = rand() * Math.PI * 2;
  const phase3 = rand() * Math.PI * 2;
  const ePhase1 = rand() * Math.PI * 2;
  const ePhase2 = rand() * Math.PI * 2;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < def.points; i++) {
    const a = (i / def.points) * Math.PI * 2;
    const r =
      def.radius *
      (1 +
        def.wobble1 * Math.sin(a * 3 + phase1) +
        def.wobble2 * Math.sin(a * 5 + phase2) +
        def.wobble3 * Math.sin(a * 8 + phase3));
    const x = Math.sin(a) * r * def.squishX;
    const z = Math.cos(a) * r * def.squishZ;
    const y =
      def.elevation *
      (0.6 * Math.sin(a * def.elevationFreq + ePhase1) + 0.4 * Math.sin(a * (def.elevationFreq * 2.4) + ePhase2));
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}
