import { useCallback, useMemo, useState } from 'react';

import { TapeDeckContext, type TapeDeckContextValue } from './context';
import { clampIndex, nextIndex, prevIndex } from './navigation';
import { type TapeDeckRootProps } from './types';
import { usePlayerPool } from './usePlayerPool';

export const TapeDeckRoot = ({
  items,
  initialIndex = 0,
  muted,
  defaultMuted = false,
  onMutedChange,
  onIndexChange,
  onComplete,
  onRequestClose,
  onPrevThread,
  children,
}: TapeDeckRootProps) => {
  const [index, setIndex] = useState(() => clampIndex(initialIndex, items.length));
  const [isPaused, setIsPaused] = useState(false);
  const [uncontrolledMuted, setUncontrolledMuted] = useState(defaultMuted);

  const isMuted = muted ?? uncontrolledMuted;

  const players = usePlayerPool({ items, index, muted: isMuted, playing: !isPaused });

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

  const pause = useCallback(() => setIsPaused(true), []);
  const play = useCallback(() => setIsPaused(false), []);

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
      item: items[index],
      isPaused,
      isMuted,
      next,
      prev,
      pause,
      play,
      toggleMute,
      setMuted,
      close,
      players,
    }),
    [
      items,
      index,
      isPaused,
      isMuted,
      next,
      prev,
      pause,
      play,
      toggleMute,
      setMuted,
      close,
      players,
    ],
  );

  return <TapeDeckContext.Provider value={value}>{children}</TapeDeckContext.Provider>;
};
