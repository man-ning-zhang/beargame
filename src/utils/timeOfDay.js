import { useEffect, useState } from 'react';

/**
 * The five daylight periods the cabin decorates for:
 * 早晨 dawn · 上午 morning · 中午 noon · 下午 afternoon · 晚上 night
 * Based on the visitor's own system clock, refreshed every minute.
 */
export function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'night';
}

export function useTimeOfDay() {
  const [period, setPeriod] = useState(() => getTimeOfDay());
  useEffect(() => {
    const timer = window.setInterval(() => setPeriod(getTimeOfDay()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return period;
}
