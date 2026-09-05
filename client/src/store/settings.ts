import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty, RaceMode, TimeOfDay, TrackDef, Weather } from 'shared';
import { getTrack } from 'shared';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type CameraMode = 'chase' | 'hood' | 'cinematic';
export type Units = 'kmh' | 'mph';

export interface SettingsState {
  // graphics
  quality: Quality;
  resolutionScale: number;
  shadows: boolean;
  bloom: boolean;
  reflections: boolean;
  motionBlur: boolean;
  showFps: boolean;
  // audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  engineVolume: number;
  // gameplay
  camera: CameraMode;
  units: Units;
  autoReset: boolean;
  defaultDifficulty: Difficulty;
  // controls
  steerSensitivity: number;
  touchLayout: 'left-right' | 'single-stick';
  reducedMotion: boolean;

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
}

const DEFAULTS = {
  quality: 'high' as Quality,
  resolutionScale: 1,
  shadows: true,
  bloom: true,
  reflections: true,
  motionBlur: false,
  showFps: false,
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  engineVolume: 0.6,
  camera: 'chase' as CameraMode,
  units: 'kmh' as Units,
  autoReset: true,
  defaultDifficulty: 'normal' as Difficulty,
  steerSensitivity: 1,
  touchLayout: 'left-right' as const,
  reducedMotion: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as any),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'nexora-settings' }
  )
);

export interface RaceSetupState {
  mode: RaceMode;
  carId: string;
  trackId: string;
  laps: number;
  difficulty: Difficulty;
  weather: Weather;
  timeOfDay: TimeOfDay;
  opponents: number;
  set: <K extends keyof RaceSetupState>(key: K, value: RaceSetupState[K]) => void;
  setTrack: (trackId: string, track?: TrackDef) => void;
}

export const useRaceSetup = create<RaceSetupState>((set) => ({
  mode: 'quick',
  carId: 'street-hawk',
  trackId: 'city-rush',
  laps: 3,
  difficulty: 'normal',
  weather: 'clear',
  timeOfDay: 'night',
  opponents: 6,
  set: (key, value) => set({ [key]: value } as any),
  setTrack: (trackId) => {
    const def = getTrack(trackId);
    set({
      trackId,
      laps: def?.defaultLaps ?? 3,
      weather: def?.defaultWeather ?? 'clear',
      timeOfDay: def?.defaultTimeOfDay ?? 'day',
    });
  },
}));
