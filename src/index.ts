import { Progress } from './components/Progress';
import { Viewport } from './components/Viewport';
import { TapeDeckRoot } from './core/TapeDeckRoot';

export * from './core';

export { Progress, type ProgressProps } from './components/Progress';
export { Viewport, type ViewportProps } from './components/Viewport';
export { useTapeDeck, type UseTapeDeck } from './hooks/useTapeDeck';
export { useTapeDeckProgress } from './hooks/useTapeDeckProgress';

/** Compound entry point (SPEC §4.5). Every slot has a default; every default is replaceable. */
export const TapeDeck = {
  Root: TapeDeckRoot,
  Viewport,
  Progress,
};
