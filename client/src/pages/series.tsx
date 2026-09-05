import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrack } from 'shared';
import { api, ApiError } from '@/api';
import { useSetup } from '@/store/settings';
import { Btn, Panel, Title } from '@/ui/kit';
import { fmtNum, ordinal } from '@/sim/format';

interface Series {
  id: string;
  trackIds: string[];
  round: number;
  points: number;
  wins: number;
  entries: { round: number; points: number; position: number }[];
}

export function Series() {
  const navigate = useNavigate();
  const setup = useSetup();
  const [s, setS] = useState<Series | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getChampionship().then((r) => setS(r.championship)).catch(() => undefined);
  }, []);

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.startChampionship();
      const cur = await api.getChampionship();
      setS(cur.championship ?? { id: r.championshipId, trackIds: r.trackIds, round: r.round, points: 0, wins: 0, entries: [] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the series.');
    } finally {
      setBusy(false);
    }
  };

  const done = s ? s.round >= s.trackIds.length : false;
  const champ = s && done && s.wins >= 2;
  const next = s && !done ? s.trackIds[s.round] : null;

  return (
    <div className="py-4">
      <Title sub="Three rounds. Points accumulate. Win 2+ rounds to be crowned.">Championship</Title>
      {!s ? (
        <Panel className="mx-auto max-w-lg text-center">
          <div className="text-5xl">👑</div>
          <h3 className="mt-3 font-display text-xl font-black uppercase tracking-wider text-white">Start a new series</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            Three rounds across your unlocked tracks. Win at least two to become Champion.
          </p>
          <Btn kind="primary" className="mt-6" disabled={busy} onClick={begin}>
            {busy ? 'Preparing…' : 'Start Championship'}
          </Btn>
          {error && <div className="mt-3 text-sm text-rose-300">{error}</div>}
        </Panel>
      ) : (
        <div className="mx-auto max-w-2xl">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">
                Round {Math.min(s.round + 1, s.trackIds.length)} of {s.trackIds.length}
              </h3>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Points</div>
                <div className="font-display text-xl font-black text-cyan-300">{fmtNum(s.points)}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {s.trackIds.map((tid, i) => {
                const t = getTrack(tid);
                const entry = s.entries?.find((e) => e.round === i + 1);
                const isDone = i < s.round;
                const current = i === s.round && !done;
                return (
                  <div
                    key={tid}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      current ? 'border-cyan-300/50 bg-cyan-300/10' : isDone ? 'border-white/10 bg-white/5' : 'border-white/5 opacity-60'
                    }`}
                  >
                    <span className="font-display text-sm font-black text-slate-500">R{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-white">{t?.name ?? tid}</div>
                      {entry && (
                        <div className="text-[11px] text-slate-400">
                          Finished {ordinal(entry.position)} · {fmtNum(entry.points)} pts
                        </div>
                      )}
                    </div>
                    {isDone && <span className="text-emerald-400">✓</span>}
                    {current && <span className="font-display text-[10px] font-black uppercase tracking-widest text-cyan-300">Next</span>}
                  </div>
                );
              })}
            </div>
            {done ? (
              <div className="mt-6 text-center">
                <div className={`font-display text-2xl font-black uppercase tracking-widest ${champ ? 'text-amber-300' : 'text-slate-300'}`}>
                  {champ ? '👑 Champion!' : 'Series Complete'}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {s.wins} round win{s.wins === 1 ? '' : 's'} · {fmtNum(s.points)} points
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <Btn kind="primary" disabled={busy} onClick={begin}>New Series</Btn>
                  <Btn onClick={() => navigate('/dashboard')}>Back to HQ</Btn>
                </div>
              </div>
            ) : (
              next && (
                <Btn
                  kind="primary"
                  className="mt-6 w-full px-8 py-4 text-base"
                  onClick={() => {
                    setup.set('mode', 'championship');
                    setup.pickTrack(next);
                    navigate(`/setup/${next}`);
                  }}
                >
                  Go to Round {s.round + 1}
                </Btn>
              )
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
