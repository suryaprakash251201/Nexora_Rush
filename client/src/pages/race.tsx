import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateScore, getCar, getTrack, levelFromXp } from 'shared';
import { RaceCanvas, type FinishedSummary } from '@/scenes/race';
import { Hud } from '@/ui/hud';
import { PauseMenu } from '@/ui/pause';
import { Results, type ResultData } from '@/ui/results';
import { TouchPad } from '@/ui/touch';
import { Loading } from '@/ui/loading';
import { useSettings, useSetup } from '@/store/settings';
import { useAuth } from '@/store/auth';
import { api, ApiError } from '@/api';
import { sound } from '@/sim/audio';
import { toastAch } from '@/ui/toasts';
import { resetTelemetry } from '@/store/telemetry';

/**
 * Owns one race: boot → countdown → racing → results.
 * Members submit to the server; guests run a local demo race.
 */
export function Race({ guest = false }: { guest?: boolean }) {
  const navigate = useNavigate();
  const setup = useSetup();
  const settings = useSettings();
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [round, setRound] = useState(0); // remount key
  const finished = useRef(false);

  const track = getTrack(setup.trackId);
  const car = getCar(setup.carId);
  const coarse = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    []
  );

  // boot audio + theme
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    sound.unlock();
    sound.vol = { master: settings.master, music: settings.music, sfx: settings.sfx, engine: settings.engine };
    sound.apply();
    sound.engineOn();
    sound.music(null);
    return () => {
      clearTimeout(t);
      sound.engineOff();
      sound.slide(0, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    sound.music('race');
    return () => sound.music(null);
  }, []);

  // Esc pauses (scene input handles in-race keys)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaused((p) => {
          sound.duck(!p);
          return !p;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onDone = useCallback(
    async (s: FinishedSummary) => {
      if (finished.current) return;
      finished.current = true;
      if (s.position === 1) sound.fanfare(true);
      else sound.fanfare(false);

      if (!user || guest) {
        const score = calculateScore({
          track: track!,
          mode: setup.mode,
          difficulty: setup.difficulty,
          position: s.position,
          grid: s.grid,
          raceTimeMs: s.raceMs,
          isFastLap: s.fastLap,
          events: {
            ...pickEvents(s),
            bestLapMs: s.bestMs,
            lapTimesMs: s.lapsMs,
            checkpointTimestampsMs: [],
          },
          finished: s.raceMs != null,
        });
        const prev = Number(localStorage.getItem('nr_demo_best') ?? 0);
        if (score > prev) localStorage.setItem('nr_demo_best', String(score));
        setResult({
          position: s.position,
          grid: s.grid,
          raceMs: s.raceMs,
          bestMs: s.bestMs,
          score,
          xp: Math.round(score * 0.05),
          personalBest: score > prev,
          fastLap: s.fastLap,
          wrecked: s.wrecked,
          server: null,
          ach: [],
          newCars: [],
          newTracks: [],
        });
        return;
      }

      // member: server-authoritative submit
      setWarn(null);
      let resp: Awaited<ReturnType<typeof api.finishRace>> | null = null;
      try {
        const raceId = sessionStorage.getItem('nr_race');
        if (!raceId) throw new Error('no session');
        resp = await api.finishRace({
          raceId,
          trackId: setup.trackId,
          carId: setup.carId,
          mode: setup.mode,
          difficulty: setup.difficulty,
          laps: setup.laps,
          weather: setup.weather,
          timeOfDay: setup.timeOfDay,
          position: s.position,
          grid: s.grid,
          raceTimeMs: s.raceMs != null && s.raceMs > 0 ? s.raceMs : null,
          finished: s.raceMs != null && s.raceMs > 0,
          distanceKm: track!.lengthKm * Math.max(1, s.lapsMs.length),
          clientScore: 0,
          events: {
            ...pickEvents(s),
            bestLapMs: s.bestMs,
            lapTimesMs: s.lapsMs,
            checkpointTimestampsMs: [],
          },
        });
        resp.unlockedAchievements.forEach(toastAch);
        sessionStorage.removeItem('nr_race');
        void useAuth.getState().refresh();
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'DUPLICATE_RACE')) {
          setWarn(
            e instanceof ApiError
              ? e.status === 422
                ? 'Result failed validation and was not saved.'
                : e.message
              : 'Could not save the race — connection issue.'
          );
        }
      }
      setResult({
        position: s.position,
        grid: s.grid,
        raceMs: s.raceMs,
        bestMs: s.bestMs,
        score: resp?.score ?? 0,
        xp: resp?.xpEarned ?? 0,
        personalBest: resp?.isPersonalBest ?? false,
        fastLap: s.fastLap,
        wrecked: s.wrecked,
        server: resp,
        ach: resp?.unlockedAchievements ?? [],
        newCars: resp?.unlockedCars ?? [],
        newTracks: resp?.unlockedTracks ?? [],
      });
    },
    [user, guest, setup, track]
  );

  const startSession = useCallback(async () => {
    finished.current = false;
    setResult(null);
    setWarn(null);
    resetTelemetry();
    setRound((r) => r + 1);
    if (user && !guest) {
      try {
        const r = await api.startRace({
          trackId: setup.trackId,
          carId: setup.carId,
          mode: setup.mode,
          difficulty: setup.difficulty,
          laps: setup.laps,
          weather: setup.weather,
          timeOfDay: setup.timeOfDay,
        });
        sessionStorage.setItem('nr_race', r.raceId);
        if (setup.mode === 'championship') {
          try {
            await api.linkChampionship(r.raceId);
          } catch {
            /* series may be complete */
          }
        }
      } catch (e) {
        if (e instanceof ApiError && e.code === 'DAILY_DONE') {
          alert(e.message);
          navigate('/dashboard');
          return;
        }
        setWarn('Race session failed — results will not be saved.');
      }
    }
  }, [user, guest, setup, navigate]);

  useEffect(() => {
    void startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!track || !car) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#04060c] text-slate-300">
        Track failed to load.{' '}
        <button className="ml-2 text-cyan-300 underline" onClick={() => navigate('/dashboard')}>
          Back to menu
        </button>
      </div>
    );
  }

  const quit = () => {
    sound.engineOff();
    sound.duck(false);
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black">
      <RaceCanvas
        key={round}
        trackId={setup.trackId}
        carId={setup.carId}
        mode={setup.mode}
        difficulty={setup.difficulty}
        laps={setup.laps}
        weather={setup.weather}
        timeOfDay={setup.timeOfDay}
        frozen={paused || !!result}
        onDone={onDone}
      />
      {loading && <Loading label={`Loading ${track.name}`} />}
      {!loading && !result && (
        <>
          <Hud trackId={setup.trackId} onPause={() => { setPaused(true); sound.duck(true); }} />
          {coarse && <TouchPad />}
          <PauseMenu
            open={paused}
            onResume={() => {
              setPaused(false);
              sound.duck(false);
            }}
            onRestart={() => {
              setPaused(false);
              sound.duck(false);
              void startSession();
            }}
            onQuit={quit}
          />
        </>
      )}
      {result && (
        <Results
          data={result}
          onRetry={() => void startSession()}
          onNext={setup.mode === 'championship' ? () => navigate('/play/championship') : setup.mode === 'daily' ? () => navigate('/dashboard') : undefined}
          nextLabel={setup.mode === 'championship' ? 'Next Round' : undefined}
          onGarage={() => navigate('/garage')}
          onMenu={() => navigate('/dashboard')}
          onSignup={() => navigate('/auth?signup=1')}
        />
      )}
      {warn && !result && (
        <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 backdrop-blur">
          {warn}
        </div>
      )}
    </div>
  );
}

function pickEvents(s: FinishedSummary) {
  return {
    overtakes: s.overtakes,
    nearMisses: s.nearMisses,
    driftPoints: s.drift,
    nitroChains: s.boosts,
    topSpeedKmh: s.topKmh,
    collisions: s.hits,
  };
}

export { levelFromXp };
