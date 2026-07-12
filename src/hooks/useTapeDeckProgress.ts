import { type SharedValue } from 'react-native-reanimated';

import { useTapeDeckContext } from '../core/context';

/**
 * The raw 0→1 shared value for the current item. Reading it never re-renders —
 * consume it from a worklet (`useAnimatedStyle`, `useAnimatedReaction`), not from
 * render.
 */
export const useTapeDeckProgress = (): SharedValue<number> => useTapeDeckContext().progress;
