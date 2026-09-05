import type {
  AchievementDef,
  CarDef,
  Difficulty,
  RaceMode,
  TrackDef,
} from './types';

// ---------------------------------------------------------------------------
// CARS — stats drive real physics (see client/src/game/engine/physics.ts)
// ---------------------------------------------------------------------------

export const CARS: CarDef[] = [
  {
    id: 'street-hawk',
    name: 'Street Hawk',
    class: 'starter',
    description: 'Agile city sprinter. Light, nervous, and quick off the line.',
    stats: { speed: 62, acceleration: 70, handling: 82, braking: 72, nitro: 65 },
    unlockLevel: 1,
    colors: ['#22d3ee', '#f97316', '#a3e635'],
    bodyStyle: 'coupe',
  },
  {
    id: 'thunder-gt',
    name: 'Thunder GT',
    class: 'starter',
    description: 'Balanced grand tourer with a thunderous straight-line pull.',
    stats: { speed: 70, acceleration: 68, handling: 70, braking: 75, nitro: 70 },
    unlockLevel: 1,
    colors: ['#e11d48', '#facc15', '#60a5fa'],
    bodyStyle: 'gt',
  },
  {
    id: 'blaze-x',
    name: 'Blaze X',
    class: 'starter',
    description: 'Muscle-car attitude. Raw torque, playful slides.',
    stats: { speed: 74, acceleration: 76, handling: 60, braking: 66, nitro: 72 },
    unlockLevel: 1,
    colors: ['#f97316', '#111827', '#dc2626'],
    bodyStyle: 'muscle',
  },
  {
    id: 'shadow-rs',
    name: 'Shadow RS',
    class: 'advanced',
    description: 'Rally-bred grip monster. Destroys hairpins in the wet.',
    stats: { speed: 78, acceleration: 80, handling: 88, braking: 82, nitro: 74 },
    unlockLevel: 4,
    colors: ['#0f172a', '#14b8a6', '#94a3b8'],
    bodyStyle: 'coupe',
  },
  {
    id: 'velocity-r',
    name: 'Velocity R',
    class: 'advanced',
    description: 'Slippery aero-focused racer built for endless top speed.',
    stats: { speed: 86, acceleration: 78, handling: 76, braking: 80, nitro: 80 },
    unlockLevel: 6,
    colors: ['#8b5cf6', '#f8fafc', '#f43f5e'],
    bodyStyle: 'super',
  },
  {
    id: 'phantom-gt',
    name: 'Phantom GT',
    class: 'advanced',
    description: 'Ghost-quiet hypersalon. Brutal acceleration, composed chassis.',
    stats: { speed: 88, acceleration: 84, handling: 78, braking: 84, nitro: 82 },
    unlockLevel: 8,
    colors: ['#64748b', '#22c55e', '#e2e8f0'],
    bodyStyle: 'gt',
  },
  {
    id: 'apex-one',
    name: 'Apex One',
    class: 'elite',
    description: 'The reference point. Near-perfect balance. Extreme grip, extreme speed.',
    stats: { speed: 92, acceleration: 90, handling: 92, braking: 88, nitro: 86 },
    unlockLevel: 12,
    colors: ['#dc2626', '#fbbf24', '#0ea5e9'],
    bodyStyle: 'super',
  },
  {
    id: 'inferno-x',
    name: 'Inferno X',
    class: 'elite',
    description: 'Fire-breathing hypercar. Highest top speed in the game.',
    stats: { speed: 97, acceleration: 92, handling: 80, braking: 85, nitro: 92 },
    unlockLevel: 16,
    colors: ['#f97316', '#7f1d1d', '#fde047'],
    bodyStyle: 'hyper',
  },
  {
    id: 'titan-z',
    name: 'Titan Z',
    class: 'elite',
    description: 'Prototype flagship. Enormous nitro reserves, planted at speed.',
    stats: { speed: 95, acceleration: 94, handling: 88, braking: 90, nitro: 96 },
    unlockLevel: 20,
    colors: ['#a78bfa', '#111827', '#34d399'],
    bodyStyle: 'proto',
  },
];

export const getCar = (id: string): CarDef | undefined =>
  CARS.find((c) => c.id === id);

// ---------------------------------------------------------------------------
// TRACKS — meta data only; geometry lives on the client.
// ---------------------------------------------------------------------------

