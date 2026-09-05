import type { ThemeId, TrackDef } from 'shared';
import { TRACKS } from 'shared';
import { generateControlPoints, TrackGeometry, type TrackControlDef } from '@/game/engine/track';

/** Full visual theme per environment. */
export interface ThemeConfig {
  id: ThemeId;
  sky: { top: string; bottom: string; horizon: string };
  fog: { color: string; near: number; far: number };
  ground: { color: string; grid: boolean };
  road: { color: string; edge: string; centerLine: string };
  lights: {
    ambient: string;
    ambientIntensity: number;
    sun: string;
    sunIntensity: number;
    sunPos: [number, number, number];
  };
  props: {
    buildings?: { color: string; emissive: string; count: number; maxH: number; minH: number };
    palms?: { count: number; trunk: string; leaf: string };
    rocks?: { count: number; color: string };
    pines?: { count: number; color: string; trunk: string };
    holograms?: { count: number; color: string };
    iceShards?: { count: number; color: string };
  };
  particles: 'none' | 'rain' | 'snow' | 'sand' | 'fireflies';
  neon: string;
  name: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  city: {
    id: 'city',
    name: 'Neon Downtown',
    sky: { top: '#05070d', bottom: '#0d1226', horizon: '#2a1a4a' },
    fog: { color: '#0a0e1e', near: 60, far: 520 },
    ground: { color: '#0b0f1a', grid: true },
    road: { color: '#141824', edge: '#22d3ee', centerLine: '#fbbf24' },
    lights: { ambient: '#2a3a6a', ambientIntensity: 0.9, sun: '#4a5aff', sunIntensity: 0.5, sunPos: [-80, 120, -60] },
    props: { buildings: { color: '#0e1526', emissive: '#22d3ee', count: 220, maxH: 90, minH: 18 } },
    particles: 'rain',
    neon: '#22d3ee',
  },
  desert: {
    id: 'desert',
    name: 'Dune Canyon',
    sky: { top: '#3d1c4f', bottom: '#ff9a5a', horizon: '#ffb37a' },
    fog: { color: '#c97b4a', near: 80, far: 700 },
    ground: { color: '#c2874e', grid: false },
    road: { color: '#3a3630', edge: '#fbbf24', centerLine: '#ffffff' },
    lights: { ambient: '#8a5a3a', ambientIntensity: 0.8, sun: '#ff8c42', sunIntensity: 1.35, sunPos: [60, 35, -90] },
    props: { rocks: { count: 160, color: '#8a5a3a' } },
    particles: 'sand',
    neon: '#fbbf24',
  },
  mountain: {
    id: 'mountain',
    name: 'Pine Summit',
    sky: { top: '#1c3a5f', bottom: '#a8c8e8', horizon: '#d8e8f8' },
    fog: { color: '#9fb8d0', near: 90, far: 800 },
    ground: { color: '#4a6b3a', grid: false },
    road: { color: '#2e2e34', edge: '#e2e8f0', centerLine: '#e2e8f0' },
    lights: { ambient: '#7a90a8', ambientIntensity: 0.9, sun: '#fff3d6', sunIntensity: 1.5, sunPos: [100, 140, 40] },
    props: { pines: { count: 260, color: '#1e4d2b', trunk: '#3a2a1a' }, rocks: { count: 60, color: '#6b7280' } },
    particles: 'none',
    neon: '#a8c8e8',
  },
  arctic: {
    id: 'arctic',
    name: 'Frozen Lake',
    sky: { top: '#7db8e8', bottom: '#e8f4ff', horizon: '#f0f8ff' },
    fog: { color: '#cfe8ff', near: 70, far: 640 },
    ground: { color: '#d8e8f4', grid: false },
    road: { color: '#5a6a7a', edge: '#ffffff', centerLine: '#22d3ee' },
    lights: { ambient: '#9ab8d8', ambientIntensity: 1.0, sun: '#eaf6ff', sunIntensity: 1.6, sunPos: [40, 110, 80] },
    props: { iceShards: { count: 90, color: '#bfe4ff' }, pines: { count: 140, color: '#2a4d5e', trunk: '#3a2a1a' } },
    particles: 'snow',
    neon: '#22d3ee',
  },
  tropical: {
    id: 'tropical',
    name: 'Sunset Coast',
    sky: { top: '#2a1a5e', bottom: '#ff7e5f', horizon: '#feb47b' },
    fog: { color: '#f0a87a', near: 100, far: 850 },
    ground: { color: '#e8c88a', grid: false },
    road: { color: '#32363e', edge: '#ffffff', centerLine: '#fbbf24' },
    lights: { ambient: '#c08a6a', ambientIntensity: 0.9, sun: '#ff9e5e', sunIntensity: 1.4, sunPos: [-110, 30, 60] },
    props: { palms: { count: 180, trunk: '#6b4a2a', leaf: '#2a8a4a' } },
    particles: 'none',
    neon: '#feb47b',
  },
  cyber: {
    id: 'cyber',
    name: 'Holo Grid',
    sky: { top: '#03040a', bottom: '#0a0618', horizon: '#3a1060' },
    fog: { color: '#0d0620', near: 70, far: 600 },
    ground: { color: '#07060f', grid: true },
    road: { color: '#0e0a1c', edge: '#a78bfa', centerLine: '#22d3ee' },
    lights: { ambient: '#4a2a8a', ambientIntensity: 1.0, sun: '#8a3aff', sunIntensity: 0.7, sunPos: [-60, 140, -90] },
    props: {
      buildings: { color: '#0c0a1a', emissive: '#a78bfa', count: 240, maxH: 120, minH: 20 },
      holograms: { count: 60, color: '#22d3ee' },
    },
    particles: 'fireflies',
    neon: '#a78bfa',
  },
};

