import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CARS, DIFFICULTIES, getCar, type CarDef, type Difficulty, type RaceMode, type Weather, type TimeOfDay } from 'shared';
import { getTrackGeometry, getClientTrack } from '@/game/tracks/trackDefs';
import { RaceEngine } from '@/game/engine/race';
import { InputManager } from '@/game/engine/input';
import { physicsParams } from '@/game/engine/physics';
import { CarModel } from '@/game/cars/CarModel';
import { ThemeEnvironment } from '@/game/environment/ThemeEnvironment';
import { useTelemetry, resetTelemetry, minimapDots } from '@/store/telemetry';
import { useSettings, type CameraMode } from '@/store/settings';
import { audio } from '@/game/engine/audio';

export interface RaceSceneProps {
  trackId: string;
  carId: string;
  mode: RaceMode;
  difficulty: Difficulty;
  laps: number;
  weather: Weather;
  timeOfDay: TimeOfDay;
  paused: boolean;
  onFinish: (result: FinishedRace) => void;
}

export interface FinishedRace {
  position: number;
  grid: number;
  raceTimeMs: number | null;
  bestLapMs: number | null;
  lapTimesMs: number[];
  events: {
    overtakes: number;
    nearMisses: number;
    driftPoints: number;
    nitroChains: number;
    topSpeedKmh: number;
    collisions: number;
  };
  wrecked: boolean;
  fastLap: boolean;
}

export function RaceCanvas(props: RaceSceneProps) {
  const quality = useSettings((s) => s.quality);
  const resolutionScale = useSettings((s) => s.resolutionScale);
  const dpr = Math.min(window.devicePixelRatio, quality === 'low' ? 1 : quality === 'medium' ? 1.35 : 2) * resolutionScale;
  const shadows = useSettings((s) => s.shadows) && quality !== 'low';

  return (
    <Canvas
      shadows={shadows}
      dpr={dpr}
      camera={{ fov: 64, near: 0.3, far: 1600, position: [0, 6, -12] }}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#05070d']} />
      <RaceWorld {...props} />
    </Canvas>
  );
}