export const TRACKS: TrackDef[] = [
  {
    id: 'city-rush',
    name: 'City Rush',
    theme: 'city',
    description:
      'Midnight downtown sprints. Neon canyons, tight tunnels and sharp 90° corners.',
    difficulty: 2,
    unlockLevel: 1,
    defaultLaps: 3,
    lengthKm: 3.4,
    minLapSeconds: 55,
    minRaceSeconds: 170,
    parRaceSeconds: 230,
    weathers: ['clear', 'rain', 'fog'],
    defaultWeather: 'clear',
    timesOfDay: ['night'],
    defaultTimeOfDay: 'night',
    maxSpeedKmh: 300,
  },
  {
    id: 'desert-storm',
    name: 'Desert Storm',
    theme: 'desert',
    description:
      'Blistering sunset run across dunes and canyon sweeps. Watch the sand traps.',
    difficulty: 2,
    unlockLevel: 2,
    defaultLaps: 3,
    lengthKm: 4.1,
    minLapSeconds: 65,
    minRaceSeconds: 200,
    parRaceSeconds: 260,
    weathers: ['clear', 'sandstorm', 'fog'],
    defaultWeather: 'clear',
    timesOfDay: ['sunset'],
    defaultTimeOfDay: 'sunset',
    maxSpeedKmh: 310,
  },
  {
    id: 'mountain-pass',
    name: 'Mountain Pass',
    theme: 'mountain',
    description:
      'Cliff-edge switchbacks, forest straights and a dramatic suspension bridge.',
    difficulty: 4,
    unlockLevel: 5,
    defaultLaps: 3,
    lengthKm: 4.6,
    minLapSeconds: 75,
    minRaceSeconds: 230,
    parRaceSeconds: 300,
    weathers: ['clear', 'fog', 'rain'],
    defaultWeather: 'clear',
    timesOfDay: ['day', 'sunset'],
    defaultTimeOfDay: 'day',
    maxSpeedKmh: 300,
  },
  {
    id: 'arctic-run',
    name: 'Arctic Run',
    theme: 'arctic',
    description:
      'Frozen lake and snow-packed roads. Near-zero grip — feather the throttle.',
    difficulty: 4,
    unlockLevel: 9,
    defaultLaps: 3,
    lengthKm: 3.9,
    minLapSeconds: 70,
    minRaceSeconds: 215,
    parRaceSeconds: 290,
    weathers: ['snow', 'clear', 'fog'],
    defaultWeather: 'snow',
    timesOfDay: ['day'],
    defaultTimeOfDay: 'day',
    maxSpeedKmh: 290,
  },
  {
    id: 'tropical-coast',
    name: 'Tropical Coast',
    theme: 'tropical',
    description:
      'Sunset coastal highway. Long sweepers beside the ocean and palm-lined straights.',
    difficulty: 1,
    unlockLevel: 3,
    defaultLaps: 3,
    lengthKm: 4.8,
    minLapSeconds: 78,
    minRaceSeconds: 235,
    parRaceSeconds: 300,
    weathers: ['clear'],
    defaultWeather: 'clear',
    timesOfDay: ['sunset', 'day'],
    defaultTimeOfDay: 'sunset',
    maxSpeedKmh: 315,
  },
  {
    id: 'cyber-circuit',
    name: 'Cyber Circuit',
    theme: 'cyber',
    description:
      'Holographic night circuit through a neon megacity. The ultimate test of pace.',
    difficulty: 5,
    unlockLevel: 14,
    defaultLaps: 4,
    lengthKm: 5.2,
    minLapSeconds: 85,
    minRaceSeconds: 255,
    parRaceSeconds: 330,
    weathers: ['clear', 'rain', 'fog'],
    defaultWeather: 'clear',
    timesOfDay: ['night'],
    defaultTimeOfDay: 'night',
    maxSpeedKmh: 325,
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    theme: 'forest',
    description:
      'Sun-dappled woodland trail. Towering oaks, fern banks and a misty lake Shore section.',
    difficulty: 3,
    unlockLevel: 4,
    defaultLaps: 3,
    lengthKm: 4.2,
    minLapSeconds: 68,
    minRaceSeconds: 208,
    parRaceSeconds: 275,
    weathers: ['clear', 'fog', 'rain'],
    defaultWeather: 'clear',
    timesOfDay: ['day', 'sunset'],
    defaultTimeOfDay: 'day',
    maxSpeedKmh: 300,
  },
  {
    id: 'crystal-lake',
    name: 'Crystal Lake',
    theme: 'lake',
    description:
      'Glass-calm mountain lake loop. Lakeside sweepers, wooden bridges and waterfalls.',
    difficulty: 2,
    unlockLevel: 7,
    defaultLaps: 3,
    lengthKm: 4.4,
    minLapSeconds: 70,
    minRaceSeconds: 215,
    parRaceSeconds: 280,
    weathers: ['clear', 'fog'],
    defaultWeather: 'clear',
    timesOfDay: ['day', 'sunset'],
    defaultTimeOfDay: 'day',
    maxSpeedKmh: 305,
  },
  {
    id: 'meadow-vale',
    name: 'Meadow Vale',
    theme: 'meadow',
    description:
      'Rolling wildflower meadows under big skies. Fast, flowing, forgiving — pure rhythm.',
    difficulty: 2,
    unlockLevel: 10,
    defaultLaps: 3,
    lengthKm: 4.7,
    minLapSeconds: 74,
    minRaceSeconds: 225,
    parRaceSeconds: 290,
    weathers: ['clear', 'rain', 'fog'],
    defaultWeather: 'clear',
    timesOfDay: ['day', 'sunset'],
    defaultTimeOfDay: 'day',
    maxSpeedKmh: 310,
  },
  {
    id: 'canyon-river',
    name: 'Canyon River',
    theme: 'canyon',
    description:
      'Red-rock canyon carved by a turquoise river. Narrow bluffs, dusty air, big drops.',
    difficulty: 3,
    unlockLevel: 12,
    defaultLaps: 3,
    lengthKm: 4.5,
    minLapSeconds: 72,
    minRaceSeconds: 220,
    parRaceSeconds: 285,
    weathers: ['clear', 'sandstorm'],
    defaultWeather: 'clear',
    timesOfDay: ['sunset', 'day'],
    defaultTimeOfDay: 'sunset',
    maxSpeedKmh: 305,
  },
];

