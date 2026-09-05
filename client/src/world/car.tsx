import { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CarDef } from 'shared';

/**
 * Fresh procedural race car. Built nose-toward-+Z so that
 * `group.rotation.y = heading` matches the physics forward vector
 * (sin h, cos h). Wheels sit on the correct axes and actually turn.
 */

export interface CarAnim {
  spin: number; // accumulated wheel rotation (radians)
  steer: number; // -1..1
  boosting: boolean;
  braking: boolean;
}

interface Props {
  car: CarDef;
  paint: string;
  accent: string;
  anim?: React.MutableRefObject<CarAnim>;
  lights?: boolean; // night headlights
}

interface Dims {
  len: number;
  wid: number;
  bodyH: number;
  ride: number; // body base height
  cabinL: number;
  cabinW: number;
  cabinH: number;
  cabinZ: number; // cabin center offset (negative = rearward)
  wheelR: number;
  track: number; // lateral wheel offset
  wbF: number; // front axle z
  wbR: number; // rear axle z (negative)
  spoiler: boolean;
  noseDrop: number;
}

function dimsFor(style: CarDef['bodyStyle']): Dims {
  switch (style) {
    case 'muscle':
      return { len: 4.3, wid: 1.95, bodyH: 0.62, ride: 0.42, cabinL: 1.7, cabinW: 1.5, cabinH: 0.5, cabinZ: -0.3, wheelR: 0.37, track: 0.82, wbF: 1.45, wbR: -1.4, spoiler: true, noseDrop: 0.02 };
    case 'gt':
      return { len: 4.6, wid: 1.9, bodyH: 0.55, ride: 0.4, cabinL: 2.0, cabinW: 1.5, cabinH: 0.44, cabinZ: -0.2, wheelR: 0.36, track: 0.8, wbF: 1.5, wbR: -1.45, spoiler: false, noseDrop: 0.06 };
    case 'super':
      return { len: 4.3, wid: 1.95, bodyH: 0.48, ride: 0.36, cabinL: 1.6, cabinW: 1.4, cabinH: 0.38, cabinZ: -0.35, wheelR: 0.35, track: 0.84, wbF: 1.5, wbR: -1.45, spoiler: true, noseDrop: 0.1 };
    case 'hyper':
      return { len: 4.5, wid: 2.0, bodyH: 0.44, ride: 0.33, cabinL: 1.5, cabinW: 1.35, cabinH: 0.34, cabinZ: -0.3, wheelR: 0.35, track: 0.88, wbF: 1.55, wbR: -1.5, spoiler: true, noseDrop: 0.12 };
    case 'proto':
      return { len: 4.7, wid: 2.0, bodyH: 0.42, ride: 0.32, cabinL: 1.4, cabinW: 1.3, cabinH: 0.34, cabinZ: -0.2, wheelR: 0.36, track: 0.88, wbF: 1.6, wbR: -1.55, spoiler: true, noseDrop: 0.12 };
    default:
      return { len: 4.2, wid: 1.88, bodyH: 0.55, ride: 0.4, cabinL: 1.7, cabinW: 1.48, cabinH: 0.44, cabinZ: -0.25, wheelR: 0.36, track: 0.8, wbF: 1.35, wbR: -1.3, spoiler: false, noseDrop: 0.05 };
  }
}

