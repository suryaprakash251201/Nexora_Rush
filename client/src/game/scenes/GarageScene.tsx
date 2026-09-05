import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { CarDef } from 'shared';
import { CarModel } from '@/game/cars/CarModel';

/** Interactive 3D garage viewer: rotate, zoom, inspect. */
export function GarageScene({ car, color, accent }: { car: CarDef; color: string; accent: string }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 40, position: [6.5, 2.6, 6.5] }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#070a12']} />
      <fog attach="fog" args={['#070a12', 14, 42]} />
      <ambientLight intensity={0.5} color="#8ab4ff" />
      <spotLight position={[5, 9, 4]} angle={0.6} penumbra={0.8} intensity={2.2} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-6, 6, -4]} angle={0.8} penumbra={1} intensity={1.4} color={accent} />
      <pointLight position={[0, 1, -6]} intensity={1.6} color="#fb3b53" />
      <Suspense fallback={null}>
        <GarageFloor accent={accent} />
        <Turntable>
          <CarModel car={car} color={color} accent={accent} headlights />
        </Turntable>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.7} scale={16} blur={2.4} far={4} />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5}
        maxDistance={16}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.7, 0]}
      />
    </Canvas>
  );
}

function Turntable({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const [auto, setAuto] = useState(true);
  // Auto-rotate until the user drags (OrbitControls takes over visually anyway).
  useFrame((_, dt) => {
    if (ref.current && auto) ref.current.rotation.y += dt * 0.35;
  });
  useEffect(() => {
    const stop = () => setAuto(false);
    window.addEventListener('pointerdown', stop, { once: true });
    return () => window.removeEventListener('pointerdown', stop);
  }, []);
  return <group ref={ref}>{children}</group>;
}

function GarageFloor({ accent }: { accent: string }) {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(40, 40, accent, '#1a2338');
    (g.material as THREE.Material).transparent = true;
    (g.material as any).opacity = 0.22;
    return g;
  }, [accent]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#0b0f18" roughness={0.35} metalness={0.55} />
      </mesh>
      <primitive object={grid} position={[0, 0.02, 0]} />
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.6, 4.8, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}
