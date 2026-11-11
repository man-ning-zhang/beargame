import { useEffect, useState } from 'react';

/**
 * Server time, ticking locally. The room state only arrives every few seconds,
 * so the chore progress bar needs its own clock. clockOffset is the difference
 * between the server and this browser, measured when the state message landed.
 */
export function useServerNow(clockOffset = 0) {
  const [now, setNow] = useState(() => Date.now() + clockOffset);

  useEffect(() => {
    setNow(Date.now() + clockOffset);
    const timer = window.setInterval(() => setNow(Date.now() + clockOffset), 250);
    return () => window.clearInterval(timer);
  }, [clockOffset]);

  return now;
}