export const CarModel = forwardRef<THREE.Group, Props>(function CarModel(
  { car, paint, accent, anim, lights = false },
  ref
) {
  const d = useMemo(() => dimsFor(car.bodyStyle), [car.bodyStyle]);
  const fl = useRef<THREE.Group>(null);
  const fr = useRef<THREE.Group>(null);
  const spinners = useRef<(THREE.Group | null)[]>([]);
  const flames = useRef<THREE.Group>(null);
  const brakeMat = useRef<THREE.MeshStandardMaterial>(null);

  // wheel slots: [x, z, steer?]
  const wheels: [number, number, boolean][] = useMemo(
    () => [
      [-d.track, d.wbF, true],
      [d.track, d.wbF, true],
      [-d.track, d.wbR, false],
      [d.track, d.wbR, false],
    ],
    [d]
  );

  useFrame(() => {
    const a = anim?.current;
    spinners.current.forEach((g) => {
      if (g && a) g.rotation.x = a.spin;
    });
    if (a) {
      if (fl.current) fl.current.rotation.y = a.steer * 0.42;
      if (fr.current) fr.current.rotation.y = a.steer * 0.42;
    }
    if (flames.current) {
      const on = a?.boosting ?? false;
      flames.current.visible = on;
      if (on) {
        const s = 0.85 + Math.random() * 0.45;
        flames.current.scale.set(s, s, s * 1.3);
      }
    }
    if (brakeMat.current) brakeMat.current.emissiveIntensity = a?.braking ? 5 : 1.4;
  });

  const bodyY = d.ride + d.bodyH / 2;
  const paintMat = { color: paint, metalness: 0.6, roughness: 0.3 };
  const darkMat = { color: '#0b0e16', metalness: 0.5, roughness: 0.45 };

  return (
    <group ref={ref}>
      {/* main hull */}
      <mesh position={[0, bodyY, 0]} castShadow>
        <boxGeometry args={[d.wid, d.bodyH, d.len]} />
        <meshStandardMaterial {...paintMat} />
      </mesh>
      {/* tapered nose */}
      <mesh position={[0, bodyY - d.noseDrop, d.len / 2 - 0.28]} castShadow>
        <boxGeometry args={[d.wid * 0.94, d.bodyH * 0.66, 0.9]} />
        <meshStandardMaterial {...paintMat} />
      </mesh>
      {/* front splitter */}
      <mesh position={[0, d.ride - 0.12, d.len / 2 - 0.1]}>
        <boxGeometry args={[d.wid * 0.96, 0.1, 0.5]} />
        <meshStandardMaterial {...darkMat} />
      </mesh>
      {/* cabin */}
      <mesh position={[0, bodyY + d.bodyH / 2 + d.cabinH / 2 - 0.06, d.cabinZ]} castShadow>
        <boxGeometry args={[d.cabinW, d.cabinH, d.cabinL]} />
        <meshStandardMaterial color="#182a45" metalness={0.55} roughness={0.18} />
      </mesh>
      {/* windshield glow strip */}
      <mesh position={[0, bodyY + d.bodyH / 2 + d.cabinH / 2 - 0.04, d.cabinZ + d.cabinL / 2 - 0.12]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[d.cabinW * 0.92, d.cabinH * 0.9, 0.05]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* rear diffuser */}
      <mesh position={[0, d.ride - 0.1, -d.len / 2 + 0.15]}>
        <boxGeometry args={[d.wid * 0.9, 0.12, 0.4]} />
        <meshStandardMaterial {...darkMat} />
      </mesh>
      {/* spoiler */}
      {d.spoiler && (
        <group position={[0, bodyY + d.bodyH / 2 + 0.34, -d.len / 2 + 0.25]}>
          <mesh castShadow>
            <boxGeometry args={[d.wid * 0.94, 0.06, 0.4]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>
          <mesh position={[-d.wid * 0.32, -0.17, 0.05]}>
            <boxGeometry args={[0.07, 0.32, 0.3]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>
          <mesh position={[d.wid * 0.32, -0.17, 0.05]}>
            <boxGeometry args={[0.07, 0.32, 0.3]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>
        </group>
      )}
      {/* neon side blades */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (d.wid / 2 + 0.005), bodyY - d.bodyH * 0.22, -0.1]}>
          <boxGeometry args={[0.02, 0.07, d.len * 0.62]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
      {/* headlights */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * d.wid * 0.3, bodyY + 0.02, d.len / 2 + 0.13]}>
          <boxGeometry args={[0.42, 0.12, 0.06]} />
          <meshStandardMaterial color="#fff6da" emissive={lights ? '#ffedb0' : '#8a8a7a'} emissiveIntensity={lights ? 3 : 0.4} toneMapped={false} />
        </mesh>
      ))}
      {/* brake bar */}
      <mesh position={[0, bodyY + 0.08, -d.len / 2 - 0.02]}>
        <boxGeometry args={[d.wid * 0.66, 0.1, 0.05]} />
        <meshStandardMaterial ref={brakeMat} color="#5c0a16" emissive="#ff2444" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* nitro flames (rear) */}
      <group ref={flames} position={[0, bodyY - 0.12, -d.len / 2 - 0.5]} visible={false}>
        {[-0.3, 0.3].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.14, 1.0, 8]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.08, 0.6, 8]} />
              <meshBasicMaterial color="#e0f2fe" transparent opacity={0.9} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      {/* wheels — x: lateral, y: height, z: longitudinal */}
      {wheels.map(([x, z, steer], i) => (
        <group
          key={i}
          position={[x, d.wheelR - 0.02, z]}
          ref={steer ? (i === 0 ? fl : fr) : undefined}
        >
          <group
            ref={(el) => {
              spinners.current[i] = el;
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[d.wheelR, d.wheelR, 0.3, 16]} />
              <meshStandardMaterial color="#101318" roughness={0.85} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[d.wheelR * 0.52, d.wheelR * 0.52, 0.32, 10]} />
              <meshStandardMaterial color={accent} metalness={0.85} roughness={0.25} emissive={accent} emissiveIntensity={0.4} />
            </mesh>
            {/* spokes so the spin is visible */}
            {[0, 1, 2].map((s) => (
              <mesh key={s} rotation={[(s * Math.PI) / 3, 0, 0]}>
                <boxGeometry args={[0.34, d.wheelR * 1.7, 0.1]} />
                <meshStandardMaterial color="#1c2230" metalness={0.6} roughness={0.4} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
      {/* soft blob shadow (cheap, always on) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[d.wid * 1.7, d.len * 1.12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {/* underglow */}
      {lights && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[d.wid * 1.9, d.len * 1.25]} />
          <meshBasicMaterial color={accent} transparent opacity={0.14} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
});
