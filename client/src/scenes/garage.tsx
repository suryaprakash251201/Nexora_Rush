import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { CarDef } from 'shared';
import { CarModel, type CarAnim } from '@/world/car';

export type ShowroomId = 'midnight' | 'sunset' | 'forest' | 'neon';

export const SHOWROOMS: { id: ShowroomId; label: string; icon: string }[] = [
  { id: 'midnight', label: 'Midnight Studio', icon: '🌙' },
  { id: 'sunset', label: 'Sunset Deck', icon: '🌇' },
  { id: 'forest', label: 'Forest Clearing', icon: '🌲' },
  { id: 'neon', label: 'Neon Rooftop', icon: '🌃' },
];

interface Showroom {
  bg: string;
  fogNear: number;
  fogFar: number;
  floor: string;
  key: string;
  rim: string;
  front: string;
}

const SHOWROOM_STYLE: Record<ShowroomId, Showroom> = {
  midnight: { bg: '#070b14', fogNear: 16, fogFar: 46, floor: '#0b101c', key: '#ffffff', rim: '#8ab4ff', front: '#fb3b53' },
  sunset: { bg: '#2a1a3a', fogNear: 18, fogFar: 60, floor: '#1c1428', key: '#ffd9a8', rim: '#ff9e5e', front: '#ff5e3a' },
  forest: { bg: '#0a1a12', fogNear: 14, fogFar: 50, floor: '#0d1f14', key: '#fff8d6', rim: '#a3e635', front: '#34d399' },
  neon: { bg: '#0a0618', fogNear: 14, fogFar: 44, floor: '#0d0a1c', key: '#c4b5fd', rim: '#22d3ee', front: '#f0abfc' },
};

/** 3D garage turntable with drive-in animation + selectable showroom. */
export function GarageView({ car, paint, accent, showroom = 'midnight' }: { car: CarDef; paint: string; accent: string; showroom?: ShowroomId }) {
  const style = SHOWROOM_STYLE[showroom];
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 38, position: [7.2, 2.8, 7.2] }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[style.bg]} />
      <fog attach="fog" args={[style.bg, style.fogNear, style.fogFar]} />
      <ambientLight intensity={0.6} color={style.rim} />
      <spotLight position={[6, 10, 5]} angle={0.55} penumbra={0.8} intensity={260} color={style.key} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-7, 6, -5]} angle={0.8} penumbra={1} intensity={130} color={accent} />
      <pointLight position={[0, 1.2, -7]} intensity={26} color={style.front} />
      {showroom === 'forest' && (
        <>
          <directionalLight position={[30, 40, 20]} intensity={1.2} color="#fff8d6" />
          <fog attach="fog" args={['#0e2416', 12, 42]} />
        </>
      )}
      <Suspense fallback={null}>
        <Floor accent={accent} floor={style.floor} showroom={showroom} />
        <DriveIn key={car.id} car={car} paint={paint} accent={accent} />
        <ContactShadows position={[0, 0.02, 0]} opacity={0.72} scale={18} blur={2.4} far={4.5} />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5.5}
        maxDistance={17}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.12}
        target={[0, 0.75, 0]}
      />
    </Canvas>
  );
}

/** Car drives in from the left with ease-out, then slow turntable spin. */
function DriveIn({ car, paint, accent }: { car: CarDef; paint: string; accent: string }) {
  const ref = useRef<THREE.Group>(null);
  const [userTookOver, setUserTookOver] = useState(false);
  const anim = useRef<CarAnim>({ spin: 0, steer: 0, boosting: false, braking: false });
  const t = useRef(0);

  useEffect(() => {
    t.current = 0;
    setUserTookOver(false);
    const stop = () => setUserTookOver(true);
    window.addEventListener('pointerdown', stop, { once: true });
    return () => window.removeEventListener('pointerdown', stop);
  }, [car.id]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = ref.current;
    if (!g) return;
    // entrance: 1.1s ease-out drive from x=-9 + slight drift angle
    if (t.current < 1) {
      t.current = Math.min(1, t.current + dt / 1.1);
      const k = 1 - Math.pow(1 - t.current, 3);
      g.position.x = -9 * (1 - k);
      g.rotation.y = (1 - k) * -0.5 + (userTookOver ? 0 : Math.sin(performance.now() / 2500) * 0.06);
      anim.current.spin += dt * (1 - k) * 14 + dt * 0.4;
      anim.current.steer = (1 - k) * 0.35;
    } else {
      g.position.x = 0;
      anim.current.steer *= 0.95;
      anim.current.spin += dt * 0.4;
      if (!userTookOver) g.rotation.y += dt * 0.4;
    }
    // suspension breathing
    g.position.y = Math.sin(performance.now() / 550) * 0.006;
  });

  return (
    <group ref={ref}>
      <CarModel car={car} paint={paint} accent={accent} anim={anim} lights />
    </group>
  );
}

function Floor({ accent, floor, showroom }: { accent: string; floor: string; showroom: ShowroomId }) {
  const trees = useMemo(() => {
    if (showroom !== 'forest') return [];
    const out: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const r = 14 + (i % 4) * 3;
      out.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, s: 0.8 + ((i * 7) % 5) * 0.3 });
    }
    return out;
  }, [showroom]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[showroom === 'forest' ? 30 : 24, 48]} />
        <meshStandardMaterial color={floor} roughness={showroom === 'forest' ? 0.9 : 0.35} metalness={showroom === 'forest' ? 0 : 0.55} />
      </mesh>
      {showroom !== 'forest' && (
        <gridHelper args={[48, 48, accent, '#1b2740']} position={[0, 0.02, 0]}>
          <meshBasicMaterial attach="material" transparent opacity={0.2} depthWrite={false} />
        </gridHelper>
      )}
      {showroom === 'forest' &&
        trees.map((tr, i) => (
          <group key={i} position={[tr.x, 0, tr.z]} scale={tr.s}>
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.22, 0.32, 2.8, 6]} />
              <meshStandardMaterial color="#4a3520" roughness={0.9} />
            </mesh>
            <mesh position={[0, 4.2, 0]}>
              <coneGeometry args={[1.6, 3.4, 7]} />
              <meshStandardMaterial color="#1e5d1e" roughness={0.9} flatShading />
            </mesh>
          </group>
        ))}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.8, 5.0, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={0.65} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
