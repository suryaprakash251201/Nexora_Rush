import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { ThemeConfig } from '@/game/tracks/trackDefs';
import type { TrackGeometry } from '@/game/engine/track';
import { mulberry32 } from '@/game/engine/track';
import { useSettings } from '@/store/settings';

/**
 * Themed environment: gradient sky, fog, lights, ground, instanced props
 * and weather particles. All procedural, all cheap (instancing + points).
 */

export function ThemeEnvironment({
  theme,
  track,
  weather,
}: {
  theme: ThemeConfig;
  track: TrackGeometry;
  weather: string;
}) {
  const shadows = useSettings((s) => s.shadows);
  const quality = useSettings((s) => s.quality);

  return (
    <group>
      <SkyDome theme={theme} />
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />
      <ambientLight color={theme.lights.ambient} intensity={theme.lights.ambientIntensity} />
      <directionalLight
        color={theme.lights.sun}
        intensity={theme.lights.sunIntensity}
        position={theme.lights.sunPos}
        castShadow={shadows && quality !== 'low'}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-far={400}
      />
      <hemisphereLight args={[theme.sky.top, theme.ground.color, 0.5]} />
      <Ground theme={theme} />
      <Props theme={theme} track={track} />
      {(weather === 'rain' || weather === 'snow' || weather === 'sandstorm' || theme.particles !== 'none') && (
        <Particles theme={theme} weather={weather} count={quality === 'low' ? 150 : 400} />
      )}
    </group>
  );
}

// ---- Sky -------------------------------------------------------------------

