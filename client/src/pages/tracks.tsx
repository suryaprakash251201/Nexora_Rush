import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { TRACKS, type TrackDef } from 'shared';
import { api } from '@/api';
import { useAuth } from '@/store/auth';
import { useSetup } from '@/store/settings';
import { Btn, Panel, Title } from '@/ui/kit';
import { fmtTime } from '@/sim/format';
import { mapPath } from '@/world/themes';
import { sound } from '@/sim/audio';

export function Tracks() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const setup = useSetup();
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [best, setBest] = useState<Record<string, { lap: number | null; score: number }>>({});

  useEffect(() => {
    api.tracks().then((r) => setUnlocked(r.unlocked ?? TRACKS.map((t) => t.id))).catch(() => undefined);
    api.raceHistory(50).then((r) => {
      const m: Record<string, { lap: number | null; score: number }> = {};
      for (const x of r.races) {
        const cur = m[x.trackId] ?? { lap: null, score: 0 };
        m[x.trackId] = {
          lap: x.bestLapMs != null && (cur.lap == null || x.bestLapMs < cur.lap) ? x.bestLapMs : cur.lap,
          score: Math.max(cur.score, x.score),
        };
      }
      setBest(m);
    }).catch(() => undefined);
  }, []);

  const level = user?.level ?? 1;

  return (
    <div className="py-4">
      <Title sub={`${TRACKS.length} worlds, ${TRACKS.length} feels. Locked tracks open as you level up.`}>Tracks</Title>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TRACKS.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <TrackCard
              track={t}
              locked={unlocked ? !unlocked.includes(t.id) : t.unlockLevel > level}
              level={level}
              pb={best[t.id]}
              onGo={() => {
                sound.click();
                setup.set('mode', 'quick');
                setup.pickTrack(t.id);
                navigate(`/setup/${t.id}`);
              }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const GRAD: Record<string, string> = {
  city: 'linear-gradient(135deg,#0a0e1e 20%,#22d3ee55)',
  desert: 'linear-gradient(135deg,#3d1c4f,#ff9a5a88)',
  mountain: 'linear-gradient(135deg,#1c3a5f,#a8c8e855)',
  arctic: 'linear-gradient(135deg,#5a90c8,#e8f4ff55)',
  tropical: 'linear-gradient(135deg,#2a1a5e,#ff7e5f77)',
  cyber: 'linear-gradient(135deg,#03040a,#a78bfa44)',
};

function TrackCard({ track, locked, level, pb, onGo }: { track: TrackDef; locked: boolean; level: number; pb?: { lap: number | null; score: number }; onGo: () => void }) {
  return (
    <Panel className={clsx('overflow-hidden !p-0', !locked && 'transition-transform hover:-translate-y-0.5', locked && 'opacity-75')}>
      <div className="relative h-36" style={{ background: GRAD[track.theme] }}>
        <Thumb trackId={track.id} />
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <span className="text-3xl">🔒</span>
            <span className="mt-1 font-display text-xs font-black uppercase tracking-widest text-slate-300">
              Unlocks at Level {track.unlockLevel}
            </span>
            <div className="mt-2 h-1 w-32 overflow-hidden rounded bg-white/10">
              <div className="h-full bg-cyan-300" style={{ width: `${Math.min(100, (level / track.unlockLevel) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-display text-base font-black uppercase tracking-wide text-white">{track.name}</h3>
          <span className="text-[10px] font-bold tracking-widest text-amber-300">
            {'◆'.repeat(track.difficulty)}{'◇'.repeat(5 - track.difficulty)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{track.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>{track.lengthKm} km</span>
          <span>· {track.defaultLaps} laps</span>
          <span>· {track.weathers.length} weather</span>
        </div>
        {(pb?.lap || pb?.score) && (
          <div className="mt-2 flex gap-4 text-[11px] font-semibold text-slate-400">
            {pb?.lap && <span>Best lap <span className="text-violet-300">{fmtTime(pb.lap)}</span></span>}
            {pb?.score ? <span>Best <span className="text-cyan-300">{pb.score.toLocaleString()}</span></span> : null}
          </div>
        )}
        <Btn kind="primary" className="mt-4 w-full px-3 py-2 text-xs" disabled={locked} onClick={onGo}>
          {locked ? 'Locked' : 'Race Setup →'}
        </Btn>
      </div>
    </Panel>
  );
}

function Thumb({ trackId }: { trackId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const pts = mapPath(trackId);
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);
    const pad = 12;
    const size = Math.min(W, H) - pad * 2;
    ctx.strokeStyle = 'rgba(34,211,238,0.9)';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = pad + x * size;
      const py = pad + y * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  }, [trackId]);
  return <canvas ref={ref} width={280} height={150} className="absolute inset-0 h-full w-full" aria-hidden />;
}
