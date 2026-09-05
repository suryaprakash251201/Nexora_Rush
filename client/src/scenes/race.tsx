import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { CARS, DIFFICULTIES, getCar, type Difficulty, type RaceMode, type Weather, type TimeOfDay } from 'shared';
import { trackGeo, themeFor } from '@/world/themes';import { RaceEngine, COUNTDOWN_MS, type FinishedSummary } from '@/sim/race';
import { Input } from '@/sim/input';
import { tuneFor } from '@/sim/physics';
import { CarModel, type CarAnim } from '@/world/car';
import { World } from '@/world/env';
import { useTelemetry, resetTelemetry, mapDots } from '@/store/telemetry';
import { useSettings } from '@/store/settings';
import { sound } from '@/sim/audio';

export interface RaceProps {
  trackId: string;
  carId: string;
  mode: RaceMode;
  difficulty: Difficulty;
  laps: number;
  weather: Weather;
  timeOfDay: TimeOfDay;
  frozen: boolean; // pause menu / results open
  onDone: (s: FinishedSummary) => void;
}

/** Fixed sim step; accumulated from wall clock so slow machines stay real-time. */
const STEP = 1 / 60;

export function RaceCanvas(props: RaceProps) {
  const quality = useSettings((s) => s.quality);
  const resolution = useSettings((s) => s.resolution);
  const shadows = useSettings((s) => s.shadows);
  const theme = themeFor(props.trackId);
  const dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2) * resolution;
  const shadowOn = shadows && quality !== 'low';
  return (
    <Canvas
      shadows={shadowOn}
      dpr={dpr}
      camera={{ fov: 64, near: 0.3, far: 1800, position: [0, 5, -10] }}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#04060c']} />
      <fog attach="fog" args={[theme.fogColor, theme.fogNear, theme.fogFar]} />
      <ambientLight color={theme.ambient} intensity={theme.ambientI * 3} />
      <hemisphereLight args={[theme.skyTop, theme.ground, 1.1]} />
      <directionalLight
        color={theme.sun}
        intensity={theme.sunI * 4}
        position={theme.sunPos}
        castShadow={shadowOn}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-far={500}
      />
      <RaceWorld {...props} />
    </Canvas>
  );
}

