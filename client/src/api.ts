/**
 * Typed API client. Cookies (httpOnly JWT + refresh session) go with every
 * request; mutating calls carry the CSRF header the server requires.
 */
import type {
  AchievementDef,
  CarDef,
  DailyChallengeStatus,
  LeaderboardResponse,
  PublicUser,
  RaceFinishResponse,
  RaceHistoryEntry,
  RaceMode,
  RaceStartResponse,
  TrackDef,
  UnlockedAchievement,
  UserProfile,
} from 'shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'include',
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Connection lost — check your network and try again.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.code ?? 'ERROR', data?.error ?? 'Something went wrong.', data?.fields);
  }
  return data as T;
}

export interface RaceConfig {
  trackId: string;
  carId: string;
  mode: RaceMode;
  difficulty: string;
  laps: number;
  weather: string;
  timeOfDay: string;
}

export const api = {
  register: (body: { username: string; email: string; password: string; confirmPassword: string; avatarSeed?: string }) =>
    request<{ user: PublicUser }>('/auth/register', { body }),
  login: (body: { identifier: string; password: string; remember: boolean }) =>
    request<{ user: PublicUser }>('/auth/login', { body }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { body: {} }),
  me: () => request<{ user: PublicUser }>('/auth/me'),

  cars: () => request<{ cars: (CarDef & { topSpeedKmh: number })[]; unlocked: string[] | null }>('/cars'),
  tracks: () => request<{ tracks: TrackDef[]; unlocked: string[] | null }>('/tracks'),

  profile: () => request<UserProfile>('/profile'),
  saveSettings: (settings: unknown) => request<{ ok: boolean }>('/profile/settings', { body: settings }),
  myAchievements: () => request<{ achievements: UnlockedAchievement[] }>('/profile/achievements'),

  startRace: (body: RaceConfig) => request<RaceStartResponse>('/races/start', { body }),
  finishRace: (body: unknown) => request<RaceFinishResponse>('/races/finish', { body }),
  raceHistory: (limit = 20) => request<{ races: RaceHistoryEntry[] }>(`/races/history?limit=${limit}`),
  dailyStatus: () => request<DailyChallengeStatus>('/races/daily'),
  startChampionship: () =>
    request<{ championshipId: string; trackIds: string[]; round: number }>('/races/championship/start', { body: {} }),
  getChampionship: () =>
    request<{ championship: { id: string; trackIds: string[]; round: number; points: number; wins: number; entries: { round: number; points: number; position: number }[] } | null }>('/races/championship'),
  linkChampionship: (raceId: string) =>
    request<{ ok: boolean; round: number }>('/races/championship/link', { body: { raceId } }),

  leaderboard: (period: 'global' | 'weekly' | 'monthly' | 'track', trackId?: string) =>
    request<LeaderboardResponse>(`/leaderboard/${period}${trackId ? `?trackId=${encodeURIComponent(trackId)}` : ''}`),

  achievements: () => request<{ achievements: AchievementDef[] }>('/achievements'),
};
