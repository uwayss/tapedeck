export { TapeDeckContext, useTapeDeckContext, type TapeDeckContextValue } from './context';
export { DEFAULT_DURATION, msToSeconds, resolveDuration, secondsToMs } from './duration';
export { clampIndex, nextIndex, prevIndex } from './navigation';
export {
  applyPoolPlan,
  planPool,
  POOL_SIZE,
  ROLE_OFFSET,
  slotForItemIndex,
  slotForRole,
  type PoolPlayer,
  type PoolRole,
  type SlotPlan,
} from './pool';
export { TapeDeckRoot } from './TapeDeckRoot';
export type {
  TapeDeckRootProps,
  TapeImageItem,
  TapeImageSource,
  TapeItem,
  TapeItemBase,
  TapeVideoItem,
  TapZones,
} from './types';
export { usePlayerPool } from './usePlayerPool';
