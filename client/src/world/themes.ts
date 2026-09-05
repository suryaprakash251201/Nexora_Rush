import type { ThemeId } from 'shared';
import { TRACKS } from 'shared';
import { controlPoints, TrackGeometry, type TrackControl } from '@/sim/track';

/** Visual identity per environment. */
export interface Theme {
  id: ThemeId;
  skyTop: string;
  skyBottom: string;
  horizon: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  ground: string;
  grid: boolean;
  road: string;
  edge: string;
  ambient: string;
  ambientI: number;
  sun: string;
  sunI: number;
  sunPos: [number, number, number];
  neon: string;
  buildings: number;
  buildingGlow: string;
  trees: 'pines' | 'palms' | 'oaks' | 'mixed' | 'none';
  treeColor: string;
  trunkColor: string;
  treeCount: number;
  rocks: number;
  rockColor: string;
  shards: number;
  halos: number;
  weather: 'none' | 'rain' | 'snow' | 'sand' | 'sparks' | 'leaves' | 'petals';
  water: boolean;
  waterColor: string;
  flowers: number;
  cliffs: number;
  grassTint: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  city: {
    id: 'city', skyTop: '#04060e', skyBottom: '#0d1330', horizon: '#33205e',
    fogColor: '#0a0e20', fogNear: 70, fogFar: 560,
    ground: '#111a2c', grid: true, road: '#222b42', edge: '#22d3ee',
    ambient: '#33438a', ambientI: 1.1, sun: '#5a6cff', sunI: 0.6, sunPos: [-80, 120, -60],
    neon: '#22d3ee', buildings: 150, buildingGlow: '#22d3ee',
    trees: 'none', treeColor: '#1e4d2b', trunkColor: '#3a2a1a', treeCount: 0,
    rocks: 0, rockColor: '#8a6a4a', shards: 0, halos: 0, weather: 'rain',
    water: false, waterColor: '#1a3a5c', flowers: 0, cliffs: 0, grassTint: '#1a2a1a',
  },
  desert: {
    id: 'desert', skyTop: '#402058', skyBottom: '#ff9a5a', horizon: '#ffc27a',
    fogColor: '#cf8350', fogNear: 90, fogFar: 720,
    ground: '#bd8049', grid: false, road: '#3b3730', edge: '#fbbf24',
    ambient: '#9a6a45', ambientI: 1.0, sun: '#ff8c42', sunI: 1.6, sunPos: [60, 35, -90],
    neon: '#fbbf24', buildings: 0, buildingGlow: '#fbbf24',
    trees: 'none', treeColor: '#2a6a3a', trunkColor: '#6b4a2a', treeCount: 0,
    rocks: 110, rockColor: '#8a5a3a', shards: 0, halos: 0, weather: 'sand',
    water: false, waterColor: '#3a8abc', flowers: 0, cliffs: 24, grassTint: '#a08050',
  },
  mountain: {
    id: 'mountain', skyTop: '#1c3a5f', skyBottom: '#aecbe8', horizon: '#dcebf8',
    fogColor: '#a4bcd2', fogNear: 100, fogFar: 820,
    ground: '#476b39', grid: false, road: '#303038', edge: '#e8eef4',
    ambient: '#8498ad', ambientI: 1.1, sun: '#fff3d6', sunI: 1.7, sunPos: [100, 140, 40],
    neon: '#bcd6ee', buildings: 0, buildingGlow: '#ffffff',
    trees: 'pines', treeColor: '#1e4d2b', trunkColor: '#3a2a1a', treeCount: 200,
    rocks: 40, rockColor: '#6b7280', shards: 0, halos: 0, weather: 'none',
    water: true, waterColor: '#4a90c2', flowers: 60, cliffs: 18, grassTint: '#3a6b2f',
  },
  arctic: {
    id: 'arctic', skyTop: '#7db8e8', skyBottom: '#e8f4ff', horizon: '#f2faff',
    fogColor: '#cfe8ff', fogNear: 80, fogFar: 660,
    ground: '#d5e6f3', grid: false, road: '#5d6d7d', edge: '#ffffff',
    ambient: '#a4bedd', ambientI: 1.2, sun: '#eaf6ff', sunI: 1.8, sunPos: [40, 110, 80],
    neon: '#22d3ee', buildings: 0, buildingGlow: '#bfe4ff',
    trees: 'pines', treeColor: '#2a5d6e', trunkColor: '#3a2a1a', treeCount: 110,
    rocks: 0, rockColor: '#9ab0c0', shards: 70, halos: 0, weather: 'snow',
    water: true, waterColor: '#9fd0ee', flowers: 0, cliffs: 0, grassTint: '#cfe0ea',
  },
  tropical: {
    id: 'tropical', skyTop: '#2c1c60', skyBottom: '#ff7e5f', horizon: '#ffb37b',
    fogColor: '#f2a97c', fogNear: 110, fogFar: 860,
    ground: '#e3c384', grid: false, road: '#34383f', edge: '#ffffff',
    ambient: '#c08a6a', ambientI: 1.0, sun: '#ff9e5e', sunI: 1.6, sunPos: [-110, 30, 60],
    neon: '#ffb37b', buildings: 0, buildingGlow: '#ffb37b',
    trees: 'palms', treeColor: '#2a8a4a', trunkColor: '#6b4a2a', treeCount: 150,
    rocks: 0, rockColor: '#b09a7a', shards: 0, halos: 0, weather: 'none',
    water: true, waterColor: '#2a9dc2', flowers: 80, cliffs: 0, grassTint: '#7aba5a',
  },
  cyber: {
    id: 'cyber', skyTop: '#02030a', skyBottom: '#0c0620', horizon: '#3c1266',
    fogColor: '#0e0622', fogNear: 80, fogFar: 620,
    ground: '#07060f', grid: true, road: '#100b20', edge: '#a78bfa',
    ambient: '#52309a', ambientI: 1.2, sun: '#8a3aff', sunI: 0.8, sunPos: [-60, 140, -90],
    neon: '#a78bfa', buildings: 170, buildingGlow: '#a78bfa',
    trees: 'none', treeColor: '#1e4d2b', trunkColor: '#3a2a1a', treeCount: 0,
    rocks: 0, rockColor: '#555566', shards: 0, halos: 44, weather: 'sparks',
    water: false, waterColor: '#1a2a4c', flowers: 0, cliffs: 0, grassTint: '#101020',
  },
  forest: {
    id: 'forest', skyTop: '#1a3a2a', skyBottom: '#cfe8b8', horizon: '#e8f4d0',
    fogColor: '#b8d0a0', fogNear: 60, fogFar: 520,
    ground: '#3d6b2f', grid: false, road: '#2e2e30', edge: '#f0f4e8',
    ambient: '#6a8a5a', ambientI: 1.15, sun: '#fff8d6', sunI: 1.5, sunPos: [80, 120, 60],
    neon: '#a3e635', buildings: 0, buildingGlow: '#a3e635',
    trees: 'mixed', treeColor: '#1e5d1e', trunkColor: '#4a3520', treeCount: 280,
    rocks: 30, rockColor: '#6b7a6b', shards: 0, halos: 0, weather: 'leaves',
    water: true, waterColor: '#3a8a6a', flowers: 120, cliffs: 0, grassTint: '#2d5a1e',
  },
  lake: {
    id: 'lake', skyTop: '#2a5a8a', skyBottom: '#cfe8f4', horizon: '#eef8ff',
    fogColor: '#b8d4e4', fogNear: 90, fogFar: 700,
    ground: '#5a8a4a', grid: false, road: '#33363c', edge: '#ffffff',
    ambient: '#8aaabd', ambientI: 1.1, sun: '#fffbe8', sunI: 1.6, sunPos: [90, 130, 50],
    neon: '#38bdf8', buildings: 0, buildingGlow: '#38bdf8',
    trees: 'oaks', treeColor: '#2d6b2d', trunkColor: '#4a3520', treeCount: 170,
    rocks: 25, rockColor: '#7a8a90', shards: 0, halos: 0, weather: 'none',
    water: true, waterColor: '#2a7abc', flowers: 100, cliffs: 8, grassTint: '#4a8a3a',
  },
  meadow: {
    id: 'meadow', skyTop: '#3a7aca', skyBottom: '#e8f4ff', horizon: '#fff8e0',
    fogColor: '#c4dcf0', fogNear: 110, fogFar: 850,
    ground: '#6aaa4a', grid: false, road: '#3a3d42', edge: '#fefce8',
    ambient: '#8ab0cc', ambientI: 1.1, sun: '#fff4c8', sunI: 1.7, sunPos: [70, 150, 30],
    neon: '#fde047', buildings: 0, buildingGlow: '#fde047',
    trees: 'oaks', treeColor: '#3a7a2d', trunkColor: '#5a4028', treeCount: 120,
    rocks: 15, rockColor: '#8a8a7a', shards: 0, halos: 0, weather: 'petals',
    water: true, waterColor: '#5ab0d2', flowers: 220, cliffs: 0, grassTint: '#5aaa3a',
  },
  canyon: {
    id: 'canyon', skyTop: '#4a2a5a', skyBottom: '#ff9a5a', horizon: '#ffb37a',
    fogColor: '#d08a5a', fogNear: 80, fogFar: 680,
    ground: '#a05a3a', grid: false, road: '#3d3833', edge: '#fdba74',
    ambient: '#a06a4a', ambientI: 1.0, sun: '#ff8c42', sunI: 1.6, sunPos: [-70, 40, -80],
    neon: '#fb923c', buildings: 0, buildingGlow: '#fb923c',
    trees: 'mixed', treeColor: '#4a6b2a', trunkColor: '#5a3a22', treeCount: 60,
    rocks: 90, rockColor: '#8a4a2a', shards: 0, halos: 0, weather: 'sand',
    water: true, waterColor: '#2a9aaa', flowers: 30, cliffs: 60, grassTint: '#8a6a3a',
  },
};

