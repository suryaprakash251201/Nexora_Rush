import { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CarDef } from 'shared';

/**
 * Procedural low-poly car — original geometry, stats-driven proportions.
 * Designed to be swappable with GLTF models later (same component contract).
 */

interface CarModelProps {
  car: CarDef;
  color: string;
  accent?: string;
  wheelSpinRef?: React.MutableRefObject<number>;
  steeringRef?: React.MutableRefObject<number>;
  boostingRef?: React.MutableRefObject<boolean>;
  headlights?: boolean;
  brakeRef?: React.MutableRefObject<boolean>;
}

const BODY_LEN = 4.2;
const BODY_W = 1.9;

export const CarModel = forwardRef<THREE.Group, CarModelProps>(function CarModel(
  { car, color, accent = '#22d3ee', wheelSpinRef, steeringRef, boostingRef, headlights = false, brakeRef },
  ref
) {
  const wheels = useRef<THREE.Group[]>([]);
  const flames = useRef<THREE.Group>(null);
  const brakeLights = useRef<THREE.MeshStandardMaterial>(null);
  const wheelPositions = useMemo<[number, number, number][]>(() => {
    const wb = getWheelbase(car.bodyStyle);
    return [
      [-wb.front, -BODY_W / 2 + 0.05, 0.72],
      [-wb.front, BODY_W / 2 - 0.05, 0.72],
      [wb.rear, -BODY_W / 2 + 0.05, 0.78],
      [wb.rear, BODY_W / 2 - 0.05, 0.78],
    ];
  }, [car.bodyStyle]);

  const dims = useMemo(() => getDims(car.bodyStyle), [car.bodyStyle]);

  useFrame((_, dt) => {
    for (const w of wheels.current) {
      if (w && wheelSpinRef) w.children[0].rotation.x = wheelSpinRef.current;
      if (w && steeringRef && (w.name === 'fl' || w.name === 'fr')) {
        w.rotation.y = steeringRef.current * 0.45;
      }
    }
    if (flames.current) {
      const boosting = boostingRef?.current ?? false;
      flames.current.visible = boosting;
      if (boosting) {
        const s = 0.8 + Math.random() * 0.5;
        flames.current.scale.set(s, s, s * (1 + Math.random() * 0.4));
      }
    }
    if (brakeLights.current) {
      const braking = brakeRef?.current ?? false;
      brakeLights.current.emissiveIntensity = braking ? 4 : 1.2;
    }
    void dt;
  });

  return (
    <group ref={ref}>
      {/* main body */}
      <mesh position={[0, dims.bodyY, 0]} castShadow>
        <boxGeometry args={[dims.len, dims.height, dims.width]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.32} />
      </mesh>
      {/* hood taper */}
      <mesh position={[dims.len / 2 - 0.15, dims.bodyY - 0.06, 0]} castShadow>
        <boxGeometry args={[1.1, dims.height * 0.72, dims.width * 0.94]} />
        <meshStandardMaterial color={color} metalness={0.65} roughness={0.32} />
      </mesh>
      {/* cabin */}
      <mesh position={[-0.35, dims.bodyY + dims.height / 2 + dims.cabinH / 2 - 0.05, 0]}>
        <boxGeometry args={[dims.cabinL, dims.cabinH, dims.width * 0.82]} />
        <meshStandardMaterial color="#0a0e18" metalness={0.4} roughness={0.15} />
      </mesh>
      {/* windshield stripe */}
      <mesh position={[dims.cabinL / 2 - 0.32, dims.bodyY + dims.height / 2 + dims.cabinH / 2 - 0.08, 0]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.06, dims.cabinH * 1.05, dims.width * 0.8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* spoiler */}
      {dims.spoiler && (
        <group position={[-dims.len / 2 + 0.1, dims.bodyY + dims.height / 2 + 0.28, 0]}>
          <mesh>
            <boxGeometry args={[0.34, 0.06, dims.width * 0.92]} />
            <meshStandardMaterial color="#0a0e18" metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0.12, -0.14, 0]}>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#0a0e18" />
          </mesh>
          <mesh position={[0.12, -0.14, -dims.width * 0.3]}>
            <boxGeometry args={[0.08, 0.3, 0.08]} />
            <meshStandardMaterial color="#0a0e18" />
          </mesh>
        </group>
      )}
      {/* side accent stripes */}
      <mesh position={[0, dims.bodyY - dims.height * 0.28, dims.width / 2 + 0.01]}>
        <boxGeometry args={[dims.len * 0.85, 0.07, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, dims.bodyY - dims.height * 0.28, -dims.width / 2 - 0.01]}>
        <boxGeometry args={[dims.len * 0.85, 0.07, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* headlights */}
      {headlights && (
        <>
          <mesh position={[dims.len / 2 + 0.01, dims.bodyY + 0.05, 0.55]}>
            <boxGeometry args={[0.05, 0.12, 0.4]} />
            <meshStandardMaterial color="#fffbe8" emissive="#fffbe8" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
          <mesh position={[dims.len / 2 + 0.01, dims.bodyY + 0.05, -0.55]}>
            <boxGeometry args={[0.05, 0.12, 0.4]} />
            <meshStandardMaterial color="#fffbe8" emissive="#fffbe8" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
          <pointLight position={[dims.len / 2 + 2, dims.bodyY, 0]} distance={26} intensity={2.2} color="#fff4d6" />
        </>
      )}
      {/* brake light bar */}
      <mesh position={[-dims.len / 2 - 0.01, dims.bodyY + 0.1, 0]}>
        <boxGeometry args={[0.04, 0.1, dims.width * 0.7]} />
        <meshStandardMaterial ref={brakeLights} color="#7f1020" emissive="#ff2244" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* nitro flames */}
      <group ref={flames} position={[-dims.len / 2 - 0.4, dims.bodyY - 0.05, 0]} visible={false}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.16, 1.1, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.15, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.7, 8]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      </group>
      {/* wheels */}
      {wheelPositions.map((p, i) => (
        <group
          key={i}
          position={p}
          name={i === 0 ? 'fl' : i === 1 ? 'fr' : i === 2 ? 'rl' : 'rr'}
          ref={(el) => {
            if (el) wheels.current[i] = el;
          }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[dims.wheelR, dims.wheelR, 0.3, 14]} />
            <meshStandardMaterial color="#111418" roughness={0.85} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[dims.wheelR * 0.55, dims.wheelR * 0.55, 0.32, 10]} />
            <meshStandardMaterial color={accent} metalness={0.8} roughness={0.25} emissive={accent} emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
      {/* underglow (visible at night themes) */}
      {headlights && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[dims.len * 1.1, dims.width * 1.6]} />
          <meshBasicMaterial color={accent} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
});

