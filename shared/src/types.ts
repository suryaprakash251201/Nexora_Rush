// ---------------------------------------------------------------------------
// Nexora Rush — shared types used by both the client and the server.
// ---------------------------------------------------------------------------

export type CarClass = 'starter' | 'advanced' | 'elite';
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'insane';
export type Weather = 'clear' | 'rain' | 'snow' | 'fog' | 'sandstorm';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type ThemeId =
  | 'city'
  | 'desert'
  | 'mountain'
  | 'arctic'
  | 'tropical'
  | 'cyber'
  | 'forest'
  | 'lake'
  | 'meadow'
  | 'canyon';

export type RaceMode =
  | 'quick'
  | 'championship'
  | 'time-trial'
  | 'endless'
  | 'daily';

export interface CarStats {
  speed: number;
  acceleration: number;
  handling: number;
  braking: number;
  nitro: number;
}

export interface CarDef {
  id: string;
  name: string;
  class: CarClass;
  description: string;
  stats: CarStats;
  unlockLevel: number;
  colors: string[];
  bodyStyle: 'coupe' | 'muscle' | 'super' | 'hyper' | 'gt' | 'proto';
}

export interface TrackDef {
  id: string;
  name: string;
  theme: ThemeId;
  description: string;
  difficulty: number; // 1..5
  unlockLevel: number;
  defaultLaps: number;
  lengthKm: number; // approximate lap length, used for validation
  minLapSeconds: number; // anti-cheat floor for a single lap
  minRaceSeconds: number; // anti-cheat floor for a full race
  parRaceSeconds: number; // reference time for a competitive run
  weathers: Weather[];
  defaultWeather: Weather;
  timesOfDay: TimeOfDay[];
  defaultTimeOfDay: TimeOfDay;
  maxSpeedKmh: number; // soft physical ceiling used for anti-cheat
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  /** Evaluates aggregated player stats; returns true when unlocked. */
  check: (s: PlayerAggregate) => boolean;
}

export interface PlayerAggregate {
  races: number;
  wins: number;
  totalScore: number;
  bestScore: number;
  bestLapMs: number | null;
  topSpeedKmh: number;
  totalDriftPoints: number;
  nitroUses: number;
  perfectRaces: number;
  distinctTracks: number;
  championshipsWon: number;
  winStreak: number;
}

// ---- API payloads ----------------------------------------------------------

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  avatarSeed: string;
  level: number;
  xp: number;
  createdAt: string;
}

export interface UserProfile extends PublicUser {
  stats: PlayerStats;
  unlockedCars: string[];
  unlockedTracks: string[];
  recentRaces: RaceHistoryEntry[];
  achievements: UnlockedAchievement[];
  favoriteCar: string | null;
  favoriteTrack: string | null;
  globalRank: number | null;
}

export interface PlayerStats {
  totalRaces: number;
  wins: number;
  podiums: number;
  totalScore: number;
  bestScore: number;
  bestLapMs: number | null;
  totalDistanceKm: number;
  totalDriftPoints: number;
  nitroUses: number;
  topSpeedKmh: number;
  winStreak: number;
  perfectRaces: number;
  championshipsWon: number;
}

export interface RaceHistoryEntry {
  id: string;
  trackId: string;
  trackName: string;
  carId: string;
  carName: string;
  mode: RaceMode;
  difficulty: Difficulty;
  score: number;
  position: number;
  grid: number;
  raceTimeMs: number | null;
  bestLapMs: number | null;
  createdAt: string;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

// ---- Race submission -------------------------------------------------------

export interface RaceEventSummary {
  overtakes: number;
  nearMisses: number;
  driftPoints: number;
  nitroChains: number;
  topSpeedKmh: number;
  collisions: number;
  bestLapMs: number | null;
  lapTimesMs: number[];
  checkpointTimestampsMs: number[];
}

export interface RaceStartPayload {
  trackId: string;
  carId: string;
  mode: RaceMode;
  difficulty: Difficulty;
  laps: number;
  weather: Weather;
  timeOfDay: TimeOfDay;
}

export interface RaceStartResponse {
  raceId: string;
  startedAt: string;
}

export interface RaceFinishPayload extends RaceStartPayload {
  raceId: string;
  position: number;
  grid: number;
  raceTimeMs: number | null;
  events: RaceEventSummary;
  distanceKm: number;
  clientScore: number; // server recomputes; client value only used as sanity hint
  finished: boolean;
}

export interface RaceFinishResponse {
  score: number;
  xpEarned: number;
  level: number;
  xp: number;
  leveledUp: boolean;
  isPersonalBest: boolean;
  unlockedAchievements: AchievementDef[];
  unlockedCars: CarDef[];
  unlockedTracks: TrackDef[];
  personalBestScore: number;
  globalRank: number | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarSeed: string;
  level: number;
  score: number;
  carId: string;
  carName: string;
  trackId: string;
  trackName: string;
  raceTimeMs: number | null;
  bestLapMs: number | null;
  createdAt: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  userRank: number | null;
}

export interface DailyChallengeStatus {
  available: boolean;
  completedToday: boolean;
  trackId: string;
  difficulty: Difficulty;
  laps: number;
  dateKey: string;
}
