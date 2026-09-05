# 🏁 Nexora Rush

[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React + Three.js](https://img.shields.io/badge/3D-React_Three_Fiber-06b6d4?logo=three.js&logoColor=white)](https://docs.pmnd.rs/react-three-fiber)
[![PostgreSQL + Prisma](https://img.shields.io/badge/db-PostgreSQL_+_Prisma-4169E1?logo=postgresql&logoColor=white)](https://www.prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A full-stack, commercial-quality **3D arcade racing game** that runs in the browser.
Nine cars, six themed tracks, five race modes, AI rivals, real physics, XP progression,
achievements, and server-validated leaderboards — all built on original, procedural assets.

```
React 18 + TypeScript + Vite + Three.js (React Three Fiber)  ·  Tailwind CSS + Framer Motion
Node.js + Express + TypeScript  ·  PostgreSQL + Prisma  ·  JWT auth (httpOnly cookies)
```

---

## Quick start

Prerequisites: **Node ≥ 20** and **PostgreSQL ≥ 14** (or Docker).

```bash
# 1. Install everything (npm workspaces: shared / server / client)
npm install

# 2. Configure the server
cp .env.example server/.env
#    → edit DATABASE_URL to point at your PostgreSQL instance

# 3. Create the schema + seed the catalog, demo racers and (optional) admin
cd server
npx prisma migrate dev        # creates tables
npm run db:seed               # cars, tracks, achievements, sample leaderboard
cd ..

# 4. Run API (port 4000) + client (port 5173) together
npm run dev
```

Open **http://localhost:5173** — register an account, or hit **Guest Demo** to race instantly.

### One-command database (Docker)

```bash
docker run -d --name nexora-pg -e POSTGRES_PASSWORD=nexora_dev \
  -e POSTGRES_USER=nexora -e POSTGRES_DB=nexora_rush -p 5432:5432 postgres:16-alpine
# DATABASE_URL=postgresql://nexora:nexora_dev@localhost:5432/nexora_rush?schema=public
```

## Scripts

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | root | API (tsx watch) + client (Vite) concurrently |
| `npm run build` | root | typechecks + production builds everything |
| `npm test` | root | all test suites (shared, server, client) |
| `npm run lint` | root | strict `tsc --noEmit` on both packages |
| `npm run db:migrate` | root | `prisma migrate dev` |
| `npm run db:seed` | root | seeds catalog + demo racers |
| `npm run db:studio` | root | Prisma Studio browser |

---

## Features

**Gameplay**
- Custom arcade vehicle physics (forward/lateral velocity decomposition): grip, drifting,
  handbrake slides, ice/wet/sand/grass surfaces, airborne behavior, wall collisions,
  car-to-car collisions, nitro with drift-charged regen, and hard resets (`R`).
- AI opponents with racing lines, corner braking, overtakes, mistakes, nitro on straights,
  rubber-banding and 5 difficulty tiers (Easy → Insane).
- 6 procedurally generated circuits, each with a distinct theme: **City Rush** (night neon),
  **Desert Storm** (sunset canyon), **Mountain Pass** (elevation + pines), **Arctic Run**
  (ice grip + snowfall), **Tropical Coast** (palm sunset), **Cyber Circuit** (holograms).
- 5 race modes: Quick Race, Championship (3 rounds), Time Trial, Endless, Daily Challenge.
- Weather (clear/rain/snow/fog/sandstorm) and time-of-day variants, procedurally-driven
  audio (engine, skids, collisions, countdown, music — no audio files), 3 camera modes,
  chase-cam FOV kick and impact shake, minimap, full HUD, mobile touch controls.

**Meta**
- Accounts (bcrypt), JWT in httpOnly cookies, refresh sessions, "remember me".
- XP → 50 levels; cars, tracks and paints unlock by level. 10 achievements with toasts.
- Personal bests, global / weekly / monthly / per-track leaderboards, world records.
- Profile with full racing history, stats, favorites, rank.
- Graphics presets (Low→Ultra), resolution scaling, shadows, FPS counter, audio sliders,
  camera/units/auto-reset preferences — synced to your account, cached in localStorage.
- Guest demo: one playable race, scored locally, invites sign-up, never saved to boards.

**Security**
- Server-authoritative scoring: the client's estimate is display-only.
- `POST /races/start` opens a server-side race session; `POST /races/finish` validates:
  lap count, per-lap floors, race-time floors, wall-clock sanity, top-speed ceilings per
  car/track, event plausibility (overtakes/drift caps), config match, one submission per
  session, 45-minute session expiry.
- Rate limiting (global + strict auth), Helmet, CORS allow-list, CSRF header guard,
  Zod validation on every payload, parameterized queries via Prisma, bcrypt cost 12.

---

## Architecture

```
nexora-rush/
├── shared/               # single source of truth for both apps
│   └── src/
│       ├── types.ts      # API payloads, game types
│       ├── game-data.ts  # cars, tracks, difficulties, scoring, XP, achievements,
│       │                 # stat→physics mapping (server anti-cheat uses it too)
│       └── scoring.ts    # calculateScore / calculateXp / validateRaceResult (anti-cheat)
├── server/
│   ├── prisma/           # schema.prisma, migrations/, seed.ts
│   ├── src/
│   │   ├── auth/         # register/login/logout/refresh/me, bcrypt, sessions
│   │   ├── middleware/   # requireAuth, CSRF guard, cookies, error handler
│   │   ├── routes/       # cars, tracks, profile, races, leaderboard, achievements
│   │   ├── services/     # player profile aggregation, race application, daily challenge
│   │   ├── validation.ts # Zod schemas for every endpoint
│   │   └── websocket/    # presence + room abstraction (multiplayer-ready)
│   └── tests/            # anti-cheat / scoring / xp rules (vitest)
└── client/
    └── src/
        ├── sim/          # simulation core (unit-tested): track splines, arcade
        │                 # vehicle physics, AI rivals, race orchestrator
        │                 # (fixed-step, wall-clock countdown), keyboard+touch
        │                 # input, procedural WebAudio, formatting helpers
        ├── world/        # procedural CarModel (yaw-exact, correct wheel axes),
        │                 # 6 environment themes, terrain-following ground,
        │                 # neon edges, dashes, start gantry, instanced props
        ├── scenes/       # RaceScene (orbit/chase/hood cams), Garage turntable,
        │                 # Landing hero scene
        ├── pages/        # landing, auth, shell, home, garage, tracks, setup,
        │                 # race, series, board, profile, trophies, prefs, demo
        ├── ui/           # design kit, 60fps HUD, touch pad, pause, results,
        │                 # toasts, settings form, loader
        ├── store/        # zustand: auth, settings+setup, telemetry bridge
        └── api.ts        # typed backend client (cookies + CSRF header)
```

**Controllers are pluggable.** The race engine drives the player through the same
`Controls` interface that keyboard and touch inputs feed; AI racers are `AIController`s.
A `NetworkPlayerController` can be added by mirroring opponent states over the existing
WebSocket layer (`/ws`, rooms + presence) without touching the engine.

**Rendering notes (learned the hard way, verified with headless screenshots):**
- three r155+ uses physical light units — intensities that look right in legacy
  tutorials render near-black. The rig uses ambient ×3, sun ×4 plus brighter
  albedo on road/ground, with lights + fog as direct Canvas children.
- The ground is a heightfield shrink-wrapped to the track elevation. A flat
  ground plane buries the road wherever the circuit dips — this was the
  original "invisible car" bug.
- Car yaw is exact: models are built nose-toward-+Z so `rotation.y = heading`
  matches the physics forward vector; wheels sit on (lateral, height,
  longitudinal) axes and visibly steer + spin.

---

## API

Base URL: `/api` · Auth: httpOnly cookies (`nr_access` JWT, `nr_refresh` session) ·
Mutating requests require the `X-Requested-With: XMLHttpRequest` header (CSRF guard).

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | `{username, email, password, confirmPassword}` |
| POST | `/auth/login` | `{identifier, password, remember}` |
| POST | `/auth/logout` | revokes refresh session |
| POST | `/auth/refresh` | rotates access token |
| GET | `/auth/me` | current public user |
| GET | `/cars` · `/tracks` | catalog + per-user unlocked ids |
| GET | `/profile` | full profile: stats, unlocks, history, achievements, rank |
| GET | `/profile/stats` · `/profile/achievements` | slices |
| PATCH | `/profile/settings` | persisted game settings |
| POST | `/races/start` | opens server-side race session → `{raceId}` |
| POST | `/races/finish` | validates + scores + awards XP/unlocks (see below) |
| GET | `/races/history?limit=` | recent results |
| GET | `/races/daily` | today's deterministic challenge + completion state |
| POST | `/races/championship/start` · GET `/races/championship` · POST `/races/championship/link` | 3-round series |
| GET | `/leaderboard/global` · `/weekly` · `/monthly` · `/track?trackId=` | best score per user |
| GET | `/achievements` · `/achievements/me` | catalog / unlocked |
| GET | `/api/health` | liveness |

### Race finish payload (server-validated)

```jsonc
POST /races/finish
{
  "raceId": "…",                // from /races/start (pending, yours, <45 min old)
  "trackId": "city-rush", "carId": "street-hawk",
  "mode": "quick", "difficulty": "normal", "laps": 3,
  "weather": "clear", "timeOfDay": "night",
  "position": 2, "grid": 7, "raceTimeMs": 238400,
  "finished": true, "distanceKm": 10.2, "clientScore": 0,  // ignored by server
  "events": {
    "overtakes": 3, "nearMisses": 2, "driftPoints": 420, "nitroChains": 1,
    "topSpeedKmh": 236, "collisions": 0,
    "bestLapMs": 76800, "lapTimesMs": [81200, 79600, 77600],
    "checkpointTimestampsMs": []
  }
}
// → { score, xpEarned, level, xp, leveledUp, isPersonalBest,
//     unlockedAchievements, unlockedCars, unlockedTracks, personalBestScore, globalRank }
```

Rejections return `422 INVALID_RESULT` with a reason (`impossible_lap_time`,
`impossible_speed`, `lap_count_mismatch`, `impossible_events`, `race_time_inconsistent`, …).

### Score formula (configurable in `shared/src/game-data.ts`)

`position table (5000…1000) + fast lap 2500 + overtakes 150ea + near miss 300ea +
nitro chain 400ea + drift points ×2 (capped) + clean race 2000 + time-under-par bonus`,
all multiplied by the difficulty multiplier (×1.0 → ×1.75). Time Trial and Endless use
pace/survival formulas. XP = score×0.05 + win/podium/fast-lap/daily/championship bonuses.

---

## Database

PostgreSQL via Prisma. Tables: `User`, `Session`, `Car`, `Track`, `UserCar`, `UserTrack`,
`Race` (anti-cheat session), `RaceResult`, `Achievement`, `UserAchievement`,
`Championship`, `ChampionshipEntry` — with FKs, unique constraints (`username`, `email`,
`raceId` one-to-one) and indexes on leaderboard query paths (score, userId+createdAt,
trackId+score, mode, startedAt).

Migrations live in `server/prisma/migrations/`. Seed data (real DB rows, never fake UI data):
catalog, 10 demo racers with stored results, optional admin via `ADMIN_EMAIL`/`ADMIN_PASSWORD`
env vars — no hard-coded credentials anywhere.

## Environment variables (`server/.env`, see `.env.example`)

```
DATABASE_URL=postgresql://…
JWT_SECRET=…          # long random string
SESSION_SECRET=…
PORT=4000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
ADMIN_EMAIL=          # optional, consumed only by the seed script
ADMIN_PASSWORD=
```

## Testing

```bash
npm test          # everything below
npm run test -w shared   # XP curve, stat mapping, scoring table
npm run test -w server   # anti-cheat rules, score calc, XP, event clamping (17 tests)
npm run test -w client   # track geometry, physics (accel/brake/steer/drift/nitro/reset),
                         # lap detection, race engine lifecycle, score display (14 tests)
```

The server also ships an end-to-end flow you can replay by hand: register → login →
`/races/start` → tamper the finish payload (get rejected) → submit a legal result →
check `/profile` and `/leaderboard/global`.

## Production build

```bash
npm run build            # shared + server typecheck, client bundle → client/dist
NODE_ENV=production npm start -w server   # serves the API (+ /ws); host client/dist statically
```

The client bundle is fully static — serve `client/dist` from any CDN/nginx and point
`CLIENT_URL` + the `/api` reverse proxy at the API host.

## Accessibility & responsiveness

Keyboard-navigable menus with visible focus rings, `aria-pressed`/`role` attributes on
all toggles and tabs, live regions for countdowns and achievement toasts, a reduced-motion
setting honored across UI, high-contrast neon-on-dark palette, touch-friendly hit targets,
bottom navigation and on-screen racing controls on mobile.

---

## Contributing

```bash
git clone https://github.com/suryaprakash251201/Nexora_Rush.git
cd Nexora_Rush
npm install
cp .env.example server/.env   # point DATABASE_URL at your PostgreSQL instance
cd server && npx prisma migrate dev && npm run db:seed && cd ..
npm run dev
```

- `npm test` and `npm run lint` must pass before opening a PR.
- Never commit `server/.env` or any credentials (it's git-ignored; use `.env.example` for schema changes).
- Server scoring is authoritative — gameplay/economy changes need test coverage in `shared`, `server/tests` and `client/tests`.

## License

MIT — see [LICENSE](./LICENSE).