export interface ClientTrack extends Omit<TrackDef, 'theme'> {
  control: TrackControlDef;
  theme: ThemeConfig;
}

function controlFor(id: string, seed: number, over: Partial<TrackControlDef> = {}): TrackControlDef {
  return {
    seed,
    radius: 260,
    points: 28,
    wobble1: 0.18,
    wobble2: 0.1,
    wobble3: 0.05,
    elevation: 0,
    elevationFreq: 3,
    width: 14,
    squishX: 1,
    squishZ: 1,
    ...over,
  };
}

const CONTROL_DEFS: Record<string, TrackControlDef> = {
  'city-rush': controlFor('city-rush', 1337, { radius: 200, points: 26, wobble1: 0.14, wobble2: 0.16, squishX: 1.25, elevation: 6, elevationFreq: 4, width: 13 }),
  'desert-storm': controlFor('desert-storm', 4242, { radius: 280, points: 24, wobble1: 0.22, wobble2: 0.08, elevation: 10, elevationFreq: 3, width: 16 }),
  'mountain-pass': controlFor('mountain-pass', 909, { radius: 240, points: 30, wobble1: 0.28, wobble2: 0.14, wobble3: 0.08, elevation: 26, elevationFreq: 4, width: 11 }),
  'arctic-run': controlFor('arctic-run', 1212, { radius: 230, points: 22, wobble1: 0.16, wobble2: 0.12, elevation: 8, elevationFreq: 2, width: 15 }),
  'tropical-coast': controlFor('tropical-coast', 7777, { radius: 300, points: 24, wobble1: 0.15, wobble2: 0.06, elevation: 7, elevationFreq: 2, squishX: 1.3, width: 16 }),
  'cyber-circuit': controlFor('cyber-circuit', 555, { radius: 270, points: 32, wobble1: 0.2, wobble2: 0.12, wobble3: 0.06, elevation: 12, elevationFreq: 5, width: 14 }),
};

/** Builds (and memoizes) the playable geometry for a track id. */
const cache = new Map<string, TrackGeometry>();
export function getTrackGeometry(trackId: string): TrackGeometry {
  let geo = cache.get(trackId);
  if (!geo) {
    const def = CONTROL_DEFS[trackId] ?? CONTROL_DEFS['city-rush'];
    geo = new TrackGeometry(generateControlPoints(def), def.width);
    cache.set(trackId, geo);
  }
  return geo;
}

export function getClientTrack(trackId: string): ClientTrack | undefined {
  const def = TRACKS.find((t) => t.id === trackId);
  if (!def) return undefined;
  return { ...def, control: CONTROL_DEFS[trackId], theme: THEMES[def.theme] };
}

/** Minimap path (normalized 0..1) for the HUD canvas. */
export function minimapPath(trackId: string): { pts: [number, number][]; width: number } {
  const geo = getTrackGeometry(trackId);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < geo.sampleCount; i += 10) {
    minX = Math.min(minX, geo.px[i]); maxX = Math.max(maxX, geo.px[i]);
    minZ = Math.min(minZ, geo.pz[i]); maxZ = Math.max(maxZ, geo.pz[i]);
  }
  const spanX = maxX - minX || 1;
  const spanZ = maxZ - minZ || 1;
  const span = Math.max(spanX, spanZ);
  const pts: [number, number][] = [];
  for (let i = 0; i < geo.sampleCount; i += 10) {
    pts.push([(geo.px[i] - minX) / span, (geo.pz[i] - minZ) / span]);
  }
  return { pts, width: geo.width };
}
