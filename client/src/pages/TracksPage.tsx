import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TRACKS, type TrackDef } from 'shared';
import { api } from '@/services/api';
import { useAuth } from '@/store/auth';
import { useRaceSetup } from '@/store/settings';
import { GlassPanel, NeonButton, SectionTitle } from '@/ui/shared';
import { formatTime } from '@/game/engine/format';
import { audio } from '@/game/engine/audio';
import { getTrackGeometry } from '@/game/tracks/trackDefs';
import { minimapPath } from '@/game/tracks/trackDefs';
import { clsx } from 'clsx';

function TrackThumb({ trackId, className }: { trackId: string; className?: string }) {
  const path = useMemo(() => minimapPath(trackId), [trackId]);
  const geo = useMemo(() => getTrackGeometry(trackId), [trackId]);
  // static mini render via canvas
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    const pad = 10;
    const size = Math.min(W, H) - pad * 2;
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineWidth = Math.max(3, geo.width / 6);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.pts.forEach(([x, y], i) => {
      const px = pad + x * size, py = pad + y * size;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  }, [path, geo]);
  return <canvas ref={ref} width={280} height={180} className={className} aria-hidden />;
}

export function TracksPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setup = useRaceSetup();
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [personalBests, setPersonalBests] = useState<Record<string, { bestLapMs: number | null; bestScore: number }>>({});

  useEffect(() => {
    api.tracks().then((r) => setUnlocked(r.unlocked ?? TRACKS.map((t) => t.id)));
    api.raceHistory(50).then((r) => {
      const map: Record<string, { bestLapMs: number | null; bestScore: number }> = {};
      for (const race of r.races) {
        const cur = map[race.trackId] ?? { bestLapMs: null, bestScore: 0 };
        map[race.trackId] = {
          bestLapMs: race.bestLapMs != null && (cur.bestLapMs == null || race.bestLapMs < cur.bestLapMs) ? race.bestLapMs : cur.bestLapMs,
          bestScore: Math.max(cur.bestScore, race.score),
        };
      }
      setPersonalBests(map);
    });
  }, []);

  const level = user?.level ?? 1;

  return (
    <div className="py-4">
      <SectionTitle sub="Six worlds, six feels. Locked tracks unlock as you level up.">Tracks</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TRACKS.map((t, i) => (
          <TrackCard
            key={t.id}
            track={t}
            index={i}
            unlocked={unlocked ? unlocked.includes(t.id) : t.unlockLevel <= level}
            level={level}
            pb={personalBests[t.id]}
            onRace={() => {
              audio.uiClick();
              setup.setTrack(t.id, t);
              setup.set('mode', 'quick');
              navigate(`/setup/${t.id}`);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TrackCard({
  track, index, unlocked, level, pb, onRace,
}: {
  track: TrackDef;
  index: number;
  unlocked: boolean;
  level: number;
  pb?: { bestLapMs: number | null; bestScore: number };
  onRace: () => void;
}) {
  const gradient: Record<string, string> = {
    city: 'linear-gradient(135deg,#0a0e1e 20%,#22d3ee55)',
    desert: 'linear-gradient(135deg,#3d1c4f,#ff9a5a88)',
    mountain: 'linear-gradient(135deg,#1c3a5f,#a8c8e855)',
    arctic: 'linear-gradient(135deg,#5a90c8,#e8f4ff55)',
    tropical: 'linear-gradient(135deg,#2a1a5e,#ff7e5f77)',
    cyber: 'linear-gradient(135deg,#03040a,#a78bfa44)',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <GlassPanel className={clsx('overflow-hidden p-0', unlocked && 'transition-transform hover:-translate-y-0.5', !unlocked && 'opacity-70')}>
        <div className="relative h-36" style={{ background: gradient[track.theme] }}>
          <TrackThumb trackId={track.id} className="absolute inset-0 h-full w-full" />
          {!unlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <span className="text-3xl">🔒</span>
              <span className="mt-1 font-display text-xs font-black uppercase tracking-widest text-slate-300">Unlocks at Level {track.unlockLevel}</span>
              {level < track.unlockLevel && (
                <div className="mt-2 h-1 w-32 overflow-hidden rounded bg-white/10">
                  <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (level / track.unlockLevel) * 100)}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-display text-base font-black uppercase tracking-wide text-white">{track.name}</h3>
            <span className="text-[10px] font-bold tracking-widest text-amber-400">{'◆'.repeat(track.difficulty)}{'◇'.repeat(5 - track.difficulty)}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{track.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span>{track.lengthKm} km</span>
            <span>· {track.defaultLaps} laps</span>
            <span>· {track.weathers.length} weather</span>
          </div>
          {(pb?.bestLapMs || pb?.bestScore) && (
            <div className="mt-2 flex gap-4 text-[11px] font-semibold text-slate-400">
              {pb?.bestLapMs && <span>Your best lap: <span className="text-neon-violet">{formatTime(pb.bestLapMs)}</span></span>}
              {pb?.bestScore ? <span>Best score: <span className="text-neon-cyan">{pb.bestScore.toLocaleString()}</span></span> : null}
            </div>
          )}
          <NeonButton variant="primary" size="sm" className="mt-4 w-full" disabled={!unlocked} onClick={onRace}>
            {unlocked ? 'Race Setup →' : 'Locked'}
          </NeonButton>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
