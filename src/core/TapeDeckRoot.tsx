import { useCallback, useMemo, useState } from 'react';

import { TapeDeckContext, type TapeDeckContextValue } from './context';
import { DEFAULT_DURATION, msToSeconds } from './duration';
import { clampIndex, nextIndex, prevIndex } from './navigation';
import { slotForItemIndex } from './pool';
import { clamp01 } from './progress';
import { type TapeDeckRootProps } from './types';
import { usePlayerPool } from './usePlayerPool';
import { useProgressEngine } from './useProgressEngine';

export const TapeDeckRoot = ({
  items,
  initialIndex = 0,
  muted,
  defaultMuted = false,
  onMutedChange,
  defaultDuration = DEFAULT_DURATION,
  onIndexChange,
  onComplete,
  onRequestClose,
  onPrevThread,
  onItemSeen,
  children,
}: TapeDeckRootProps) => {
  const [index, setIndex] = useState(() => clampIndex(initialIndex, items.length));
  const [isPaused, setIsPaused] = useState(false);
  const [uncontrolledMuted, setUncontrolledMuted] = useState(defaultMuted);

  const isMuted = muted ?? uncontrolledMuted;

  const players = usePlayerPool({ items, index, muted: isMuted, playing: !isPaused });
  const item = items[index];
  const currentPlayer = players[slotForItemIndex(index)];

  const goTo = useCallback(
    (target: number) => {
      setIndex(target);
      onIndexChange?.(target);
    },
    [onIndexChange],
  );

  const next = useCallback(() => {
    const target = nextIndex(index, items.length);
    if (target === null) {
      onComplete?.();
      return;
    }
    goTo(target);
  }, [index, items.length, goTo, onComplete]);

  const prev = useCallback(() => {
    const target = prevIndex(index);
    if (target === null) {
      onPrevThread?.();
      return;
    }
    goTo(target);
  }, [index, goTo, onPrevThread]);

  const { progress, isBuffering, totalMs } = useProgressEngine({
    item,
    index,
    player: currentPlayer,
    isPaused,
    defaultDuration,
    onAdvance: next,
    onItemSeen,
  });

  const pause = useCallback(() => setIsPaused(true), []);
  const play = useCallback(() => setIsPaused(false), []);

  const seek = useCallback(
    (ms: number) => {
      const target = clamp01(totalMs <= 0 ? 0 : ms / totalMs);
      progress.value = target;
      if (item?.type === 'video' && currentPlayer) {
        currentPlayer.currentTime = msToSeconds(target * totalMs);
      }
    },
    [totalMs, progress, item, currentPlayer],
  );

  const setMuted = useCallback(
    (value: boolean) => {
      if (muted === undefined) setUncontrolledMuted(value);
      onMutedChange?.(value);
    },
    [muted, onMutedChange],
  );

  const toggleMute = useCallback(() => setMuted(!isMuted), [isMuted, setMuted]);

  const close = useCallback(() => onRequestClose?.(), [onRequestClose]);

  const value = useMemo<TapeDeckContextValue>(
    () => ({
      items,
      index,
      item,
      isPaused,
      isMuted,
      isBuffering,
      next,
      prev,
      pause,
      play,
      toggleMute,
      setMuted,
      seek,
      close,
      progress,
      players,
    }),
    [
      items,
      index,
      item,
      isPaused,
      isMuted,
      isBuffering,
      next,
      prev,
      pause,
      play,
      toggleMute,
      setMuted,
      seek,
      close,
      progress,
      players,
    ],
  );

  return <TapeDeckContext.Provider value={value}>{children}</TapeDeckContext.Provider>;
};