function RaceWorld({ trackId, carId, mode, difficulty, laps, weather, timeOfDay, paused, onFinish }: RaceSceneProps) {
  const track = useMemo(() => getTrackGeometry(trackId), [trackId]);
  const clientTrack = useMemo(() => getClientTrack(trackId)!, [trackId]);
  const car = useMemo(() => getCar(carId) ?? CARS[0], [carId]);
  const { camera, scene } = useThree();

  const playerGroup = useRef<THREE.Group>(null);
  const aiGroups = useRef<(THREE.Group | null)[]>([]);
  const wheelSpin = useRef(0);
  const steering = useRef(0);
  const boosting = useRef(false);
  const braking = useRef(false);
  const shake = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  // --- engine construction (once per race config) ---
  const settingsSnap = useSettings();
  const telemetryTimer = useRef(0);
  const fpsAcc = useRef(0);
  const fpsFrames = useRef(0);
  const engine = useMemo(() => {
    resetTelemetry({
      laps: mode === 'endless' ? 0 : laps,
      gridSize: mode === 'time-trial' ? 1 : DIFFICULTIES[difficulty].aiCount + 1,
    });
    minimapDots.length = 0;
    const ev = {
      onCountdownTick: (n: number) => {
        useTelemetry.setState({ countdown: n });
        audio.countdownBeep(false);
      },
      onGo: () => {
        useTelemetry.setState({ countdown: 0, phase: 'racing' });
        audio.countdownBeep(true);
      },
      onLap: () => {
        useTelemetry.setState((s) => ({ lapTick: s.lapTick + 1 }));
        audio.checkpoint();
      },
      onCollision: (intensity: number) => {
        shake.current = Math.max(shake.current, intensity * 0.8);
        useTelemetry.setState((s) => ({ collisionTick: s.collisionTick + 1 }));
        audio.collision(intensity);
      },
      onNearMiss: () => {
        useTelemetry.setState((s) => ({ nearMissTick: s.nearMissTick + 1 }));
        audio.checkpoint();
      },
      onOvertake: () => {
        useTelemetry.setState((s) => ({ overtakeTick: s.overtakeTick + 1 }));
      },
      onNitroStart: () => audio.nitroWhoosh(),
      onDriftScore: () => {
        useTelemetry.setState((s) => ({ driftTick: s.driftTick + 1 }));
      },
    };
    return new RaceEngine(
      {
        track,
        car,
        aiCars: CARS.filter((c) => c.id !== car.id),
        difficulty,
        laps,
        mode,
        weather,
      },
      ev
    );
  }, [track, car, difficulty, laps, mode, weather]);

  // --- finish reporting (polled; covers finish + early quit) ---
  const finishedRef = useRef(false);
  useEffect(() => {
    finishedRef.current = false;
  }, [engine]);
  const reportFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const fastLap =
      engine.bestLapMs != null &&
      engine.lapTimesMs.length > 0 &&
      engine.bestLapMs <= Math.min(...engine.lapTimesMs);
    onFinish({
      position: engine.finishPosition,
      grid: engine.gridSize,
      raceTimeMs: Math.round(engine.raceFinishedMs ?? 0),
      bestLapMs: engine.bestLapMs != null ? Math.round(engine.bestLapMs) : null,
      lapTimesMs: engine.lapTimesMs.map((t) => Math.round(t)),
      events: {
        overtakes: engine.events.overtakes,
        nearMisses: engine.events.nearMisses,
        driftPoints: Math.round(engine.events.driftPoints),
        nitroChains: engine.events.nitroChains,
        topSpeedKmh: Math.round(engine.events.topSpeedKmh),
        collisions: engine.events.collisions,
      },
      wrecked: engine.wrecked,
      fastLap,
    });
  };

  // --- fog per time of day ---
  useEffect(() => {
    if (timeOfDay === 'night') {
      scene.fog = new THREE.Fog(clientTrack.theme.fog.color, 40, clientTrack.theme.fog.far * 0.6);
    }
    return () => {
      scene.fog = null;
    };
  }, [scene, timeOfDay, clientTrack]);

  const input = useMemo(() => new InputManager(), []);

  useEffect(() => {
    input.attach();
    input.onReset = () => engine.resetPlayer();
    input.steerSensitivity = settingsSnap.steerSensitivity;
    return () => input.detach();
  }, [input, engine, settingsSnap.steerSensitivity]);

  // --- camera helpers ---
  const camPos = useRef(new THREE.Vector3(0, 6, -12));
  const camLook = useRef(new THREE.Vector3());
  const cineT = useRef(0);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    if (!pausedRef.current && engine.phase !== 'finished') {
      const controls = input.sample(dt);
      engine.update(dt * 1000, controls);
      audio.updateEngine(
        Math.min(1, Math.abs(engine.player.speed) / physicsParams(car).maxSpeed),
        controls.throttle,
        engine.player.nitroActive,
        dt
      );
      audio.updateSkid(engine.player.driftAmount, Math.min(1, Math.abs(engine.player.speed) / 80));
      wheelSpin.current += (engine.player.speed / 0.36) * dt;
      steering.current = controls.steer;
      boosting.current = engine.player.nitroActive;
      braking.current = controls.brake > 0;
    }

    if (engine.phase === 'finished') reportFinish();

    const p = engine.player;
    const fwdX = Math.sin(p.heading);
    const fwdZ = Math.cos(p.heading);
    const speed01 = Math.min(1, Math.abs(p.speed) / physicsParams(car).maxSpeed);

    // ---- camera ----
    const camMode: CameraMode = settingsSnap.camera;
    shake.current = Math.max(0, shake.current - dt * 2.2);
    const shakeAmt = shake.current * 0.35 + (boosting.current ? 0.06 : 0) + speed01 * speed01 * 0.04;
    let targetFov = 64;

    if (engine.phase === 'countdown' || (engine.phase === 'finished' && camMode === 'chase')) {
      // cinematic orbit
      cineT.current += dt * 0.5;
      const r = 11 + Math.sin(cineT.current * 0.7) * 2;
      const a = cineT.current;
      camPos.current.set(p.x + Math.sin(a) * r, p.y + 3.4 + Math.sin(a * 1.3) * 1.2, p.z + Math.cos(a) * r);
      camLook.current.set(p.x, p.y + 0.8, p.z);
      targetFov = 52;
    } else if (camMode === 'hood') {
      camPos.current.set(p.x + fwdX * 0.4, p.y + 1.15, p.z + fwdZ * 0.4);
      camLook.current.set(p.x + fwdX * 30, p.y + 1.0, p.z + fwdZ * 30);
      targetFov = 70 + speed01 * 12;
    } else {
      const dist = 8.2 + speed01 * 3.4;
      const height = 3.1 + speed01 * 0.6;
      const desired = new THREE.Vector3(p.x - fwdX * dist, p.y + height, p.z - fwdZ * dist);
      camPos.current.lerp(desired, Math.min(1, dt * 5.5));
      const lookAhead = new THREE.Vector3(p.x + fwdX * (6 + speed01 * 12), p.y + 1.1, p.z + fwdZ * (6 + speed01 * 12));
      camLook.current.lerp(lookAhead, Math.min(1, dt * 6));
      targetFov = 62 + speed01 * 10 + (boosting.current ? 9 : 0);
    }

    camera.position.lerp(camPos.current, 1);
    if (shakeAmt > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shakeAmt;
      camera.position.y += (Math.random() - 0.5) * shakeAmt;
    }
    camera.lookAt(camLook.current);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 5);
    cam.updateProjectionMatrix();

    // ---- visuals ----
    if (playerGroup.current) {
      playerGroup.current.position.set(p.x, p.y, p.z);
      // visual angle blends heading with drift for a slidey look
      const driftAngle = p.heading + Math.atan2(p.vLat, Math.max(6, Math.abs(p.speed))) * (p.speed >= 0 ? 1 : -1);
      playerGroup.current.rotation.y = driftAngle;
      if (p.airborne) playerGroup.current.rotation.x = Math.max(-0.2, Math.min(0.2, -p.vy * 0.02));
      else playerGroup.current.rotation.x *= 0.9;
    }
    engine.ais.forEach((ai, i) => {
      const g = aiGroups.current[i];
      if (g) {
        g.position.set(ai.state.x, ai.state.y, ai.state.z);
        g.rotation.y = ai.state.heading;
      }
    });

    // ---- minimap dots ----
    minimapDots.length = 0;
    minimapDots.push({ x: p.x, y: p.z, isPlayer: true });
    for (const ai of engine.ais) minimapDots.push({ x: ai.state.x, y: ai.state.z, isPlayer: false });

    // ---- telemetry throttle (~12Hz) ----
    telemetryTimer.current += dt;
    if (telemetryTimer.current > 0.08) {
      telemetryTimer.current = 0;
      const st = engine.standings();
      useTelemetry.setState({
        phase: engine.phase,
        speedKmh: Math.abs(p.speed) * 3.6,
        lap: engine.currentLap,
        position: engine.computePosition(),
        gridSize: engine.gridSize,
        nitro: p.nitro / Math.max(0.001, physicsParams(car).nitroCapacity),
        boosting: p.nitroActive,
        raceTimeMs: Math.max(0, engine.timeMs),
        currentLapMs: Math.max(0, engine.currentLapTimeMs),
        bestLapMs: engine.bestLapMs,
        lastLapMs: engine.lastLapMs,
        driftPoints: Math.round(engine.events.driftPoints),
        standings: st,
        wrecked: engine.wrecked,
      });
    }

    // fps
    fpsAcc.current += dtRaw;
    fpsFrames.current += 1;
    if (fpsAcc.current > 0.5) {
      useTelemetry.setState({ fps: Math.round(fpsFrames.current / fpsAcc.current) });
      fpsAcc.current = 0;
      fpsFrames.current = 0;
    }
    void state;
  });

  // --- track meshes ---
  const roadGeo = useMemo(() => track.buildRoadGeometry(6), [track]);
  const night = timeOfDay === 'night';

  return (
    <group>
      <ThemeEnvironment theme={clientTrack.theme} track={track} weather={weather} />
      {/* road */}
      <mesh geometry={roadGeo} receiveShadow position={[0, 0.01, 0]}>
        <meshStandardMaterial color={clientTrack.theme.road.color} roughness={0.6} metalness={weather === 'rain' ? 0.55 : 0.12} />
      </mesh>
      <StartLine track={track} color={clientTrack.theme.road.centerLine} />
      {/* player */}
      <group ref={playerGroup}>
        <CarModel
          car={car}
          color={car.colors[0]}
          accent={clientTrack.theme.neon}
          wheelSpinRef={wheelSpin}
          steeringRef={steering}
          boostingRef={boosting}
          brakeRef={braking}
          headlights={night}
        />
      </group>
      {/* AI cars */}
      {engine.ais.map((ai, i) => (
        <group
          key={ai.state.id}
          ref={(el) => {
            aiGroups.current[i] = el;
          }}
        >
          <CarModel
            car={getCar(ai.state.carId) ?? CARS[0]}
            color={ai.state.color}
            accent={ai.state.color}
            headlights={night}
          />
        </group>
      ))}
    </group>
  );
}

function StartLine({ track, color }: { track: ReturnType<typeof getTrackGeometry>; color: string }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(track.width, 2.4);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [track.width]);
  const s = track.startLine;
  const angle = Math.atan2(track.tx[0], track.tz[0]);
  return (
    <mesh geometry={geo} position={[s.x, s.y + 0.03, s.z]} rotation={[0, angle, 0]}>
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}
