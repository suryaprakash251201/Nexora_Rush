import { z } from 'zod';
import { validateRaceResult } from 'shared';
import type { RaceFinishPayload } from 'shared';

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, _ and -'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
  confirmPassword: z.string(),
  avatarSeed: z.string().max(8).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your username or email').max(120),
  password: z.string().min(1, 'Enter your password').max(128),
  remember: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Race schemas
// ---------------------------------------------------------------------------

const weatherEnum = z.enum(['clear', 'rain', 'snow', 'fog', 'sandstorm']);
const todEnum = z.enum(['day', 'sunset', 'night']);
const modeEnum = z.enum(['quick', 'championship', 'time-trial', 'endless', 'daily']);
const diffEnum = z.enum(['easy', 'normal', 'hard', 'expert', 'insane']);

export const raceStartSchema = z.object({
  trackId: z.string().min(1).max(40),
  carId: z.string().min(1).max(40),
  mode: modeEnum,
  difficulty: diffEnum,
  laps: z.number().int().min(1).max(10),
  weather: weatherEnum,
  timeOfDay: todEnum,
});

export const raceEventsSchema = z.object({
  overtakes: z.number().finite().min(0).max(1000),
  nearMisses: z.number().finite().min(0).max(1000),
  driftPoints: z.number().finite().min(0).max(1_000_000),
  nitroChains: z.number().finite().min(0).max(1000),
  topSpeedKmh: z.number().finite().min(0).max(1000),
  collisions: z.number().finite().min(0).max(10000),
  bestLapMs: z.number().finite().min(0).max(3600_000).nullable().optional(),
  lapTimesMs: z.array(z.number().finite().min(0).max(3600_000)).max(40),
  checkpointTimestampsMs: z.array(z.number().finite()).max(1000).optional(),
});

export const raceFinishSchema = z.object({
  raceId: z.string().min(1).max(64),
  trackId: z.string().min(1).max(40),
  carId: z.string().min(1).max(40),
  mode: modeEnum,
  difficulty: diffEnum,
  laps: z.number().int().min(1).max(10),
  weather: weatherEnum,
  timeOfDay: todEnum,
  position: z.number().int().min(1).max(8),
  grid: z.number().int().min(1).max(8),
  raceTimeMs: z.number().finite().min(0).max(4 * 3600_000).nullable(),
  finished: z.boolean(),
  distanceKm: z.number().finite().min(0).max(2000),
  clientScore: z.number().finite().min(0).max(10_000_000),
  events: raceEventsSchema,
});

export type RaceFinishInput = z.infer<typeof raceFinishSchema>;
export type RaceStartInput = z.infer<typeof raceStartSchema>;

export { validateRaceResult };
