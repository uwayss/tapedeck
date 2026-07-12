import { createContext, useContext } from 'react';
import { type VideoPlayer } from 'expo-video';
import { type SharedValue } from 'react-native-reanimated';

import { type TapeItem } from './types';

export interface TapeDeckContextValue {
  items: TapeItem[];
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
  setMuted: (muted: boolean) => void;
  seek: (ms: number) => void;
  close: () => void;

  /** 0→1 for the current item. Lives on the UI thread; reading it never re-renders. */
  progress: SharedValue<number>;

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
