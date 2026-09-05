import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty, RaceMode, TimeOfDay, Weather } from 'shared';
import { getTrack } from 'shared';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type CamMode = 'chase' | 'hood';
export type Units = 'kmh' | 'mph';

interface SettingsStore {
  quality: Quality;
  resolution: number; // 0.5..1 render scale
  shadows: boolean;
  showFps: boolean;
  master: number;
  music: number;
  sfx: number;
  engine: number;
  camera: CamMode;
  units: Units;
  autoReset: boolean;
  sensitivity: number; // 0.5..2
  reducedMotion: boolean;
  set: <K extends keyof SettingsStore>(key: K, value: SettingsStore[K]) => void;
  presetPerformance: () => void;
  presetQuality: () => void;
  resetAll: () => void;
}

const DEFAULTS = {
  quality: 'medium' as Quality,
  resolution: 1,
  shadows: false,
  showFps: false,
  master: 0.8,
  music: 0.5,
  sfx: 0.8,
  engine: 0.6,
  camera: 'chase' as CamMode,
  units: 'kmh' as Units,
  autoReset: true,
  sensitivity: 1,
  reducedMotion: false,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as any),
      presetPerformance: () =>
        set({ quality: 'low', resolution: 0.7, shadows: false } as any),
      presetQuality: () =>
        set({ quality: 'high', resolution: 1, shadows: true } as any),
      resetAll: () => set({ ...DEFAULTS } as any),
    }),
    { name: 'nr-settings-v2' }
  )
);

interface SetupStore {
  mode: RaceMode;
  carId: string;
  trackId: string;
  laps: number;
  difficulty: Difficulty;
  weather: Weather;
  timeOfDay: TimeOfDay;
  set: <K extends keyof SetupStore>(key: K, value: SetupStore[K]) => void;
  pickTrack: (trackId: string) => void;
}

export const useSetup = create<SetupStore>((set) => ({
  mode: 'quick',
  carId: 'street-hawk',
  trackId: 'city-rush',
  laps: 3,
  difficulty: 'normal',
  weather: 'clear',
  timeOfDay: 'night',
  set: (key, value) => set({ [key]: value } as any),
  pickTrack: (trackId) => {
    const def = getTrack(trackId);
    set({
      trackId,
      laps: def?.defaultLaps ?? 3,
      weather: def?.defaultWeather ?? 'clear',
      timeOfDay: def?.defaultTimeOfDay ?? 'day',
    });
  },
}));