export const getTrack = (id: string): TrackDef | undefined =>
  TRACKS.find((t) => t.id === id);

// ---------------------------------------------------------------------------
// DIFFICULTY
// ---------------------------------------------------------------------------

export const DIFFICULTIES: Record<
  Difficulty,
  {
    label: string;
    aiSkill: number; // 0..1 driving skill
    aiSpeedMult: number;
    rubberband: number; // catch-up strength
    scoreMult: number;
    mistakeRate: number; // chance per second of an AI wobble
    aiCount: number;
  }
> = {
  easy: { label: 'Easy', aiSkill: 0.45, aiSpeedMult: 0.82, rubberband: 0.25, scoreMult: 1.0, mistakeRate: 0.05, aiCount: 5 },
  normal: { label: 'Normal', aiSkill: 0.62, aiSpeedMult: 0.9, rubberband: 0.18, scoreMult: 1.15, mistakeRate: 0.03, aiCount: 6 },
  hard: { label: 'Hard', aiSkill: 0.78, aiSpeedMult: 0.96, rubberband: 0.12, scoreMult: 1.3, mistakeRate: 0.015, aiCount: 7 },
  expert: { label: 'Expert', aiSkill: 0.9, aiSpeedMult: 1.0, rubberband: 0.06, scoreMult: 1.5, mistakeRate: 0.008, aiCount: 7 },
  insane: { label: 'Insane', aiSkill: 1.0, aiSpeedMult: 1.04, rubberband: 0.02, scoreMult: 1.75, mistakeRate: 0.003, aiCount: 7 },
};

export const RACE_MODES: { id: RaceMode; label: string; description: string; icon: string }[] = [
  { id: 'quick', label: 'Quick Race', description: 'A single race against a full grid of AI rivals.', icon: 'flag' },
  { id: 'championship', label: 'Championship', description: 'Three rounds. Points accumulate — win the crown.', icon: 'trophy' },
  { id: 'time-trial', label: 'Time Trial', description: 'Empty track. Chase the perfect lap.', icon: 'clock' },
  { id: 'endless', label: 'Endless', description: 'Survive as long as you can. Score decays over time.', icon: 'infinity' },
  { id: 'daily', label: 'Daily Challenge', description: 'One special race per day. Bonus XP, one attempt at the top.', icon: 'calendar' },
];

// ---------------------------------------------------------------------------
// SCORING (shared by client display + server authoritative validation)
// ---------------------------------------------------------------------------