function ctl(id: string, seed: number, over: Partial<TrackControl>): TrackControl {
  return {
    seed, radius: 260, points: 28, w1: 0.18, w2: 0.1, w3: 0.05,
    elev: 0, elevFreq: 3, width: 14, squashX: 1, squashZ: 1, ...over,
  };
}

const CONTROLS: Record<string, TrackControl> = {
  'city-rush': ctl('city-rush', 1337, { radius: 200, points: 26, w1: 0.14, w2: 0.16, squashX: 1.25, elev: 6, elevFreq: 4, width: 13 }),
  'desert-storm': ctl('desert-storm', 4242, { radius: 280, points: 24, w1: 0.22, w2: 0.08, elev: 10, elevFreq: 3, width: 16 }),
  'mountain-pass': ctl('mountain-pass', 909, { radius: 240, points: 30, w1: 0.28, w2: 0.14, w3: 0.08, elev: 26, elevFreq: 4, width: 11 }),
  'arctic-run': ctl('arctic-run', 1212, { radius: 230, points: 22, w1: 0.16, w2: 0.12, elev: 8, elevFreq: 2, width: 15 }),
  'tropical-coast': ctl('tropical-coast', 7777, { radius: 300, points: 24, w1: 0.15, w2: 0.06, elev: 7, elevFreq: 2, squashX: 1.3, width: 16 }),
  'cyber-circuit': ctl('cyber-circuit', 555, { radius: 270, points: 32, w1: 0.2, w2: 0.12, w3: 0.06, elev: 12, elevFreq: 5, width: 14 }),
  'emerald-forest': ctl('emerald-forest', 2024, { radius: 250, points: 30, w1: 0.24, w2: 0.12, w3: 0.06, elev: 14, elevFreq: 3, width: 13 }),
  'crystal-lake': ctl('crystal-lake', 3131, { radius: 290, points: 26, w1: 0.16, w2: 0.08, elev: 9, elevFreq: 2, squashX: 1.2, width: 15 }),
  'meadow-vale': ctl('meadow-vale', 4141, { radius: 310, points: 24, w1: 0.13, w2: 0.07, elev: 6, elevFreq: 2, squashX: 1.25, width: 16 }),
  'canyon-river': ctl('canyon-river', 5151, { radius: 260, points: 28, w1: 0.26, w2: 0.1, w3: 0.07, elev: 18, elevFreq: 4, width: 12 }),
};

