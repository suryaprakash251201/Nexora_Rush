import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { CARS } from 'shared';
import { CarModel } from '@/game/cars/CarModel';

/**
 * Animated 3D background for the landing page: a hero car sweeping through
 * a neon grid skyline.
 */

export function LandingScene() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ fov: 50, position: [0, 2.4, 9] }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 14, 60]} />
      <ambientLight intensity={0.6} color="#3a5aff" />
      <directionalLight position={[-6, 8, -4]} intensity={1.6} color="#22d3ee" />
      <directionalLight position={[6, 4, 6]} intensity={0.9} color="#fb3b53" />
      <Suspense fallback={null}>
        <NeonGrid />
        <SkylineGroup />
        <SweepCar />
      </Suspense>
    </Canvas>
  );
}

function NeonGrid() {
  const grid = useRef<THREE.GridHelper>(null);
  useFrame((_, dt) => {
    if (grid.current) {
      // endless scroll illusion
      grid.current.position.z = ((grid.current.position.z + dt * 6) % 2);
    }
  });
  return (
    <>
      <gridHelper ref={grid} args={[120, 60, '#22d3ee', '#155e75']} position={[0, -0.6, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]}>
        <planeGeometry args={[240, 240]} />
        <meshBasicMaterial color="#05070d" />
      </mesh>
    </>
  );
}

const BUILDINGS = Array.from({ length: 26 }, (_, i) => ({
  x: (i % 13) * 9 - 54 + (i % 3) * 2,
  z: -18 - Math.abs(Math.sin(i * 2.7)) * 26,
  h: 8 + Math.abs(Math.sin(i * 1.3)) * 26,
  hue: i % 2 === 0 ? '#22d3ee' : '#a78bfa',
}));

function SkylineGroup() {
  return (
    <group>
      {BUILDINGS.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.h / 2, 0]}>
            <boxGeometry args={[4.5, b.h, 4.5]} />
            <meshStandardMaterial color="#0a0e1a" roughness={0.8} />
          </mesh>
          <mesh position={[0, b.h / 2, 2.28]}>
            <planeGeometry args={[3.8, b.h * 0.9]} />
            <meshBasicMaterial color={b.hue} transparent opacity={0.16} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SweepCar() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * 0.32;
    group.current.position.set(Math.sin(t) * 7.5, 0.35 + Math.sin(t * 2.2) * 0.12, 2.5 + Math.cos(t) * 3.5);
    group.current.rotation.y = t + Math.PI / 2 + (Math.cos(t) > 0 ? 0 : Math.PI);
    group.current.rotation.z = Math.sin(t * 2.2) * 0.05;
  });
  return (
    <group ref={group} scale={0.9}>
      <CarModel car={CARS[5]} color="#22d3ee" accent="#a78bfa" headlights />
    </group>
  );
}
