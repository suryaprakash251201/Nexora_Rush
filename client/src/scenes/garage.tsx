import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import type { CarDef } from 'shared';
import { CarModel, type CarAnim } from '@/world/car';

/** 3D garage turntable: drag to orbit, scroll to zoom. */
export function GarageView({ car, paint, accent }: { car: CarDef; paint: string; accent: string }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 38, position: [7.2, 2.8, 7.2] }}
      gl={{ antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#070b14']} />
      <fog attach="fog" args={['#070b14', 16, 46]} />
      <ambientLight intensity={0.55} color="#8ab4ff" />
      <spotLight position={[6, 10, 5]} angle={0.55} penumbra={0.8} intensity={260} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-7, 6, -5]} angle={0.8} penumbra={1} intensity={120} color={accent} />
      <pointLight position={[0, 1.2, -7]} intensity={26} color="#fb3b53" />
      <Suspense fallback={null}>
        <Floor accent={accent} />
        <Spinner car={car} paint={paint} accent={accent} />
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

function Spinner({ car, paint, accent }: { car: CarDef; paint: string; accent: string }) {
  const ref = useRef<THREE.Group>(null);
  const [auto, setAuto] = useState(true);
  const anim = useRef<CarAnim>({ spin: 0, steer: 0, boosting: false, braking: false });
  useEffect(() => {
    const stop = () => setAuto(false);
    window.addEventListener('pointerdown', stop, { once: true });
    return () => window.removeEventListener('pointerdown', stop);
  }, []);
  useFrame((_, dt) => {
    if (ref.current && auto) ref.current.rotation.y += Math.min(dt, 0.05) * 0.4;
  });
  return (
    <group ref={ref}>
      <CarModel car={car} paint={paint} accent={accent} anim={anim} lights />
    </group>
  );
}

function Floor({ accent }: { accent: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[24, 48]} />
        <meshStandardMaterial color="#0b101c" roughness={0.35} metalness={0.55} />
      </mesh>
      <gridHelper args={[48, 48, accent, '#1b2740']} position={[0, 0.02, 0]}>
        <meshBasicMaterial attach="material" transparent opacity={0.2} depthWrite={false} />
      </gridHelper>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.8, 5.0, 72]} />
        <meshBasicMaterial color={accent} transparent opacity={0.65} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
