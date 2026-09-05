/**
 * API service — every call goes to the backend with credentials (httpOnly
 * cookies) and a CSRF header. Centralised error translation for the UI.
 */
import type {
  PublicUser,
  UserProfile,
  CarDef,
  TrackDef,
  LeaderboardResponse,
  RaceStartResponse,
  RaceFinishResponse,
  DailyChallengeStatus,
  AchievementDef,
  UnlockedAchievement,
  RaceHistoryEntry,
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

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? (options.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Connection lost — check your internet and try again.');
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.code ?? 'ERROR', data?.error ?? 'Something went wrong.', data?.fields);
  }
  return data as T;
}

export const api = {
  // auth
  register: (body: { username: string; email: string; password: string; confirmPassword: string; avatarSeed?: string }) =>
    request<{ user: PublicUser }>('/auth/register', { body }),
  login: (body: { identifier: string; password: string; remember: boolean }) =>
    request<{ user: PublicUser }>('/auth/login', { body }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { body: {} }),
  me: () => request<{ user: PublicUser }>('/auth/me'),
  refresh: () => request<{ user: PublicUser }>('/auth/refresh', { body: {} }),

  // catalog
  cars: () => request<{ cars: (CarDef & { topSpeedKmh: number })[]; unlocked: string[] | null }>('/cars'),
  tracks: () => request<{ tracks: TrackDef[]; unlocked: string[] | null }>('/tracks'),

  // profile
  profile: () => request<UserProfile>('/profile'),
  saveSettings: (settings: unknown) => request<{ ok: boolean }>('/profile/settings', { body: settings }),
  myAchievements: () => request<{ achievements: UnlockedAchievement[] }>('/profile/achievements'),

  // races
  startRace: (body: {
    trackId: string;
    carId: string;
    mode: 'quick' | 'championship' | 'time-trial' | 'endless' | 'daily';
    difficulty: string;
    laps: number;
    weather: string;
    timeOfDay: string;
  }) => request<RaceStartResponse>('/races/start', { body }),
  finishRace: (body: unknown) => request<RaceFinishResponse>('/races/finish', { body }),
  raceHistory: (limit = 20) => request<{ races: RaceHistoryEntry[] }>(`/races/history?limit=${limit}`),
  dailyStatus: () => request<DailyChallengeStatus>('/races/daily'),
  startChampionship: () =>
    request<{ championshipId: string; trackIds: string[]; round: number }>('/races/championship/start', { body: {} }),
  getChampionship: () =>
    request<{ championship: { id: string; trackIds: string[]; round: number; points: number; wins: number } | null }>(
      '/races/championship'
    ),
  linkChampionship: (raceId: string) =>
    request<{ ok: boolean; round: number }>('/races/championship/link', { body: { raceId } }),

  // leaderboard
  leaderboard: (period: 'global' | 'weekly' | 'monthly' | 'track', trackId?: string) =>
    request<LeaderboardResponse>(
      `/leaderboard/${period}${trackId ? `?trackId=${encodeURIComponent(trackId)}` : ''}`
    ),

  // achievements
  achievements: () => request<{ achievements: AchievementDef[] }>('/achievements'),
};
