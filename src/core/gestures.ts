import { type TapZones } from './types';

export const DEFAULT_TAP_ZONES: TapZones = { left: 0.3, right: 0.7 };
export const DEFAULT_HOLD_DELAY = 150;
export const DEFAULT_DISMISS_THRESHOLD = 120;

/** Past this, a flick dismisses even if it never travelled far. */
export const DISMISS_VELOCITY = 800;

/** How far up you can drag before it stops moving at all. */
const UPWARD_RESISTANCE = 0.2;

/** How much the deck shrinks at a full-height drag. */
const DISMISS_SCALE = 0.2;

export type TapZone = 'prev' | 'next' | null;

/**
 * Left band goes back, right band goes forward, and the middle does nothing —
 * a dead zone is what stops a mis-aimed tap from skipping an item.
 */
export const resolveTapZone = (x: number, width: number, zones: TapZones): TapZone => {
  'worklet';
  if (width <= 0) return null;

  const ratio = x / width;
  if (ratio <= zones.left) return 'prev';
  if (ratio >= zones.right) return 'next';
  return null;
};

/** Down moves nearly one-to-one; up is resisted, since there is nothing up there. */
export const rubberBand = (translationY: number): number => {
  'worklet';
  return translationY >= 0 ? translationY : translationY * UPWARD_RESISTANCE;
};

export const scaleForDismiss = (translationY: number, height: number): number => {
  'worklet';
  if (height <= 0 || translationY <= 0) return 1;
  const ratio = Math.min(translationY / height, 1);
  return 1 - ratio * DISMISS_SCALE;
};

/** Distance OR speed — a fast flick should dismiss without crossing the threshold. */
export const shouldDismiss = (
  translationY: number,
  velocityY: number,
  threshold: number = DEFAULT_DISMISS_THRESHOLD,
  dismissVelocity: number = DISMISS_VELOCITY,
): boolean => {
  'worklet';
  if (translationY <= 0) return false;
  return translationY > threshold || velocityY > dismissVelocity;
};
