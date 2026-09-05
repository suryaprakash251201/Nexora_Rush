import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { Theme } from './themes';
import type { TrackGeometry } from '@/sim/track';
import { mulberry32 } from '@/sim/track';
import { useSettings } from '@/store/settings';

/**
 * Lightweight themed world: gradient sky, ground disc, road, neon edges,
 * start gantry, instanced props and one cheap particle system.
 * NOTE: lights + fog live at the Canvas root (see scenes/race) — the
 * documented R3F pattern. Do not nest them in this group.
 */
export function World({ theme, track, weather }: { theme: Theme; track: TrackGeometry; weather: string }) {
  const quality = useSettings((s) => s.quality);
  const roadGeo = useMemo(() => track.roadMesh(6), [track]);
  const terrain = useMemo(() => terrainGeo(track, theme), [track, theme]);
  const wet = weather === 'rain';

  return (
    <group>
      <Sky theme={theme} />
      {/* terrain: heightfield hugging the track elevation so the road is never buried */}
      <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial color={theme.ground} roughness={0.95} />
      </mesh>
      {theme.water && <WaterPlane track={track} color={theme.waterColor} />}
      {/* road */}
      <mesh geometry={roadGeo} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial color={theme.road} roughness={wet ? 0.35 : 0.7} metalness={wet ? 0.5 : 0.1} />
      </mesh>
      <CenterDashes track={track} />
      <EdgeGlow track={track} color={theme.edge} />
      <Gantry track={track} color={theme.neon} />
      <Props theme={theme} track={track} quality={quality} />
      <Dust theme={theme} weather={weather} track={track} quality={quality} />
    </group>
  );
}

