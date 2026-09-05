import { useEffect, useState } from 'react';
import { GUEST_CAR_ID, GUEST_TRACK_ID, getCar, getTrack } from 'shared';
import { useSetup } from '@/store/settings';
import { Race } from './race';

/** Free demo: one track, no account, local scoring only. */
export function Demo() {
  const setup = useSetup();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setup.set('mode', 'quick');
    setup.pickTrack(getTrack(GUEST_TRACK_ID) ? GUEST_TRACK_ID : setup.trackId);
    setup.set('carId', getCar(GUEST_CAR_ID) ? GUEST_CAR_ID : setup.carId);
    setup.set('difficulty', 'normal');
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;
  return <Race guest />;
}
