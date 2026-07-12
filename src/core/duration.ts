import { type TapeItem } from './types';

export const DEFAULT_DURATION = 5_000;

/** expo-video reports seconds; the whole public API is milliseconds. Convert only here. */
export const secondsToMs = (seconds: number): number => seconds * 1000;
export const msToSeconds = (ms: number): number => ms / 1000;

const isUsable = (ms: number | null | undefined): ms is number =>
  typeof ms === 'number' && Number.isFinite(ms) && ms > 0;

/**
 * SPEC §4.3: item's declared duration → player.duration once readyToPlay → defaultDuration.
 * `playerDurationSeconds` is whatever the player currently reports; it is 0 before
 * readyToPlay, which is exactly why it must not win over a declared duration.
 */
export const resolveDuration = (
  item: TapeItem | undefined,
  playerDurationSeconds: number | null | undefined,
  defaultDuration: number = DEFAULT_DURATION,
): number => {
  if (isUsable(item?.duration)) return item.duration;

  if (item?.type === 'video' && isUsable(playerDurationSeconds)) {
    return secondsToMs(playerDurationSeconds);
  }

  return isUsable(defaultDuration) ? defaultDuration : DEFAULT_DURATION;
};