const geoCache = new Map<string, TrackGeometry>();
export function trackGeo(trackId: string): TrackGeometry {
  let g = geoCache.get(trackId);
  if (!g) {
    const def = CONTROLS[trackId] ?? CONTROLS['city-rush'];
    g = new TrackGeometry(controlPoints(def), def.width);
    geoCache.set(trackId, g);
  }
  return g;
}

export function themeFor(trackId: string): Theme {
  const def = TRACKS.find((t) => t.id === trackId);
  return THEMES[def?.theme ?? 'city'];
}

/** Normalized minimap polyline for HUD/cards. */
export function mapPath(trackId: string): [number, number][] {
  const { pts } = mapPathBounds(trackId);
  return pts;
}

export function mapPathBounds(trackId: string): { pts: [number, number][]; minX: number; minZ: number; span: number } {
  const g = trackGeo(trackId);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < g.samples; i += 10) {
    if (g.px[i] < minX) minX = g.px[i];
    if (g.px[i] > maxX) maxX = g.px[i];
    if (g.pz[i] < minZ) minZ = g.pz[i];
    if (g.pz[i] > maxZ) maxZ = g.pz[i];
  }
  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const pts: [number, number][] = [];
  for (let i = 0; i < g.samples; i += 10) {
    pts.push([(g.px[i] - minX) / span, (g.pz[i] - minZ) / span]);
  }
  return { pts, minX, minZ, span };
}
