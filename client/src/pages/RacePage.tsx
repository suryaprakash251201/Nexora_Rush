import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCar, getTrack, type Difficulty, type RaceMode, type Weather, type TimeOfDay } from 'shared';
import { RaceCanvas, type FinishedRace } from '@/game/scenes/RaceScene';
import { HUD } from '@/ui/HUD';
import { PauseMenu } from '@/ui/PauseMenu';
import { ResultsScreen, type ResultsData } from '@/ui/ResultsScreen';
import { TouchControls } from '@/ui/TouchControls';
import { LoadingScreen } from '@/ui/LoadingScreen';
import { useSettings, useRaceSetup } from '@/store/settings';
import { useAuth } from '@/store/auth';
import { api, ApiError } from '@/services/api';
import { audio } from '@/game/engine/audio';
import { toastAchievement } from '@/ui/AchievementToasts';
import { calculateScore, levelFromXp } from 'shared';

/**
 * RacePage — owns one race lifecycle: countdown → racing → results.
 * Authenticated races are submitted to the server for authoritative scoring;
 * guests run local demo races (result kept temporarily, not saved).
 */
export function RacePage({ guest }: { guest?: boolean }) {
  const navigate = useNavigate();
  const setup = useRaceSetup();
  const settings = useSettings();
  const user = useAuth((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [savingError, setSavingError] = useState<string | null>(null);
  const raceKey = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const finishedRef = useRef(false);

  const track = getTrack(setup.trackId);
  const car = getCar(setup.carId);

  const isTouch = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    []
  );

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700); // assets are procedural — brief themed load
    audio.init();
    audio.setVolumes({
      master: settings.masterVolume,
      music: settings.musicVolume,
      sfx: settings.sfxVolume,
      engine: settings.engineVolume,
    });
    audio.startEngine();
    audio.playMusic(null);
    return () => {
      clearTimeout(t);
      audio.stopEngine();
      audio.updateSkid(0, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // Esc pause via dedicated listener (race input is inside the scene)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pauseAudio = (p: boolean) => {
    if (p) audio.suspendAll();
    else audio.resumeAll();
  };

  const handleFinish = useCallback(
    async (r: FinishedRace) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const trackDef = track!;
      const carDef = car!;

      if (!user || guest) {
        // ---- Guest demo: local scoring, kept temporarily ----
        const score = calculateScore({
          track: trackDef,
          mode: setup.mode,
          difficulty: setup.difficulty,
          position: r.position,
          grid: r.grid,
          raceTimeMs: r.raceTimeMs,
          isFastLap: r.fastLap,
          events: {
            ...r.events,
            bestLapMs: r.bestLapMs,
            lapTimesMs: r.lapTimesMs,
            checkpointTimestampsMs: [],
          },
          finished: r.raceTimeMs != null,
        });
        const prev = Number(localStorage.getItem('nr_demo_best') ?? 0);
        if (score > prev) localStorage.setItem('nr_demo_best', String(score));
        localStorage.setItem(
          'nr_demo_last',
          JSON.stringify({ score, xp: Math.round(score * 0.05), position: r.position, trackId: setup.trackId })
        );
        if (r.position === 1) audio.victory();
        else audio.defeat();
        setResults({
          position: r.position,
          grid: r.grid,
          raceTimeMs: r.raceTimeMs,
          bestLapMs: r.bestLapMs,
          score,
          xpEarned: Math.round(score * 0.05),
          isPersonalBest: score > prev,
          fastLap: r.fastLap,
          wrecked: r.wrecked,
          serverResponse: null,
          unlockedAchievements: [],
          unlockedCars: [],
          unlockedTracks: [],
          levelBefore: 1,
        });
        return;
      }

      // ---- Authenticated: server-authoritative submission ----
      setSavingError(null);
      try {
        const raceId = sessionStorage.getItem('nr_race_id');
        if (!raceId) throw new Error('missing race session');
        let resp: Awaited<ReturnType<typeof api.finishRace>> | null = null;
        try {
          resp = await api.finishRace({
            raceId,
            trackId: setup.trackId,
            carId: setup.carId,
            mode: setup.mode,
            difficulty: setup.difficulty,
            laps: setup.laps,
            weather: setup.weather,
            timeOfDay: setup.timeOfDay,
            position: r.position,
            grid: r.grid,
            raceTimeMs: r.raceTimeMs != null && r.raceTimeMs > 0 ? r.raceTimeMs : null,
            finished: r.raceTimeMs != null && r.raceTimeMs > 0,
            distanceKm: (trackDef.lengthKm * r.lapTimesMs.length) || 0.1,
            clientScore: 0,
            events: {
              overtakes: r.events.overtakes,
              nearMisses: r.events.nearMisses,
              driftPoints: r.events.driftPoints,
              nitroChains: r.events.nitroChains,
              topSpeedKmh: r.events.topSpeedKmh,
              collisions: r.events.collisions,
              bestLapMs: r.bestLapMs,
              lapTimesMs: r.lapTimesMs,
              checkpointTimestampsMs: [],
            },
          });
          resp.unlockedAchievements.forEach(toastAchievement);
        } catch (e) {
          if (e instanceof ApiError && e.code === 'DUPLICATE_RACE') {
            // result already recorded — still show local summary
          } else {
            setSavingError(
              e instanceof ApiError
                ? e.status === 422
                  ? 'Race result could not be validated and was not saved.'
                  : e.message
                : 'Unable to save race — check your connection.'
            );
          }
        }
        if (r.position === 1) audio.victory();
        else audio.defeat();
        setResults({
          position: r.position,
          grid: r.grid,
          raceTimeMs: r.raceTimeMs,
          bestLapMs: r.bestLapMs,
          score: resp?.score ?? 0,
          xpEarned: resp?.xpEarned ?? 0,
          isPersonalBest: resp?.isPersonalBest ?? false,
          fastLap: r.fastLap,
          wrecked: r.wrecked,
          serverResponse: resp,
          unlockedAchievements: resp?.unlockedAchievements ?? [],
          unlockedCars: resp?.unlockedCars ?? [],
          unlockedTracks: resp?.unlockedTracks ?? [],
          levelBefore: levelFromXp((resp?.xp ?? 0) - (resp?.xpEarned ?? 0)),
        });
        sessionStorage.removeItem('nr_race_id');
      } catch (e) {
        setSavingError('Unable to save race — check your connection.');
        console.error(e);
      }
    },
    [user, guest, setup, track, car]
  );

  const startRaceSession = useCallback(async () => {
    finishedRef.current = false;
    setResults(null);
    setSavingError(null);
    raceKey.current += 1;
    setReloadKey((k) => k + 1);
    if (user && !guest) {
      try {
        const resp = await api.startRace({
          trackId: setup.trackId,
          carId: setup.carId,
          mode: setup.mode,
          difficulty: setup.difficulty,
          laps: setup.laps,
          weather: setup.weather,
          timeOfDay: setup.timeOfDay,
        });
        sessionStorage.setItem('nr_race_id', resp.raceId);
      } catch (e) {
        if (e instanceof ApiError && e.code === 'DAILY_DONE') {
          alert(e.message);
          navigate('/dashboard');
          return;
        }
        setSavingError('Race session could not start — results will not be saved.');
      }
    }
  }, [user, guest, setup, navigate]);

  // start a session on mount
  useEffect(() => {
    void startRaceSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // music resumes to race track
  useEffect(() => {
    audio.playMusic('race');
    return () => audio.playMusic(null);
  }, []);

  if (!track || !car) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ink-950 text-slate-300">
        Track failed to load.{' '}
        <button className="ml-2 text-neon-cyan underline" onClick={() => navigate('/dashboard')}>
          Back to menu
        </button>
      </div>
    );
  }

  const quitRace = () => {
    audio.stopEngine();
    navigate('/dashboard');
  };

  return (
    <div className="fixed inset-0 bg-black">
      <RaceCanvas
        key={reloadKey}
        trackId={setup.trackId}
        carId={setup.carId}
        mode={setup.mode}
        difficulty={setup.difficulty}
        laps={setup.laps}
        weather={setup.weather}
        timeOfDay={setup.timeOfDay}
        paused={paused || !!results}
        onFinish={handleFinish}
      />

      {loading && <LoadingScreen label={`LOADING ${track.name.toUpperCase()}`} />}

      {!loading && !results && (
        <>
          <HUD
            trackId={setup.trackId}
            onQuit={() => {
              setPaused(true);
              pauseAudio(true);
            }}
          />
          {isTouch && <TouchControls />}
          <PauseMenu
            open={paused}
            onResume={() => {
              setPaused(false);
              pauseAudio(false);
            }}
            onRestart={() => {
              setPaused(false);
              pauseAudio(false);
              void startRaceSession();
            }}
            onQuit={() => {
              setPaused(false);
              pauseAudio(false);
              quitRace();
            }}
          />
        </>
      )}

      {results && (
        <ResultsScreen
          data={results}
          onRetry={() => void startRaceSession()}
          onNext={
            setup.mode === 'championship'
              ? () => navigate('/play/championship')
              : setup.mode === 'daily'
                ? () => navigate('/dashboard')
                : undefined
          }
          nextLabel={setup.mode === 'championship' ? 'Next Round' : undefined}
          onGarage={() => navigate('/garage')}
          onMenu={() => navigate('/dashboard')}
          onSignUp={() => navigate('/auth?signup=1')}
        />
      )}

      {savingError && !results && (
        <div className="absolute left-1/2 top-16 z-40 -translate-x-1/2 rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-200 backdrop-blur">
          {savingError}
        </div>
      )}
    </div>
  );
}
