import { useTapeDeckContext } from '../core/context';
import { type TapeItem } from '../core/types';

export interface UseTapeDeck {
  index: number;
  item: TapeItem | undefined;
  isPaused: boolean;
  isMuted: boolean;
  isBuffering: boolean;
  next: () => void;
  prev: () => void;
  pause: () => void;
  play: () => void;
  toggleMute: () => void;
  seek: (ms: number) => void;
  close: () => void;
}

/**
 * Carries nothing high-frequency (SPEC §4.6). Anything that ticks faster than a
 * few times a second belongs in a shared value, not in a re-rendering object.
 */
export const useTapeDeck = (): UseTapeDeck => {
  const {
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
    seek,
    close,
  } = useTapeDeckContext();

  return {
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
    seek,
    close,
  };
};