export interface ScoringConfig {
  positionPoints: number[]; // index = finish position - 1
  fastLap: number;
  overtake: number;
  driftPerPoint: number; // score per drift point (drift points are ints)
  driftPointCap: number;
  nearMiss: number;
  nitroChain: number;
  cleanRace: number; // zero collisions bonus
  timeBonusPerSecondUnderPar: number;
  checkpoint: number;
  endlessPerSecond: number;
}

export const SCORING: ScoringConfig = {
  positionPoints: [5000, 4200, 3600, 3100, 2600, 2200, 1800, 1400, 1000],
  fastLap: 2500,
  overtake: 150,
  driftPerPoint: 2,
  driftPointCap: 8000,
  nearMiss: 300,
  nitroChain: 400,
  cleanRace: 2000,
  timeBonusPerSecondUnderPar: 25,
  checkpoint: 100,
  endlessPerSecond: 60,
};

export const XP = {
  /** XP earned directly from score. */
  perScore: 0.05,
  winBonus: 500,
  podiumBonus: 250,
  fastLapBonus: 200,
  dailyBonus: 300,
  championshipRoundBonus: 150,
  /** XP required to go from level n to n+1 grows gently; cap 50. */
  forLevel: (level: number): number => Math.round(600 * Math.pow(level, 1.35)),
  maxLevel: 50,
};

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < XP.maxLevel && xp >= XP.forLevel(level)) {
    xp -= XP.forLevel(level);
    level++;
  }
  return level;
}

export function xpProgress(xp: number): { level: number; current: number; needed: number } {
  const level = levelFromXp(xp);
  let consumed = 0;
  for (let l = 1; l < level; l++) consumed += XP.forLevel(l);
  return { level, current: xp - consumed, needed: XP.forLevel(level) };
}

// ---------------------------------------------------------------------------
// ACHIEVEMENTS
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-victory', name: 'First Victory', description: 'Win your first race.', icon: '🏁', xp: 300, check: (s) => s.wins >= 1 },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Reach 280 km/h.', icon: '⚡', xp: 400, check: (s) => s.topSpeedKmh >= 280 },
  { id: 'drift-king', name: 'Drift King', description: 'Accumulate 25,000 drift points.', icon: '🌀', xp: 500, check: (s) => s.totalDriftPoints >= 25000 },
  { id: 'nitro-addict', name: 'Nitro Addict', description: 'Use nitro 150 times.', icon: '🔥', xp: 400, check: (s) => s.nitroUses >= 150 },
  { id: 'perfect-lap', name: 'Perfect Lap', description: 'Complete 10 clean races (no collisions).', icon: '💎', xp: 600, check: (s) => s.perfectRaces >= 10 },
  { id: 'century', name: '100 Races', description: 'Complete 100 races.', icon: '💯', xp: 800, check: (s) => s.races >= 100 },
  { id: 'millionaire', name: 'Millionaire', description: 'Reach 1,000,000 total score.', icon: '💰', xp: 1000, check: (s) => s.totalScore >= 1_000_000 },
  { id: 'track-master', name: 'Track Master', description: 'Race on every track in the game.', icon: '🗺️', xp: 700, check: (s) => s.distinctTracks >= TRACKS.length },
  { id: 'champion', name: 'Champion', description: 'Win a championship.', icon: '👑', xp: 1200, check: (s) => s.championshipsWon >= 1 },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Win 5 races in a row.', icon: '🚀', xp: 900, check: (s) => s.winStreak >= 5 },
];

export const getAchievement = (id: string): AchievementDef | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);

export const GUEST_CAR_ID = 'street-hawk';
export const GUEST_TRACK_ID = 'city-rush';

// ---------------------------------------------------------------------------
// STAT → PHYSICS MAPPING (must match client physics exactly; server uses the
// top-speed formula for anti-cheat ceilings).
// ---------------------------------------------------------------------------

export function carTopSpeedKmh(car: CarDef): number {
  return 180 + car.stats.speed * 1.4;
}
export function carAccelSeconds(car: CarDef): number {
  // 0→100 km/h sprint time in seconds (lower stat = slower launch)
  return 8.5 - (car.stats.acceleration / 100) * 4.5;
}
export function carGripFactor(car: CarDef): number {
  return 0.55 + (car.stats.handling / 100) * 0.45;
}
export function carBrakeForce(car: CarDef): number {
  return 0.6 + (car.stats.braking / 100) * 0.55;
}
export function carNitroCapacity(car: CarDef): number {
  return 3 + (car.stats.nitro / 100) * 4; // seconds of nitro at full tank
}
