import { useEffect, useState } from 'react';

/**
 * Server time, ticking locally. The room state only arrives every few seconds,
 * so the chore progress bar needs its own clock. clockOffset is the difference
 * between the server and this browser, measured when the state message landed.
 *
 * Keep the interval coarse: every tick re-renders the component that calls this,
 * so a 250ms clock inside a page-sized component is a full repaint 4x a second.
 */
export function useServerNow(clockOffset = 0, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now() + clockOffset);

  useEffect(() => {
    setNow(Date.now() + clockOffset);
    const timer = window.setInterval(() => setNow(Date.now() + clockOffset), intervalMs);
    return () => window.clearInterval(timer);
  }, [clockOffset, intervalMs]);

  return now;
}

/**
 * Whether the bear is busy with a chore.
 *
 * The busy flag only flips twice per chore (start and finish), so this schedules
 * a single wake-up at the chore's end instead of running a continuous clock.
 * That keeps the scene, the bear and Fishy from repainting while a chore runs.
 */
export function useActivityBusy(activity, clockOffset = 0) {
  const endsAt = activity?.endsAt ?? 0;
  const [busy, setBusy] = useState(() => Boolean(endsAt) && Date.now() + clockOffset < endsAt);

  useEffect(() => {
    if (!endsAt) {
      setBusy(false);
      return undefined;
    }

    let timer = null;
    const check = () => {
      const remaining = endsAt - (Date.now() + clockOffset);
      if (remaining <= 0) {
        setBusy(false);
        return;
      }
      setBusy(true);
      // Wake up exactly when the chore ends; the 1s cap only guards against
      // clock drift between this device and the server.
      timer = window.setTimeout(check, Math.min(remaining, 1000));
    };

    check();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [endsAt, clockOffset]);

  return busy;
}
