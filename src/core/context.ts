import { createContext, useContext } from 'react';
import { type VideoPlayer } from 'expo-video';

import { type TapeItem } from './types';

export interface TapeDeckContextValue {
  items: TapeItem[];
  index: number;
  item: TapeItem | undefined;

  isPaused: boolean;
  isMuted: boolean;

  next: () => void;
  prev: () => void;
  pause: () => void;
  play: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  close: () => void;

  /** Three players, addressed by slot. Never re-created, never released mid-session. */
  players: VideoPlayer[];
}

export const TapeDeckContext = createContext<TapeDeckContextValue | null>(null);

export const useTapeDeckContext = (): TapeDeckContextValue => {
  const value = useContext(TapeDeckContext);
  if (!value) {
    throw new Error('TapeDeck components and hooks must be rendered inside <TapeDeck.Root>.');
  }
  return value;
};
