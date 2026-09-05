import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCar, getTrack, GUEST_CAR_ID, GUEST_TRACK_ID } from 'shared';
import { useRaceSetup } from '@/store/settings';
import { RacePage } from './RacePage';

/**
 * Guest demo — one playable track without an account. Results are scored
 * locally and kept in localStorage (never submitted to leaderboards);
 * after the race the player is invited to create an account.
 */
export function GuestDemoPage() {
  const navigate = useNavigate();
  const setup = useRaceSetup();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const demo = getTrack(GUEST_TRACK_ID)!;
    setup.set('mode', 'quick');
    setup.setTrack(GUEST_TRACK_ID, demo);
    setup.set('carId', getCar(GUEST_CAR_ID) ? GUEST_CAR_ID : setup.carId);
    setup.set('difficulty', 'normal');
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;
  return <RacePage guest />;
}