function getWheelbase(style: CarDef['bodyStyle']) {
  switch (style) {
    case 'muscle':
      return { front: -1.45, rear: 1.45 };
    case 'proto':
      return { front: -1.55, rear: 1.5 };
    default:
      return { front: -1.35, rear: 1.3 };
  }
}

function getDims(style: CarDef['bodyStyle']) {
  const base = {
    len: BODY_LEN,
    width: BODY_W,
    height: 0.55,
    bodyY: 0.55,
    cabinL: 1.7,
    cabinH: 0.42,
    wheelR: 0.36,
    spoiler: false,
  };
  switch (style) {
    case 'muscle':
      return { ...base, height: 0.62, cabinH: 0.46, spoiler: true };
    case 'gt':
      return { ...base, len: 4.6, cabinL: 2.0, spoiler: false };
    case 'super':
      return { ...base, height: 0.48, bodyY: 0.5, cabinH: 0.36, spoiler: true, wheelR: 0.38 };
    case 'hyper':
      return { ...base, len: 4.5, height: 0.44, bodyY: 0.47, cabinH: 0.33, spoiler: true, wheelR: 0.39, width: 2.0 };
    case 'proto':
      return { ...base, len: 4.7, height: 0.42, bodyY: 0.46, cabinH: 0.34, cabinL: 1.5, spoiler: true, wheelR: 0.4, width: 2.0 };
    default:
      return base;
  }
}