function Sky({ theme }: { theme: Theme }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(theme.skyTop) },
          bottom: { value: new THREE.Color(theme.skyBottom) },
          horizon: { value: new THREE.Color(theme.horizon) },
        },
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 horizon; varying vec3 vP;
          void main(){ float h = normalize(vP).y;
            vec3 c = h > 0.16 ? mix(horizon, top, smoothstep(0.16, 0.72, h)) : mix(bottom, horizon, smoothstep(-0.3, 0.16, h));
            gl_FragColor = vec4(c, 1.0); }`,
      }),
    [theme]
  );
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1500, 24, 16]} />
    </mesh>
  );
}

/** Terrain heightfield: each vertex takes the nearest track elevation minus
 *  a small offset, so the ground always sits just below the road surface.
 *  Natural themes get gentle rolling noise away from the road. */
function terrainGeo(track: TrackGeometry, theme: Theme): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1500, 1500, 88, 88);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const arr = pos.array as Float32Array;
  const n = track.samples;
  const natural = theme.id === 'forest' || theme.id === 'lake' || theme.id === 'meadow' || theme.id === 'canyon' || theme.id === 'mountain' || theme.id === 'tropical';
  for (let i = 0; i < pos.count; i++) {
    const x = arr[i * 3];
    const z = arr[i * 3 + 2];
    let best = Infinity;
    let by = 0;
    for (let k = 0; k < n; k += 10) {
      const dx = x - track.px[k];
      const dz = z - track.pz[k];
      const d = dx * dx + dz * dz;
      if (d < best) {
        best = d;
        by = track.py[k];
      }
    }
    let y = by - 0.45;
    if (natural) {
      const dist = Math.sqrt(best);
      // rolling hills grow with distance from road (up to +9m), plus fine ripple
      const hills = Math.min(9, dist * 0.03);
      y += hills * (0.5 + 0.5 * Math.sin(x * 0.02) * Math.cos(z * 0.023));
      y += Math.sin(x * 0.11 + z * 0.07) * 0.35;
    }
    arr[i * 3 + 1] = y;
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Lakes / rivers: large reflective discs tucked beside the circuit. */
function WaterPlane({ track, color }: { track: TrackGeometry; color: string }) {
  const spots = useMemo(() => {
    const rand = mulberry32(99);
    const out: { x: number; z: number; y: number; r: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(rand() * track.samples);
      const side = rand() < 0.5 ? -1 : 1;
      const off = side * (55 + rand() * 60);
      out.push({
        x: track.px[idx] + track.tz[idx] * off,
        z: track.pz[idx] - track.tx[idx] * off,
        y: track.py[idx] - 0.9,
        r: 30 + rand() * 45,
      });
    }
    return out;
  }, [track]);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((m, i) => {
      const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = 0.72 + Math.sin(t * 1.2 + i * 2) * 0.08;
    });
  });
  return (
    <group ref={ref}>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[s.r, 28]} />
          <meshStandardMaterial color={color} roughness={0.12} metalness={0.55} transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}

/** Dashed center line, one instanced draw call. */
function CenterDashes({ track }: { track: TrackGeometry }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = useMemo(() => Math.floor(track.length / 14), [track]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(0.28, 0.02, 3);
    const tmp = { x: 0, z: 0, y: 0, tx: 0, tz: 0 };
    for (let i = 0; i < count; i++) {
      track.posAt(i * 14, tmp);
      p.set(tmp.x, tmp.y + 0.045, tmp.z);
      e.set(0, Math.atan2(tmp.tx, tmp.tz), 0);
      q.setFromEuler(e);
      m.compose(p, q, s);
      ref.current?.setMatrixAt(i, m);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [track, count]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#e8eef4" transparent opacity={0.75} toneMapped={false} />
    </instancedMesh>
  );
}

/** Neon strips floating just above both road edges. */
function EdgeGlow({ track, color }: { track: TrackGeometry; color: string }) {
  const geo = useMemo(() => {
    const n = track.samples;
    const pos = new Float32Array(n * 2 * 6 * 3);
    let w = 0;
    for (const side of [1, -1]) {
      const off = side * (track.half + 0.18);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ax = track.px[i] + track.tz[i] * off;
        const az = track.pz[i] - track.tx[i] * off;
        const bx = track.px[j] + track.tz[j] * off;
        const bz = track.pz[j] - track.tx[j] * off;
        const ay = track.py[i] + 0.09;
        const by = track.py[j] + 0.09;
        pos[w++] = ax; pos[w++] = ay; pos[w++] = az;
        pos[w++] = bx; pos[w++] = by; pos[w++] = bz;
        pos[w++] = ax; pos[w++] = ay + 0.14; pos[w++] = az;
        pos[w++] = bx; pos[w++] = by; pos[w++] = bz;
        pos[w++] = ax; pos[w++] = ay + 0.14; pos[w++] = az;
        pos[w++] = bx; pos[w++] = by + 0.14; pos[w++] = bz;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [track]);
  return (
    <mesh geometry={geo} frustumCulled={false}>
      <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Start/finish gantry: two posts + banner + line. */
function Gantry({ track, color }: { track: TrackGeometry; color: string }) {
  const s = track.start;
  const angle = Math.atan2(track.tx[0], track.tz[0]);
  const w = track.half + 2.5;
  const h = 7;
  return (
    <group position={[s.x, s.y, s.z]} rotation={[0, angle, 0]}>
      {[-w, w].map((x) => (
        <mesh key={x} position={[x, h / 2, 0]}>
          <boxGeometry args={[0.7, h, 0.7]} />
          <meshStandardMaterial color="#11141d" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w * 2 + 1, 1.5, 0.6]} />
        <meshStandardMaterial color="#0b0e16" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, h, 0.32]}>
        <planeGeometry args={[w * 2 - 0.6, 1.0]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[track.width, 2.2]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

// ---- props ----

interface Spot {
  x: number;
  z: number;
  y: number;
  r: number;
  s: number;
}

function scatter(track: TrackGeometry, count: number, min: number, max: number, seed: number): Spot[] {
  const rand = mulberry32(seed);
  const out: Spot[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * track.samples);
    const side = rand() < 0.5 ? -1 : 1;
    const off = side * (min + rand() * (max - min));
    out.push({
      x: track.px[idx] + track.tz[idx] * off,
      z: track.pz[idx] - track.tx[idx] * off,
      y: track.py[idx] - 0.4,
      r: rand() * Math.PI * 2,
      s: 0.6 + rand() * 0.9,
    });
  }
  return out;
}

function setInstances(mesh: THREE.InstancedMesh | null, spots: Spot[], place: (m: THREE.Matrix4, s: Spot) => void) {
  if (!mesh) return;
  const m = new THREE.Matrix4();
  spots.forEach((s, i) => {
    place(m, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function Props({ theme, track, quality }: { theme: Theme; track: TrackGeometry; quality: string }) {
  const small = quality === 'low';
  const bCount = small ? Math.floor(theme.buildings / 2) : theme.buildings;
  const tCount = small ? Math.floor(theme.treeCount / 2) : theme.treeCount;
  const buildings = useMemo(() => scatter(track, bCount, 30, 140, 11), [track, bCount]);
  const trees = useMemo(() => scatter(track, tCount, 13, 80, 22), [track, tCount]);
  const rocks = useMemo(() => scatter(track, small ? Math.min(40, theme.rocks) : theme.rocks, 14, 90, 33), [track, theme.rocks, small]);
  const shards = useMemo(() => scatter(track, small ? 30 : theme.shards, 13, 70, 44), [track, theme.shards, small]);
  const halos = useMemo(() => scatter(track, small ? 18 : theme.halos, 20, 60, 55), [track, theme.halos, small]);
  const flowers = useMemo(() => scatter(track, small ? Math.floor(theme.flowers / 3) : theme.flowers, 10, 45, 66), [track, theme.flowers, small]);
  const cliffs = useMemo(() => scatter(track, small ? Math.floor(theme.cliffs / 2) : theme.cliffs, 22, 70, 77), [track, theme.cliffs, small]);
  const bHeights = useMemo(() => {
    const rand = mulberry32(777);
    return buildings.map(() => 16 + rand() * 70);
  }, [buildings]);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const cliffRef = useRef<THREE.InstancedMesh>(null);
  const bRef = useRef<THREE.InstancedMesh>(null);
  const gRef = useRef<THREE.InstancedMesh>(null);
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const topRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const shardRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    setInstances(bRef.current, buildings, (m, sp) => {
      const i = buildings.indexOf(sp);
      _p.set(sp.x, sp.y + bHeights[i] / 2, sp.z);
      _q.setFromAxisAngle(_up, sp.r);
      _s.set(7 + (i % 5) * 2, bHeights[i], 7 + (i % 5) * 2);
      m.compose(_p, _q, _s);
    });
    setInstances(gRef.current, buildings, (m, sp) => {
      const i = buildings.indexOf(sp);
      _p.set(sp.x, sp.y + bHeights[i] / 2, sp.z);
      _q.setFromAxisAngle(_up, sp.r);
      _s.set(7 + (i % 5) * 2 + 0.3, bHeights[i] + 0.3, 7 + (i % 5) * 2 + 0.3);
      m.compose(_p, _q, _s);
    });
    setInstances(trunkRef.current, trees, (m, sp) => {
      _p.set(sp.x, sp.y + sp.s * 1.4, sp.z);
      _q.setFromAxisAngle(_up, sp.r);
      _s.set(1, 1, 1);
      m.compose(_p, _q, _s);
    });
    setInstances(topRef.current, trees, (m, sp) => {
      _p.set(sp.x, sp.y + sp.s * 4.2, sp.z);
      _q.setFromAxisAngle(_up, sp.r);
      const flat = theme.trees === 'palms' ? 1.4 : theme.trees === 'oaks' ? 2.6 : theme.trees === 'mixed' ? 3.0 : 3.6;
      _s.set(sp.s * 2.4, sp.s * flat, sp.s * 2.4);
      m.compose(_p, _q, _s);
    });
    setInstances(rockRef.current, rocks, (m, sp) => {
      _p.set(sp.x, sp.y + sp.s, sp.z);
      _q.setFromEuler(_e.set(sp.r * 0.4, sp.r, sp.r * 0.2));
      _s.set(sp.s * 2.4, sp.s * 1.7, sp.s * 2.2);
      m.compose(_p, _q, _s);
    });
    setInstances(shardRef.current, shards, (m, sp) => {
      _p.set(sp.x, sp.y + sp.s, sp.z);
      _q.setFromEuler(_e.set(sp.r * 0.3, sp.r, sp.r * 0.5));
      _s.set(sp.s * 1.6, sp.s * 2.4, sp.s * 1.6);
      m.compose(_p, _q, _s);
    });
    setInstances(flowerRef.current, flowers, (m, sp) => {
      _p.set(sp.x, sp.y + 0.35, sp.z);
      _q.setFromAxisAngle(_up, sp.r);
      const s = 0.5 + (sp.s - 0.6) * 0.8;
      _s.set(s, s, s);
      m.compose(_p, _q, _s);
    });
    setInstances(cliffRef.current, cliffs, (m, sp) => {
      _p.set(sp.x, sp.y + sp.s * 6, sp.z);
      _q.setFromAxisAngle(_up, sp.r);
      _s.set(sp.s * 7, sp.s * 12, sp.s * 7);
      m.compose(_p, _q, _s);
    });
  }, [buildings, trees, rocks, shards, flowers, cliffs, bHeights, theme.trees]);

  const treeTop = theme.trees === 'palms' ? 'palm' : theme.trees === 'oaks' ? 'oak' : theme.trees === 'mixed' ? 'mixed' : 'pine';

  return (
    <group>
      {buildings.length > 0 && (
        <group>
          <instancedMesh ref={bRef} args={[undefined, undefined, Math.max(1, buildings.length)]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#0d1322" roughness={0.85} />
          </instancedMesh>
          <instancedMesh ref={gRef} args={[undefined, undefined, Math.max(1, buildings.length)]} frustumCulled={false}>
            <boxGeometry args={[1.002, 1.002, 1.002]} />
            <meshStandardMaterial color={theme.buildingGlow} emissive={theme.buildingGlow} emissiveIntensity={0.45} transparent opacity={0.13} toneMapped={false} depthWrite={false} />
          </instancedMesh>
        </group>
      )}
      {trees.length > 0 && (
        <group>
          <instancedMesh ref={trunkRef} args={[undefined, undefined, Math.max(1, trees.length)]} frustumCulled={false}>
            <cylinderGeometry args={[0.22, 0.32, 3, 6]} />
            <meshStandardMaterial color={theme.trunkColor} roughness={0.9} />
          </instancedMesh>
          <instancedMesh ref={topRef} args={[undefined, undefined, Math.max(1, trees.length)]} frustumCulled={false}>
            {treeTop === 'palm' ? (
              <sphereGeometry args={[1, 7, 5]} />
            ) : treeTop === 'oak' ? (
              <icosahedronGeometry args={[1.3, 1]} />
            ) : treeTop === 'mixed' ? (
              <icosahedronGeometry args={[1.2, 0]} />
            ) : (
              <coneGeometry args={[1, 2.4, 7]} />
            )}
            <meshStandardMaterial color={theme.treeColor} roughness={0.9} flatShading />
          </instancedMesh>
        </group>
      )}
      {rocks.length > 0 && (
        <instancedMesh ref={rockRef} args={[undefined, undefined, Math.max(1, rocks.length)]} frustumCulled={false}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={theme.rockColor} roughness={0.95} />
        </instancedMesh>
      )}
      {shards.length > 0 && (
        <instancedMesh ref={shardRef} args={[undefined, undefined, Math.max(1, shards.length)]} frustumCulled={false}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#bfe4ff" roughness={0.15} transparent opacity={0.85} />
        </instancedMesh>
      )}
      {flowers.length > 0 && (
        <instancedMesh ref={flowerRef} args={[undefined, undefined, Math.max(1, flowers.length)]} frustumCulled={false}>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={theme.grassTint} roughness={0.8} flatShading emissive={theme.neon} emissiveIntensity={0.12} />
        </instancedMesh>
      )}
      {cliffs.length > 0 && (
        <instancedMesh ref={cliffRef} args={[undefined, undefined, Math.max(1, cliffs.length)]} frustumCulled={false}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={theme.rockColor} roughness={0.95} flatShading />
        </instancedMesh>
      )}
      {halos.length > 0 && <Halos spots={halos} color={theme.neon} />}
    </group>
  );
}

function Halos({ spots, color }: { spots: Spot[]; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((c, i) => {
      c.position.y = 7 + Math.sin(t * 1.4 + i * 1.7) * 1.1;
      c.rotation.y = t * 0.4 + i;
    });
  });
  return (
    <group ref={ref}>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, 7, s.z]}>
          <torusGeometry args={[2.4 * s.s, 0.12, 8, 22]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** One recycled particle cloud (rain/snow/sand/sparks). */
function Dust({ theme, weather, track, quality }: { theme: Theme; weather: string; track: TrackGeometry; quality: string }) {
  const kind = weather === 'rain' ? 'rain' : weather === 'snow' ? 'snow' : weather === 'sandstorm' ? 'sand' : theme.weather;
  const count = quality === 'low' ? 120 : 260;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = Math.random() * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  const mat = useMemo(() => {
    const c =
      kind === 'rain' ? '#9fc8ff'
      : kind === 'snow' ? '#ffffff'
      : kind === 'sand' ? '#d8a06a'
      : kind === 'leaves' ? '#7aba3a'
      : kind === 'petals' ? '#fbcfe8'
      : theme.neon;
    return new THREE.PointsMaterial({ color: c, size: kind === 'snow' ? 0.5 : kind === 'leaves' || kind === 'petals' ? 0.45 : 0.35, transparent: true, opacity: kind === 'none' ? 0 : 0.65, depthWrite: false });
  }, [kind, theme.neon]);
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const tmp = useMemo(() => ({ x: 0, z: 0 }), []);

  useFrame((_, dt) => {
    if (kind === 'none' || !ref.current) return;
    const step = Math.min(dt, 0.05);
    const attr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const a = attr.array as Float32Array;
    tmp.x = camera.position.x;
    tmp.z = camera.position.z;
    void track;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      if (kind === 'rain') {
        a[ix + 1] -= step * 55;
        if (a[ix + 1] < 0) {
          a[ix] = tmp.x + (Math.random() - 0.5) * 120;
          a[ix + 2] = tmp.z + (Math.random() - 0.5) * 120;
          a[ix + 1] = 40 + Math.random() * 20;
        }
      } else if (kind === 'snow') {
        a[ix + 1] -= step * 4;
        if (a[ix + 1] < 0) {
          a[ix] = tmp.x + (Math.random() - 0.5) * 120;
          a[ix + 2] = tmp.z + (Math.random() - 0.5) * 120;
          a[ix + 1] = 30 + Math.random() * 25;
        }
      } else if (kind === 'leaves' || kind === 'petals') {
        a[ix + 1] -= step * (1.5 + (i % 5) * 0.3);
        a[ix] += Math.sin(a[ix + 1] * 0.8 + i) * step * 3;
        a[ix + 2] += Math.cos(a[ix + 1] * 0.6 + i * 1.3) * step * 2;
        if (a[ix + 1] < 0 || Math.abs(a[ix] - tmp.x) > 75 || Math.abs(a[ix + 2] - tmp.z) > 75) {
          a[ix] = tmp.x + (Math.random() - 0.5) * 120;
          a[ix + 2] = tmp.z + (Math.random() - 0.5) * 120;
          a[ix + 1] = 6 + Math.random() * 22;
        }
      } else {
        a[ix] -= step * (kind === 'sand' ? 26 : 2);
        a[ix + 1] -= step * 1;
        if (a[ix] < tmp.x - 70 || a[ix + 1] < 0) {
          a[ix] = tmp.x + 60 + Math.random() * 25;
          a[ix + 2] = tmp.z + (Math.random() - 0.5) * 120;
          a[ix + 1] = 1 + Math.random() * 16;
        }
      }
    }
    attr.needsUpdate = true;
  });

  if (kind === 'none') return null;
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
