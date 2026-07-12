import { secondsToMs } from './duration';

/** SPEC §4.3: correct only when the optimistic animation is meaningfully off. */
export const DRIFT_THRESHOLD_MS = 150;

/** How often the player reports time for the drift check. Seconds — expo-video's unit. */
export const DRIFT_CHECK_INTERVAL_S = 1;

/** SPEC §4.6: onItemSeen fires once, at 50% watched. */
export const SEEN_AT = 0.5;

export const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/** Milliseconds left to animate from a 0→1 progress value. */
export const remainingMs = (progress: number, totalMs: number): number =>
  Math.max(0, (1 - clamp01(progress)) * totalMs);

/** How far the optimistic animation has drifted from where the player actually is. */
export const driftMs = (
  playerTimeSeconds: number,
  progress: number,
  totalMs: number,
): number | null => {
  if (!Number.isFinite(playerTimeSeconds) || totalMs <= 0) return null;
  const expected = clamp01(progress) * totalMs;
  return Math.abs(secondsToMs(playerTimeSeconds) - expected);
};

export const exceedsDrift = (
  playerTimeSeconds: number,
  progress: number,
  totalMs: number,
  threshold: number = DRIFT_THRESHOLD_MS,
): boolean => {
  const drift = driftMs(playerTimeSeconds, progress, totalMs);
  return drift !== null && drift > threshold;
};

/** Where progress should be, given what the player reports. */
export const progressForPlayerTime = (playerTimeSeconds: number, totalMs: number): number =>
  totalMs <= 0 ? 0 : clamp01(secondsToMs(playerTimeSeconds) / totalMs);

export interface SeenTracker {
  /** True the first time an item crosses the threshold, false every time after. */
  markSeen(id: string): boolean;
  hasSeen(id: string): boolean;
  reset(): void;
}

export const createSeenTracker = (): SeenTracker => {
  const seen = new Set<string>();

  return {
    markSeen(id: string) {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    },
    hasSeen: (id: string) => seen.has(id),
    reset: () => seen.clear(),
  };
};