function RaceWorld({ trackId, carId, mode, difficulty, laps, weather, timeOfDay, frozen, onDone }: RaceProps) {
  const track = useMemo(() => trackGeo(trackId), [trackId]);
  const theme = useMemo(() => themeFor(trackId), [trackId]);
  const car = useMemo(() => getCar(carId) ?? CARS[0], [carId]);
  const tune = useMemo(() => tuneFor(car), [car]);
  const camMode = useSettings((s) => s.camera);
  const night = timeOfDay === 'night';

  const playerG = useRef<THREE.Group>(null);
  const rivalG = useRef<(THREE.Group | null)[]>([]);
  const playerAnim = useRef<CarAnim>({ spin: 0, steer: 0, boosting: false, braking: false });
  const shake = useRef(0);
  const cine = useRef(0);
  const camP = useRef(new THREE.Vector3(0, 5, -10));
  const camL = useRef(new THREE.Vector3(0, 1, 0));
  const acc = useRef(0);
  const tele = useRef(0);
  const fpsA = useRef(0);
  const fpsN = useRef(0);
  const done = useRef(false);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const engine = useMemo(() => {
    done.current = false;
    acc.current = 0;
    mapDots.length = 0;
    resetTelemetry({
      laps: mode === 'endless' ? 0 : laps,
      grid: mode === 'time-trial' ? 1 : DIFFICULTIES[difficulty].aiCount + 1,
    });
    return new RaceEngine(
      {
        track,
        car,
        rivals: CARS.filter((c) => c.id !== car.id),
        difficulty,
        laps,
        mode,
        weather,
      },
      {
        onTick: (n) => {
          useTelemetry.setState({ count: n });
          sound.beep(false);
        },
        onGo: () => {
          useTelemetry.setState({ count: 0, phase: 'racing' });
          sound.beep(true);
        },
        onLap: () => {
          useTelemetry.setState((s) => ({ evLap: s.evLap + 1 }));
          sound.ping();
        },
        onHit: (h) => {
          shake.current = Math.max(shake.current, h * 0.8);
          useTelemetry.setState((s) => ({ evHit: s.evHit + 1 }));
          sound.thud(h);
        },
        onNear: () => {
          useTelemetry.setState((s) => ({ evNear: s.evNear + 1 }));
          sound.ping();
        },
        onPass: () => useTelemetry.setState((s) => ({ evPass: s.evPass + 1 })),
        onBoost: () => sound.whoosh(),
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, car, difficulty, laps, mode, weather]);

  const input = useMemo(() => new Input(), []);
  useEffect(() => {
    input.attach();
    input.sensitivity = useSettings.getState().sensitivity;
    input.onReset = () => engine.resetPlayer();
    return () => input.detach();
  }, [input, engine]);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.25);
    const eng = engine;

    if (!frozenRef.current && eng.phase !== 'finished') {
      const ctl = input.sample(dt);
      // wall-clock accumulator: fixed steps, max 8/frame (drop backlog)
      acc.current = Math.min(acc.current + dt, STEP * 8);
      while (acc.current >= STEP) {
        eng.update((STEP * 1000), ctl);
        acc.current -= STEP;
      }
      sound.engine(Math.min(1, Math.abs(eng.player.speed) / tune.top), ctl.throttle, eng.player.boosting);
      sound.slide(eng.player.drift, Math.min(1, Math.abs(eng.player.speed) / 80));
      playerAnim.current.spin += (eng.player.speed / 0.36) * dt;
      playerAnim.current.steer = ctl.steer;
      playerAnim.current.boosting = eng.player.boosting;
      playerAnim.current.braking = ctl.brake > 0;
    }

    if (eng.phase === 'finished' && !done.current) {
      done.current = true;
      sound.engineOff();
      onDoneRef.current(eng.summary());
    }

    const p = eng.player;
    const fx = Math.sin(p.heading);
    const fz = Math.cos(p.heading);
    const v01 = Math.min(1, Math.abs(p.speed) / tune.top);

    // ---- camera ----
    shake.current = Math.max(0, shake.current - dt * 2.4);
    const sh = shake.current * 0.35 + (p.boosting ? 0.05 : 0) + v01 * v01 * 0.03;
    let fov = 64;
    if (eng.phase === 'countdown' || (eng.phase === 'finished' && camMode === 'chase')) {
      cine.current += dt * 0.45;
      const r = 10.5 + Math.sin(cine.current * 0.7) * 1.6;
      const a = cine.current;
      camP.current.set(p.x + Math.sin(a) * r, p.y + 3.2 + Math.sin(a * 1.3), p.z + Math.cos(a) * r);
      camL.current.set(p.x, p.y + 0.9, p.z);
      fov = 54;
    } else if (camMode === 'hood') {
      camP.current.set(p.x + fx * 0.35, p.y + 1.2, p.z + fz * 0.35);
      camL.current.set(p.x + fx * 30, p.y + 0.9, p.z + fz * 30);
      fov = 70 + v01 * 12;
    } else {
      const dist = 8.4 + v01 * 3.2;
      camP.current.lerp(new THREE.Vector3(p.x - fx * dist, p.y + 3.1 + v01 * 0.6, p.z - fz * dist), Math.min(1, dt * 5.5));
      camL.current.lerp(new THREE.Vector3(p.x + fx * (6 + v01 * 12), p.y + 1.1, p.z + fz * (6 + v01 * 12)), Math.min(1, dt * 6.5));
      fov = 62 + v01 * 10 + (p.boosting ? 9 : 0);
    }
    camera.position.copy(camP.current);
    if (sh > 0.001) {
      camera.position.x += (Math.random() - 0.5) * sh;
      camera.position.y += (Math.random() - 0.5) * sh;
    }
    camera.lookAt(camL.current);
    (window as any).__dbg = {
      cam: camera.position.toArray().map((v: number) => Math.round(v * 10) / 10),
      look: camL.current.toArray().map((v: number) => Math.round(v * 10) / 10),
      p: [p.x, p.y, p.z].map((v: number) => Math.round(v * 10) / 10),
      phase: eng.phase,
      rivals: eng.rivals.length,
    };
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov += (fov - pc.fov) * Math.min(1, dt * 5);
    pc.updateProjectionMatrix();

    // ---- car visuals (yaw = heading; nose is +Z so this is exact) ----
    if (playerG.current) {
      playerG.current.position.set(p.x, p.y, p.z);
      const slide = Math.atan2(p.vLat, Math.max(6, Math.abs(p.speed))) * (p.speed >= 0 ? 1 : -1);
      playerG.current.rotation.y = p.heading + slide * 0.55;
      playerG.current.rotation.x = p.airborne ? Math.max(-0.2, Math.min(0.2, -p.vy * 0.02)) : playerG.current.rotation.x * 0.9;
    }
    eng.rivals.forEach((r, i) => {
      const g = rivalG.current[i];
      if (g) {
        g.position.set(r.state.x, r.state.y, r.state.z);
        g.rotation.y = r.state.heading;
      }
    });

    // ---- minimap + telemetry (~12 Hz) ----
    mapDots.length = 0;
    mapDots.push({ x: p.x, z: p.z, me: true });
    for (const r of eng.rivals) mapDots.push({ x: r.state.x, z: r.state.z, me: false });

    tele.current += dt;
    if (tele.current > 0.08) {
      tele.current = 0;
      useTelemetry.setState({
        phase: eng.phase,
        speedKmh: Math.abs(p.speed) * 3.6,
        lap: eng.currentLap,
        position: eng.computePosition(),
        grid: eng.gridSize,
        nitro: p.nitro / Math.max(0.001, tune.tank),
        boosting: p.boosting,
        raceMs: Math.max(0, eng.timeMs),
        lapMs: Math.max(0, eng.lapClockMs),
        bestMs: eng.bestLapMs,
        lastMs: eng.lastLapMs,
        drift: Math.round(eng.events.driftPoints),
        standings: eng.standings(),
        wrecked: eng.wrecked,
      });
    }
    fpsA.current += rawDt;
    fpsN.current += 1;
    if (fpsA.current > 0.5) {
      useTelemetry.setState({ fps: Math.round(fpsN.current / fpsA.current) });
      fpsA.current = 0;
      fpsN.current = 0;
    }
  });

  return (
    <group>
      <World theme={theme} track={track} weather={weather} />
      <group ref={playerG}>
        <CarModel car={car} paint={car.colors[0]} accent={theme.neon} anim={playerAnim} lights={night} />
      </group>
      {engine.rivals.map((r, i) => (
        <group
          key={r.state.id}
          ref={(el) => {
            rivalG.current[i] = el;
          }}
        >
          <CarModel car={getCar(r.state.carId) ?? CARS[0]} paint={r.state.color} accent={r.state.color} lights={night} />
        </group>
      ))}
    </group>
  );
}

export { COUNTDOWN_MS };
export type { FinishedSummary };
