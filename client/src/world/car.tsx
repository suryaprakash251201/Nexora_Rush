import { forwardRef, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CarDef } from 'shared';

/**
 * Realistic procedural GT car — original design, generic (no brand IP).
 * Built nose-toward-+Z so `rotation.y = heading` matches physics.
 * Paint uses clearcoat physical material; wheels have rims, discs,
 * calipers and spokes so spin + steering read clearly.
 */

export interface CarAnim {
  spin: number;
  steer: number; // -1..1
  boosting: boolean;
  braking: boolean;
}

interface Props {
  car: CarDef;
  paint: string;
  accent: string;
  anim?: React.MutableRefObject<CarAnim>;
  lights?: boolean;
}

interface Dims {
  len: number;
  wid: number;
  bodyH: number;
  ride: number;
  glassL: number;
  glassW: number;
  glassH: number;
  glassZ: number;
  wheelR: number;
  wheelW: number;
  track: number;
  wbF: number;
  wbR: number;
  wing: 'none' | 'lip' | 'sport' | 'gt';
  hoodSlope: number;
}

function dimsFor(style: CarDef['bodyStyle']): Dims {
  switch (style) {
    case 'muscle':
      return { len: 4.45, wid: 1.96, bodyH: 0.6, ride: 0.42, glassL: 1.55, glassW: 1.42, glassH: 0.46, glassZ: -0.35, wheelR: 0.37, wheelW: 0.3, track: 0.82, wbF: 1.48, wbR: -1.42, wing: 'sport', hoodSlope: 0.1 };
    case 'gt':
      return { len: 4.65, wid: 1.92, bodyH: 0.54, ride: 0.4, glassL: 1.9, glassW: 1.44, glassH: 0.42, glassZ: -0.25, wheelR: 0.36, wheelW: 0.29, track: 0.8, wbF: 1.52, wbR: -1.46, wing: 'lip', hoodSlope: 0.14 };
    case 'super':
      return { len: 4.35, wid: 1.97, bodyH: 0.47, ride: 0.35, glassL: 1.5, glassW: 1.34, glassH: 0.36, glassZ: -0.4, wheelR: 0.35, wheelW: 0.31, track: 0.85, wbF: 1.52, wbR: -1.46, wing: 'gt', hoodSlope: 0.18 };
    case 'hyper':
      return { len: 4.55, wid: 2.02, bodyH: 0.43, ride: 0.32, glassL: 1.45, glassW: 1.3, glassH: 0.32, glassZ: -0.35, wheelR: 0.35, wheelW: 0.33, track: 0.89, wbF: 1.58, wbR: -1.52, wing: 'gt', hoodSlope: 0.2 };
    case 'proto':
      return { len: 4.75, wid: 2.0, bodyH: 0.42, ride: 0.31, glassL: 1.5, glassW: 1.24, glassH: 0.34, glassZ: -0.15, wheelR: 0.36, wheelW: 0.32, track: 0.88, wbF: 1.62, wbR: -1.56, wing: 'gt', hoodSlope: 0.19 };
    default:
      return { len: 4.25, wid: 1.88, bodyH: 0.54, ride: 0.4, glassL: 1.6, glassW: 1.42, glassH: 0.42, glassZ: -0.3, wheelR: 0.36, wheelW: 0.29, track: 0.8, wbF: 1.36, wbR: -1.32, wing: 'none', hoodSlope: 0.13 };
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
  const body = useRef<THREE.Group>(null);

  const wheels: [number, number, boolean][] = useMemo(
    () => [
      [-d.track, d.wbF, true],
      [d.track, d.wbF, true],
      [-d.track, d.wbR, false],
      [d.track, d.wbR, false],
    ],
    [d]
  );

  useFrame(({ clock }) => {
    const a = anim?.current;
    spinners.current.forEach((g) => {
      if (g && a) g.rotation.x = a.spin;
    });
    if (a) {
      // steer +1 = right (screen-right). Positive local Y rotation points the
      // wheels toward the car's left (+X), so negate to match input.
      if (fl.current) fl.current.rotation.y = -a.steer * 0.42;
      if (fr.current) fr.current.rotation.y = -a.steer * 0.42;
    }
    if (flames.current) {
      const on = a?.boosting ?? false;
      flames.current.visible = on;
      if (on) {
        const s = 0.85 + Math.random() * 0.45;
        flames.current.scale.set(s, s, s * 1.3);
      }
    }
    if (brakeMat.current) brakeMat.current.emissiveIntensity = a?.braking ? 5 : 1.5;
    // subtle idle breathing so the car feels alive in menus
    if (body.current && !a) {
      body.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.008;
    }
  });

  const bodyY = d.ride + d.bodyH / 2;
  const paintMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(paint),
        metalness: 0.75,
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    [paint]
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#0e1c30'),
        metalness: 0.2,
        roughness: 0.06,
        clearcoat: 1,
        transparent: true,
        opacity: 0.92,
      }),
    []
  );
  const carbonMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0b0e16', metalness: 0.5, roughness: 0.45 }),
    []
  );
  const chromeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#cfd6e2', metalness: 1, roughness: 0.22 }),
    []
  );

  return (
    <group ref={ref}>
      <group ref={body}>
        {/* ---- lower hull ---- */}
        <mesh position={[0, bodyY, 0]} castShadow material={paintMat}>
          <boxGeometry args={[d.wid, d.bodyH, d.len]} />
        </mesh>
        {/* ---- sculpted shoulders (tapered upper hull) ---- */}
        <mesh position={[0, bodyY + d.bodyH * 0.32, -0.15]} castShadow material={paintMat}>
          <boxGeometry args={[d.wid * 0.92, d.bodyH * 0.5, d.len * 0.78]} />
        </mesh>
        {/* ---- sloped hood ---- */}
        <mesh position={[0, bodyY + d.bodyH * 0.28, d.len / 2 - 0.75]} rotation={[-d.hoodSlope, 0, 0]} castShadow material={paintMat}>
          <boxGeometry args={[d.wid * 0.88, d.bodyH * 0.4, 1.15]} />
        </mesh>
        {/* ---- front bumper + grille ---- */}
        <mesh position={[0, bodyY - d.bodyH * 0.18, d.len / 2 - 0.12]} material={carbonMat}>
          <boxGeometry args={[d.wid * 0.98, d.bodyH * 0.52, 0.42]} />
        </mesh>
        <mesh position={[0, bodyY - d.bodyH * 0.16, d.len / 2 + 0.09]}>
          <boxGeometry args={[d.wid * 0.52, d.bodyH * 0.3, 0.04]} />
          <meshStandardMaterial color="#05070c" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* bumper side intakes */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * d.wid * 0.36, bodyY - d.bodyH * 0.2, d.len / 2 + 0.08]}>
            <boxGeometry args={[0.3, d.bodyH * 0.26, 0.05]} />
            <meshStandardMaterial color="#05070c" roughness={0.7} />
          </mesh>
        ))}
        {/* front splitter */}
        <mesh position={[0, d.ride - 0.14, d.len / 2 - 0.05]} material={carbonMat}>
          <boxGeometry args={[d.wid * 1.0, 0.08, 0.55]} />
        </mesh>
        {/* ---- glasshouse ---- */}
        <mesh position={[0, bodyY + d.bodyH * 0.55 + d.glassH / 2 - 0.1, d.glassZ]} castShadow material={glassMat}>
          <boxGeometry args={[d.glassW, d.glassH, d.glassL]} />
        </mesh>
        {/* roof panel (paint) */}
        <mesh position={[0, bodyY + d.bodyH * 0.55 + d.glassH - 0.08, d.glassZ - 0.1]} castShadow material={paintMat}>
          <boxGeometry args={[d.glassW * 0.94, 0.07, d.glassL * 0.52]} />
        </mesh>
        {/* windshield header beam */}
        <mesh position={[0, bodyY + d.bodyH * 0.55 + d.glassH * 0.55, d.glassZ + d.glassL / 2 - 0.18]} rotation={[-0.42, 0, 0]} material={paintMat}>
          <boxGeometry args={[d.glassW * 0.96, 0.09, 0.3]} />
        </mesh>
        {/* ---- fender flares over wheels ---- */}
        {wheels.map(([x, z], i) => (
          <mesh key={i} position={[x, d.wheelR + 0.12, z]} castShadow material={paintMat}>
            <boxGeometry args={[0.24, 0.3, d.wheelR * 2.5]} />
          </mesh>
        ))}
        {/* ---- side skirts ---- */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (d.wid / 2 - 0.02), d.ride - 0.06, -0.1]} material={carbonMat}>
            <boxGeometry args={[0.1, 0.14, d.len * 0.5]} />
          </mesh>
        ))}
        {/* ---- door shut lines ---- */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (d.wid / 2 + 0.002), bodyY + 0.02, -0.25]}>
            <boxGeometry args={[0.012, d.bodyH * 0.85, 0.02]} />
            <meshStandardMaterial color="#000000" roughness={0.9} transparent opacity={0.55} />
          </mesh>
        ))}
        {/* ---- mirrors ---- */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * (d.wid / 2 + 0.12), bodyY + d.bodyH * 0.45, d.glassZ + d.glassL / 2 - 0.25]}>
            <mesh material={paintMat}>
              <boxGeometry args={[0.16, 0.1, 0.12]} />
            </mesh>
            <mesh position={[s * -0.02, -0.05, 0]} material={carbonMat}>
              <boxGeometry args={[0.05, 0.06, 0.05]} />
            </mesh>
          </group>
        ))}
        {/* ---- headlights: angular LED units ---- */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * d.wid * 0.31, bodyY + 0.06, d.len / 2 + 0.1]}>
            <mesh rotation={[0, s * -0.28, 0]}>
              <boxGeometry args={[0.5, 0.11, 0.1]} />
              <meshStandardMaterial color="#101418" roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.01, 0.055]} rotation={[0, s * -0.28, 0]}>
              <boxGeometry args={[0.44, 0.045, 0.02]} />
              <meshStandardMaterial color="#eaf6ff" emissive={lights ? '#eaf6ff' : '#5a6a7a'} emissiveIntensity={lights ? 3.2 : 0.5} toneMapped={false} />
            </mesh>
            <mesh position={[s * -0.12, -0.03, 0.05]}>
              <sphereGeometry args={[0.055, 10, 10]} />
              <meshStandardMaterial color="#cfe8ff" emissive={lights ? '#bfe0ff' : '#33404f'} emissiveIntensity={lights ? 2.4 : 0.4} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* ---- full-width tail light bar ---- */}
        <mesh position={[0, bodyY + 0.1, -d.len / 2 - 0.02]}>
          <boxGeometry args={[d.wid * 0.78, 0.09, 0.05]} />
          <meshStandardMaterial ref={brakeMat} color="#4a0a14" emissive="#ff2444" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        {/* ---- rear diffuser + exhausts ---- */}
        <mesh position={[0, d.ride - 0.08, -d.len / 2 + 0.1]} material={carbonMat}>
          <boxGeometry args={[d.wid * 0.92, 0.16, 0.45]} />
        </mesh>
        {[-0.55, -0.18, 0.18, 0.55].map((x, i) => (
          <group key={i} position={[x * d.wid * 0.5, d.ride - 0.05, -d.len / 2 - 0.12]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={chromeMat}>
              <cylinderGeometry args={[0.055, 0.06, 0.16, 12]} />
            </mesh>
            <mesh position={[0, 0, -0.085]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.042, 12]} />
              <meshBasicMaterial color="#050505" />
            </mesh>
          </group>
        ))}
        {/* ---- wings ---- */}
        {d.wing === 'lip' && (
          <mesh position={[0, bodyY + d.bodyH / 2 + 0.02, -d.len / 2 + 0.12]} castShadow material={paintMat}>
            <boxGeometry args={[d.wid * 0.8, 0.05, 0.28]} />
          </mesh>
        )}
        {(d.wing === 'sport' || d.wing === 'gt') && (
          <group position={[0, bodyY + d.bodyH / 2 + (d.wing === 'gt' ? 0.42 : 0.3), -d.len / 2 + 0.28]}>
            <mesh castShadow material={d.wing === 'gt' ? carbonMat : paintMat}>
              <boxGeometry args={[d.wid * (d.wing === 'gt' ? 0.96 : 0.9), 0.06, d.wing === 'gt' ? 0.45 : 0.36]} />
            </mesh>
            {[-d.wid * 0.32, d.wid * 0.32].map((x, i) => (
              <mesh key={i} position={[x, d.wing === 'gt' ? -0.21 : -0.15, 0.02]} material={carbonMat}>
                <boxGeometry args={[0.07, d.wing === 'gt' ? 0.4 : 0.28, 0.32]} />
              </mesh>
            ))}
            {d.wing === 'gt' && (
              <mesh position={[0, -0.02, -0.2]}>
                <boxGeometry args={[d.wid * 0.5, 0.16, 0.03]} />
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
              </mesh>
            )}
          </group>
        )}
        {/* ---- neon side blades ---- */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (d.wid / 2 + 0.005), bodyY - d.bodyH * 0.24, -0.1]}>
            <boxGeometry args={[0.02, 0.06, d.len * 0.55]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))}
        {/* ---- nitro flames ---- */}
        <group ref={flames} position={[0, bodyY - 0.18, -d.len / 2 - 0.55]} visible={false}>
          {[-0.28, 0.28].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.13, 1.0, 8]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0, 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.075, 0.6, 8]} />
                <meshBasicMaterial color="#e0f2fe" transparent opacity={0.9} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* ---- wheels: tire + rim + spokes + disc + caliper ---- */}
      {wheels.map(([x, z, steer], i) => (
        <group key={i} position={[x, d.wheelR - 0.02, z]} ref={steer ? (i === 0 ? fl : fr) : undefined}>
          <group ref={(el) => { spinners.current[i] = el; }}>
            {/* tire */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[d.wheelR, d.wheelR, d.wheelW, 20]} />
              <meshStandardMaterial color="#0c0e12" roughness={0.9} />
            </mesh>
            {/* sidewall ring */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[d.wheelR * 0.82, 0.028, 8, 20]} />
              <meshStandardMaterial color="#1a2029" roughness={0.7} />
            </mesh>
            {/* brake disc */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[d.wheelR * 0.55, d.wheelR * 0.55, d.wheelW + 0.02, 16]} />
              <meshStandardMaterial color="#8a93a3" metalness={0.9} roughness={0.35} />
            </mesh>
            {/* 5 double spokes */}
            {[0, 1, 2, 3, 4].map((s) => (
              <mesh key={s} rotation={[(s * Math.PI * 2) / 5, 0, 0]}>
                <boxGeometry args={[d.wheelW + 0.06, d.wheelR * 1.05, 0.09]} />
                <meshStandardMaterial color="#d5dbe6" metalness={0.9} roughness={0.25} />
              </mesh>
            ))}
            {/* hub + lug */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[d.wheelR * 0.16, d.wheelR * 0.16, d.wheelW + 0.08, 10]} />
              <meshStandardMaterial color={accent} metalness={0.85} roughness={0.25} emissive={accent} emissiveIntensity={0.5} />
            </mesh>
            {/* caliper (does not spin visually — static offset reads as detail) */}
            <mesh position={[0, 0.05, d.wheelR * 0.42]}>
              <boxGeometry args={[d.wheelW * 0.7, 0.12, 0.1]} />
              <meshStandardMaterial color="#c81e3a" metalness={0.4} roughness={0.4} />
            </mesh>
          </group>
        </group>
      ))}

      {/* soft blob shadow */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[d.wid * 1.7, d.len * 1.12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {lights && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[d.wid * 1.9, d.len * 1.25]} />
          <meshBasicMaterial color={accent} transparent opacity={0.14} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
});
