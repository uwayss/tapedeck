import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type VideoPlayer } from 'expo-video';
import {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { resolveDuration } from './duration';
import {
  clamp01,
  createSeenTracker,
  DRIFT_CHECK_INTERVAL_S,
  exceedsDrift,
  progressForPlayerTime,
  remainingMs,
  SEEN_AT,
} from './progress';
import { type TapeItem } from './types';

interface ProgressEngineOptions {
  item: TapeItem | undefined;
  index: number;
  player: VideoPlayer | undefined;
  isPaused: boolean;
  defaultDuration: number | undefined;
  onAdvance: () => void;
  onItemSeen?: ((item: TapeItem, index: number) => void) | undefined;
}

export interface ProgressEngine {
  progress: SharedValue<number>;
  isBuffering: boolean;
  /** Resolved duration of the current item, in ms. */
  totalMs: number;
}

/**
 * SPEC §4.3. The bar is a linear timing animation owned by the UI thread, not a
 * sampled value: nothing on the JS thread has to run for it to stay smooth. The
 * player is consulted about once a second only to correct drift, and the item
 * advances from the animation's own completion callback — never a timer.
 */
export const useProgressEngine = ({
  item,
  index,
  player,
  isPaused,
  defaultDuration,
  onAdvance,
  onItemSeen,
}: ProgressEngineOptions): ProgressEngine => {
  const progress = useSharedValue(0);

  // Latest-value refs so the timing animation never restarts just because a consumer
  // passed a new inline callback. Synced in an effect, never written during render.
  const advanceRef = useRef(onAdvance);
  const seenRef = useRef(onItemSeen);
  const itemRef = useRef(item);
  const indexRef = useRef(index);

  useEffect(() => {
    advanceRef.current = onAdvance;
    seenRef.current = onItemSeen;
    itemRef.current = item;
    indexRef.current = index;
  });

  const [seenTracker] = useState(createSeenTracker);
  const lastIndexRef = useRef<number | null>(null);

  /**
   * Worklets can only schedule functions that live on the RN runtime. An inline arrow
   * created inside the animation callback is defined on the UI runtime and throws —
   * and closing over `advanceRef` would drag the ref object into the worklet, so every
   * later write to `.current` would warn about mutating a serialized object. This
   * stable indirection keeps the ref purely on the JS side.
   */
  const advance = useCallback(() => {
    advanceRef.current();
  }, []);

  const subscribeStatus = useCallback(
    (onStoreChange: () => void) => {
      if (!player) return () => {};
      const sub = player.addListener('statusChange', onStoreChange);
      return () => sub.remove();
    },
    [player],
  );

  const getStatus = useCallback(() => player?.status ?? 'idle', [player]);

  const status = useSyncExternalStore(subscribeStatus, getStatus);
  const isBuffering = status === 'loading';

  const isVideo = item?.type === 'video';
  // An image has nothing to buffer, so the timing animation is the only source of truth.
  const isReady = item !== undefined && (!isVideo || status === 'readyToPlay');
  const totalMs = resolveDuration(item, isVideo ? player?.duration : null, defaultDuration);

  const startTiming = useCallback(
    (from: number) => {
      progress.value = from;
      progress.value = withTiming(
        1,
        { duration: remainingMs(from, totalMs), easing: Easing.linear },
        (finished) => {
          'worklet';
          // Advancing from the animation callback is what keeps the item boundary on
          // the UI thread's clock instead of a setTimeout the JS thread can starve.
          if (finished) scheduleOnRN(advance);
        },
      );
    },
    [progress, totalMs, advance],
  );

  useEffect(() => {
    if (lastIndexRef.current !== index) {
      lastIndexRef.current = index;
      cancelAnimation(progress);
      progress.value = 0;
    }

    if (!isReady || isPaused) {
      // Freezing rather than resetting: resuming picks up from wherever it stopped.
      cancelAnimation(progress);
      return;
    }

    startTiming(progress.value);

    return () => cancelAnimation(progress);
  }, [index, isReady, isPaused, startTiming, progress]);

  useEffect(() => {
    if (!player || !isVideo || isPaused || !isReady) return;

    player.timeUpdateEventInterval = DRIFT_CHECK_INTERVAL_S;

    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (!exceedsDrift(currentTime, progress.value, totalMs)) return;
      startTiming(progressForPlayerTime(currentTime, totalMs));
    });

    return () => {
      sub.remove();
      player.timeUpdateEventInterval = 0;
    };
  }, [player, isVideo, isPaused, isReady, totalMs, progress, startTiming]);

  const markSeen = useCallback(() => {
    const current = itemRef.current;
    if (!current) return;
    if (seenTracker.markSeen(current.id)) {
      seenRef.current?.(current, indexRef.current);
    }
  }, [seenTracker]);

  useAnimatedReaction(
    () => progress.value >= SEEN_AT,
    (crossed, previous) => {
      if (crossed && !previous) scheduleOnRN(markSeen);
    },
    [markSeen],
  );

  return { progress, isBuffering, totalMs };
};

export const clampProgress = clamp01;
