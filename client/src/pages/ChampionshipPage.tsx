import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrack } from 'shared';
import { api, ApiError } from '@/services/api';
import { useRaceSetup } from '@/store/settings';
import { GlassPanel, NeonButton, SectionTitle } from '@/ui/shared';
import { formatNumber, ordinal } from '@/game/engine/format';

interface Champ {
  id: string;
  trackIds: string[];
  round: number;
  points: number;
  wins: number;
  entries?: { round: number; points: number; position: number }[];
}

export function ChampionshipPage() {
  const navigate = useNavigate();
  const setup = useRaceSetup();
  const [champ, setChamp] = useState<Champ | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api.getChampionship().then((r) => setChamp(r.championship));

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const startOrContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.startChampionship();
      await load();
      setChamp({ id: r.championshipId, trackIds: r.trackIds, round: r.round, points: 0, wins: 0 });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the championship.');
    } finally {
      setBusy(false);
    }
  };

  const nextTrackId = champ ? champ.trackIds[champ.round] : null;
  const complete = champ ? champ.round >= champ.trackIds.length : false;
  const champion = champ && complete && champ.wins >= 2;

  return (
    <div className="py-4">
      <SectionTitle sub="Three rounds. Points accumulate. Win at least two rounds to be crowned.">Championship</SectionTitle>

      {!champ ? (
        <GlassPanel className="mx-auto max-w-lg text-center">
          <div className="text-5xl">👑</div>
          <h3 className="mt-3 font-display text-xl font-black uppercase tracking-wider text-white">Start a new series</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            Three rounds across your unlocked tracks. Your finishing position each round converts to points.
            Win 2+ rounds to become Champion (unlock the Champion achievement).
          </p>
          <NeonButton variant="primary" className="mt-6" disabled={busy} onClick={startOrContinue}>
            {busy ? 'Preparing…' : 'Start Championship'}
          </NeonButton>
          {error && <div className="mt-3 text-sm text-rose-300">{error}</div>}
        </GlassPanel>
      ) : (
        <div className="mx-auto max-w-2xl">
          <GlassPanel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">
                Round {Math.min(champ.round + 1, champ.trackIds.length)} of {champ.trackIds.length}
              </h3>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Points</div>
                <div className="font-display text-xl font-black text-neon-cyan">{formatNumber(champ.points)}</div>
              </div>
            </div>

            {/* round list */}
            <div className="flex flex-col gap-2">
              {champ.trackIds.map((tid, i) => {
                const t = getTrack(tid);
                const entry = champ.entries?.find((e) => e.round === i + 1);
                const done = i < champ.round;
                const current = i === champ.round && !complete;
                return (
                  <div
                    key={tid}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      current ? 'border-cyan-400/50 bg-cyan-400/10' : done ? 'border-white/10 bg-white/5' : 'border-white/5 opacity-60'
                    }`}
                  >
                    <span className="font-display text-sm font-black text-slate-500">R{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-white">{t?.name ?? tid}</div>
                      {entry && (
                        <div className="text-[11px] text-slate-400">
                          Finished {ordinal(entry.position)} · {formatNumber(entry.points)} pts
                        </div>
                      )}
                    </div>
                    {done && <span className="text-emerald-400">✓</span>}
                    {current && <span className="font-display text-[10px] font-black uppercase tracking-widest text-neon-cyan">Next</span>}
                  </div>
                );
              })}
            </div>

            {complete ? (
              <div className="mt-6 text-center">
                <div className={`font-display text-2xl font-black uppercase tracking-widest ${champion ? 'text-amber-300' : 'text-slate-300'}`}>
                  {champion ? '👑 Champion!' : champ.wins >= 1 ? 'Series Complete' : 'Series Over'}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {champ.wins} round win{champ.wins === 1 ? '' : 's'} · {formatNumber(champ.points)} points
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <NeonButton variant="primary" disabled={busy} onClick={startOrContinue}>New Series</NeonButton>
                  <NeonButton onClick={() => navigate('/dashboard')}>Back to HQ</NeonButton>
                </div>
              </div>
            ) : (
              nextTrackId && (
                <NeonButton
                  variant="primary"
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => {
                    const t = getTrack(nextTrackId)!;
                    setup.set('mode', 'championship');
                    setup.setTrack(nextTrackId, t);
                    navigate(`/setup/${nextTrackId}`);
                  }}
                >
                  Go to Round {champ.round + 1}
                </NeonButton>
              )
            )}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
