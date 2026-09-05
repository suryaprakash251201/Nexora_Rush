import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { CARS } from 'shared';
import { CarModel, type CarAnim } from '@/world/car';

/**
 * Landing-page hero: the Phantom GT parked front-and-center on a neon
 * turntable with a scrolling grid and skyline. The car is ALWAYS in frame.
 */
export function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 42, position: [6.4, 2.6, 8.6] }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <color attach="background" args={['#04060c']} />
      <fog attach="fog" args={['#04060c', 18, 70]} />
      <ambientLight intensity={0.7} color="#4a6aff" />
      <directionalLight position={[-6, 9, -4]} intensity={1.8} color="#22d3ee" />
      <directionalLight position={[7, 4, 7]} intensity={1.0} color="#fb3b53" />
      <spotLight position={[0, 12, 6]} angle={0.5} penumbra={0.9} intensity={300} color="#ffffff" />
      <Suspense fallback={null}>
        <HeroGrid />
        <HeroSkyline />
        <HeroCar />
      </Suspense>
    </Canvas>
  );
}

function HeroGrid() {
  const grid = useRef<THREE.GridHelper>(null);
  useFrame((_, dt) => {
    if (grid.current) grid.current.position.z = (grid.current.position.z + Math.min(dt, 0.05) * 5) % 2;
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshBasicMaterial color="#04060c" />
      </mesh>
      <gridHelper ref={grid} args={[140, 70, '#22d3ee', '#0e4a5e']} position={[0, -0.6, 0]}>
        <meshBasicMaterial attach="material" transparent opacity={0.35} depthWrite={false} />
      </gridHelper>
    </group>
  );
}

const TOWERS = Array.from({ length: 24 }, (_, i) => ({
  x: (i % 12) * 10 - 55 + (i % 3) * 2.4,
  z: -20 - Math.abs(Math.sin(i * 2.7)) * 26,
  h: 9 + Math.abs(Math.sin(i * 1.3)) * 26,
  c: i % 2 === 0 ? '#22d3ee' : '#a78bfa',
}));

function HeroSkyline() {
  return (
    <group>
      {TOWERS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2 - 0.6, 0]}>
            <boxGeometry args={[5, b.h, 5]} />
            <meshStandardMaterial color="#0a0e1c" roughness={0.8} />
          </mesh>
          <mesh position={[0, b.h / 2 - 0.6, 2.55]}>
            <planeGeometry args={[4.2, b.h * 0.88]} />
            <meshBasicMaterial color={b.c} transparent opacity={0.14} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function HeroCar() {
  const g = useRef<THREE.Group>(null);
  const anim = useRef<CarAnim>({ spin: 0, steer: 0, boosting: false, braking: false });
  const car = useMemo(() => CARS.find((c) => c.id === 'phantom-gt') ?? CARS[0], []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    // gentle showroom rotation + idle bob, car stays centered
    g.current.rotation.y = Math.sin(t * 0.25) * 0.5 - 0.35;
    g.current.position.y = Math.sin(t * 1.6) * 0.03;
    anim.current.spin += 0.002;
  });
  return (
    <group position={[3.2, 0, 0.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[4.4, 4.62, 72]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={g}>
        <CarModel car={car} paint="#22d3ee" accent="#a78bfa" anim={anim} lights />
      </group>
    </group>
  );
}