function SkyDome({ theme }: { theme: ThemeConfig }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(theme.sky.top) },
          bottom: { value: new THREE.Color(theme.sky.bottom) },
          horizon: { value: new THREE.Color(theme.sky.horizon) },
        },
        vertexShader: `
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 top; uniform vec3 bottom; uniform vec3 horizon;
          varying vec3 vPos;
          void main() {
            float h = normalize(vPos).y;
            vec3 col = h > 0.18 ? mix(horizon, top, smoothstep(0.18, 0.75, h))
                     : mix(bottom, horizon, smoothstep(-0.25, 0.18, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [theme]
  );
  return (
    <mesh material={material} renderOrder={-10}>
      <sphereGeometry args={[1400, 24, 16]} />
    </mesh>
  );
}

// ---- Ground ----------------------------------------------------------------

function Ground({ theme }: { theme: ThemeConfig }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[1200, 48]} />
        <meshStandardMaterial color={theme.ground.color} roughness={0.95} metalness={0} />
      </mesh>
      {theme.ground.grid && (
        <gridHelper args={[1600, 120, theme.neon, theme.neon]} position={[0, 0.02, 0]}>
          <meshBasicMaterial attach="material" transparent opacity={0.07} />
        </gridHelper>
      )}
    </group>
  );
}

// ---- Props (instanced) ------------------------------------------------------

function Props({ theme, track }: { theme: ThemeConfig; track: TrackGeometry }) {
  const groups = useMemo(() => buildProps(theme, track), [theme, track]);

  return (
    <group>
      {groups.buildings && <Buildings cfg={groups.buildings} />}
      {groups.rocks && <Rocks cfg={groups.rocks} />}
      {groups.pines && <Pines cfg={groups.pines} />}
      {groups.palms && <Palms cfg={groups.palms} />}
      {groups.iceShards && <IceShards cfg={groups.iceShards} />}
      {groups.holograms && <Holograms cfg={groups.holograms} />}
      <EdgeGlow track={track} theme={theme} />
    </group>
  );
}

interface PropSpot {
  x: number;
  z: number;
  y: number;
  rot: number;
  scale: number;
}

function scatterAlongTrack(track: TrackGeometry, count: number, minOff: number, maxOff: number, seed: number): PropSpot[] {
  const rand = mulberry32(seed);
  const spots: PropSpot[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rand() * track.sampleCount);
    const side = rand() < 0.5 ? -1 : 1;
    const off = side * (minOff + rand() * (maxOff - minOff));
    const x = track.px[idx] + track.tz[idx] * off;
    const z = track.pz[idx] - track.tx[idx] * off;
    spots.push({ x, z, y: Math.max(0, track.py[idx] - 0.5), rot: rand() * Math.PI * 2, scale: 0.6 + rand() * 0.9 });
  }
  return spots;
}

function Buildings({ cfg }: { cfg: { spots: PropSpot[]; color: string; emissive: string; maxH: number; minH: number; seed: number } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const windowMat = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const rand = mulberry32(cfg.seed);
    return cfg.spots.map((s) => ({
      ...s,
      h: cfg.minH + rand() * (cfg.maxH - cfg.minH),
      w: 6 + rand() * 14,
      lit: rand() < 0.75,
    }));
  }, [cfg]);

  useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    data.forEach((d, i) => {
      pos.set(d.x, d.y + d.h / 2, d.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.rot);
      scl.set(d.w, d.h, d.w);
      m.compose(pos, q, scl);
      ref.current?.setMatrixAt(i, m);
      if (windowMat.current) {
        pos.set(d.x, d.y + d.h / 2, d.z);
        scl.set(1, 1, 1);
        m.compose(pos, q, scl);
        windowMat.current.setMatrixAt(i, m);
        windowMat.current.visible = d.lit;
      }
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    if (windowMat.current) windowMat.current.instanceMatrix.needsUpdate = true;
  }, [data]);

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, data.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={cfg.color} roughness={0.85} metalness={0.15} />
      </instancedMesh>
      <instancedMesh ref={windowMat} args={[undefined, undefined, data.length]}>
        <boxGeometry args={[1.001, 1.001, 1.001]} />
        <meshStandardMaterial color={cfg.emissive} emissive={cfg.emissive} emissiveIntensity={1.1} transparent opacity={0.35} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function Rocks({ cfg }: { cfg: { spots: PropSpot[]; color: string } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    cfg.spots.forEach((d, i) => {
      pos.set(d.x, d.y + d.scale * 1.2, d.z);
      q.setFromEuler(new THREE.Euler(d.rot * 0.4, d.rot, d.rot * 0.2));
      scl.set(d.scale * 2.4, d.scale * 1.8, d.scale * 2.2);
      m.compose(pos, q, scl);
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [cfg]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cfg.spots.length]} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={cfg.color} roughness={0.95} />
    </instancedMesh>
  );
}

function Pines({ cfg }: { cfg: { spots: PropSpot[]; color: string; trunk: string } }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    cfg.spots.forEach((d, i) => {
      pos.set(d.x, d.y + d.scale * 1.1, d.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.rot);
      scl.set(1, 1, 1);
      m.compose(pos, q, scl);
      trunkRef.current?.setMatrixAt(i, m);
      pos.set(d.x, d.y + d.scale * 3.4, d.z);
      scl.set(d.scale * 2.2, d.scale * 3.4, d.scale * 2.2);
      m.compose(pos, q, scl);
      leafRef.current?.setMatrixAt(i, m);
    });
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (leafRef.current) leafRef.current.instanceMatrix.needsUpdate = true;
  }, [cfg]);
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, cfg.spots.length]}>
        <cylinderGeometry args={[0.25, 0.35, 2.4, 6]} />
        <meshStandardMaterial color={cfg.trunk} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[undefined, undefined, cfg.spots.length]} castShadow>
        <coneGeometry args={[1, 2.4, 7]} />
        <meshStandardMaterial color={cfg.color} roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function Palms({ cfg }: { cfg: { spots: PropSpot[]; trunk: string; leaf: string } }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leafRef = useRef<THREE.InstancedMesh>(null);
  useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    cfg.spots.forEach((d, i) => {
      pos.set(d.x, d.y + d.scale * 2.6, d.z);
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), d.rot * 0.15);
      scl.set(1, 1, 1);
      m.compose(pos, q, scl);
      trunkRef.current?.setMatrixAt(i, m);
      pos.set(d.x, d.y + d.scale * 5, d.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.rot);
      scl.set(d.scale * 2.6, d.scale * 1.2, d.scale * 2.6);
      m.compose(pos, q, scl);
      leafRef.current?.setMatrixAt(i, m);
    });
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (leafRef.current) leafRef.current.instanceMatrix.needsUpdate = true;
  }, [cfg]);
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, cfg.spots.length]}>
        <cylinderGeometry args={[0.18, 0.3, 5.4, 6]} />
        <meshStandardMaterial color={cfg.trunk} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leafRef} args={[undefined, undefined, cfg.spots.length]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshStandardMaterial color={cfg.leaf} roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  );
}

function IceShards({ cfg }: { cfg: { spots: PropSpot[]; color: string } }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useMemo(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    cfg.spots.forEach((d, i) => {
      pos.set(d.x, d.y + d.scale, d.z);
      q.setFromEuler(new THREE.Euler(d.rot * 0.3, d.rot, d.rot * 0.5));
      scl.set(d.scale * 1.6, d.scale * 2.4, d.scale * 1.6);
      m.compose(pos, q, scl);
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [cfg]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cfg.spots.length]}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={cfg.color} roughness={0.15} metalness={0.2} transparent opacity={0.85} />
    </instancedMesh>
  );
}

function Holograms({ cfg }: { cfg: { spots: PropSpot[]; color: string } }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.children.forEach((c, i) => {
        c.position.y = 6 + Math.sin(clock.elapsedTime * 1.5 + i) * 1.2;
        c.rotation.y = clock.elapsedTime * 0.4 + i;
      });
    }
  });
  return (
    <group ref={ref}>
      {cfg.spots.map((s, i) => (
        <mesh key={i} position={[s.x, 6, s.z]}>
          <torusGeometry args={[2.2 * s.scale, 0.12, 8, 24]} />
          <meshBasicMaterial color={cfg.color} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Neon edge strips along both sides of the road. */
function EdgeGlow({ track, theme }: { track: TrackGeometry; theme: ThemeConfig }) {
  const geo = useMemo(() => {
    const n = track.sampleCount;
    const positions = new Float32Array(n * 2 * 6);
    let ptr = 0;
    const pushStrip = (offset: number) => {
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const nx = track.tz[i];
        const nz = -track.tx[i];
        const nxj = track.tz[j];
        const nzj = -track.tx[j];
        const y = 0.06;
        // two triangles per segment (flat strip)
        positions[ptr++] = track.px[i] + nx * offset; positions[ptr++] = track.py[i] + y; positions[ptr++] = track.pz[i] + nz * offset;
        positions[ptr++] = track.px[j] + nxj * offset; positions[ptr++] = track.py[j] + y; positions[ptr++] = track.pz[j] + nzj * offset;
        positions[ptr++] = track.px[i] + nx * offset; positions[ptr++] = track.py[i] + y + 0.12; positions[ptr++] = track.pz[i] + nz * offset;
        positions[ptr++] = track.px[j] + nxj * offset; positions[ptr++] = track.py[j] + y + 0.12; positions[ptr++] = track.pz[j] + nzj * offset;
        positions[ptr++] = track.px[i] + nx * offset; positions[ptr++] = track.py[i] + y + 0.12; positions[ptr++] = track.pz[i] + nz * offset;
        positions[ptr++] = track.px[j] + nxj * offset; positions[ptr++] = track.py[j] + y; positions[ptr++] = track.pz[j] + nzj * offset;
      }
    };
    pushStrip(track.halfWidth + 0.15);
    pushStrip(-(track.halfWidth + 0.15));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [track]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={theme.road.edge} toneMapped={false} />
    </mesh>
  );
}

// ---- Particles ----------------------------------------------------------------

function Particles({ theme, weather, count }: { theme: ThemeConfig; weather: string; count: number }) {
  const kind = weather === 'rain' ? 'rain' : weather === 'snow' ? 'snow' : weather === 'sandstorm' ? 'sand' : theme.particles;
  const { geom, mat } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const conf = {
      rain: { color: '#9fc8ff', size: 0.35, opacity: 0.5 },
      snow: { color: '#ffffff', size: 0.5, opacity: 0.85 },
      sand: { color: '#d8a06a', size: 0.45, opacity: 0.4 },
      fireflies: { color: theme.neon, size: 0.5, opacity: 0.9 },
      none: { color: '#ffffff', size: 0.1, opacity: 0 },
    }[kind ?? 'none'] ?? { color: '#ffffff', size: 0.3, opacity: 0.5 };
    const m = new THREE.PointsMaterial({
      color: conf.color,
      size: conf.size,
      transparent: true,
      opacity: conf.opacity,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geom: g, mat: m };
  }, [count, kind, theme.neon]);

  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();

  useFrame((_, dt) => {
    const points = ref.current;
    if (!points) return;
    const pos = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      if (kind === 'rain') {
        arr[ix + 1] -= dt * 55;
        arr[ix] -= dt * 6;
        if (arr[ix + 1] < 0 || Math.abs(arr[ix] - cx) > 85 || Math.abs(arr[ix + 2] - cz) > 85) {
          arr[ix] = cx + (Math.random() - 0.5) * 130;
          arr[ix + 2] = cz + (Math.random() - 0.5) * 130;
          arr[ix + 1] = 45 + Math.random() * 25;
        }
      } else if (kind === 'snow') {
        arr[ix + 1] -= dt * 4.5;
        arr[ix] += Math.sin(arr[ix + 1] * 0.5 + i) * dt * 1.5;
        if (arr[ix + 1] < 0 || Math.abs(arr[ix] - cx) > 85 || Math.abs(arr[ix + 2] - cz) > 85) {
          arr[ix] = cx + (Math.random() - 0.5) * 130;
          arr[ix + 2] = cz + (Math.random() - 0.5) * 130;
          arr[ix + 1] = 35 + Math.random() * 30;
        }
      } else if (kind === 'sand') {
        arr[ix] -= dt * 30;
        arr[ix + 1] -= dt * 1.2;
        if (arr[ix] < cx - 85 || arr[ix + 1] < 0 || Math.abs(arr[ix + 2] - cz) > 85) {
          arr[ix] = cx + 70 + Math.random() * 30;
          arr[ix + 2] = cz + (Math.random() - 0.5) * 130;
          arr[ix + 1] = Math.random() * 18;
        }
      } else if (kind === 'fireflies') {
        arr[ix + 1] += Math.sin(performance.now() / 900 + i) * dt * 0.8;
        arr[ix] += Math.cos(performance.now() / 700 + i * 2) * dt * 0.6;
        if (Math.abs(arr[ix] - cx) > 85 || Math.abs(arr[ix + 2] - cz) > 85 || arr[ix + 1] > 30) {
          arr[ix] = cx + (Math.random() - 0.5) * 120;
          arr[ix + 2] = cz + (Math.random() - 0.5) * 120;
          arr[ix + 1] = 2 + Math.random() * 20;
        }
      }
    }
    pos.needsUpdate = true;
  });

  return <points ref={ref} geometry={geom} material={mat} frustumCulled={false} />;
}

// ---- builder --------------------------------------------------------------

interface BuiltProps {
  buildings?: { spots: PropSpot[]; color: string; emissive: string; maxH: number; minH: number; seed: number };
  rocks?: { spots: PropSpot[]; color: string };
  pines?: { spots: PropSpot[]; color: string; trunk: string };
  palms?: { spots: PropSpot[]; trunk: string; leaf: string };
  iceShards?: { spots: PropSpot[]; color: string };
  holograms?: { spots: PropSpot[]; color: string };
}

function buildProps(theme: ThemeConfig, track: TrackGeometry): BuiltProps {
  const out: BuiltProps = {};
  let seed = 42;
  if (theme.props.buildings) {
    const b = theme.props.buildings;
    out.buildings = { spots: scatterAlongTrack(track, b.count, 26, 130, seed++), color: b.color, emissive: b.emissive, maxH: b.maxH, minH: b.minH, seed: 777 };
  }
  if (theme.props.rocks) out.rocks = { spots: scatterAlongTrack(track, theme.props.rocks.count, 14, 90, seed++), color: theme.props.rocks.color };
  if (theme.props.pines) out.pines = { spots: scatterAlongTrack(track, theme.props.pines.count, 12, 80, seed++), color: theme.props.pines.color, trunk: theme.props.pines.trunk };
  if (theme.props.palms) out.palms = { spots: scatterAlongTrack(track, theme.props.palms.count, 12, 60, seed++), trunk: theme.props.palms.trunk, leaf: theme.props.palms.leaf };
  if (theme.props.iceShards) out.iceShards = { spots: scatterAlongTrack(track, theme.props.iceShards.count, 12, 70, seed++), color: theme.props.iceShards.color };
  if (theme.props.holograms) out.holograms = { spots: scatterAlongTrack(track, theme.props.holograms.count, 18, 60, seed++), color: theme.props.holograms.color };
  return out;
}
