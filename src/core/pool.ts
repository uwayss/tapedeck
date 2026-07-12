import { type TapeItem } from './types';

/** SPEC §4.1 rule 2: exactly three players — prev / current / next. */
export const POOL_SIZE = 3;

export type PoolRole = 'prev' | 'current' | 'next';

export const ROLE_OFFSET: Record<PoolRole, number> = {
  prev: -1,
  current: 0,
  next: 1,
};

/**
 * The role map rotates implicitly: a slot is just the item index mod the pool
 * size, so advancing the index re-labels the slots without moving any sources
 * between them. Two items can never land on the same slot while they are both
 * in the -1..+1 window, which is what makes a leak structurally impossible
 * rather than something the caller has to be careful about.
 */
export const slotForItemIndex = (itemIndex: number, size: number = POOL_SIZE): number =>
  ((itemIndex % size) + size) % size;

export const slotForRole = (
  index: number,
  role: PoolRole,
  size: number = POOL_SIZE,
): number | null => {
  const target = index + ROLE_OFFSET[role];
  return slotForItemIndex(target, size);
};

/** The minimal player surface the pool touches. Real VideoPlayer satisfies it. */
export interface PoolPlayer {
  muted: boolean;
  currentTime: number;
  replace(source: unknown): void;
  play(): void;
  pause(): void;
}

export type SlotPlan = {
  slot: number;
  role: PoolRole | null;
  itemIndex: number | null;
  item: TapeItem | null;
  /** Whether the slot's source has to change. Recomputed from what it holds now. */
  needsReplace: boolean;
};

/**
 * What each slot should hold for a given index. `loadedIds[slot]` is the id of
 * the item that slot currently holds, so a slot that already has the right
 * source is left alone — re-`replace()`ing it would drop the buffer we're
 * preloading for.
 */
export const planPool = (
  index: number,
  items: TapeItem[],
  loadedIds: readonly (string | null)[],
  size: number = POOL_SIZE,
): SlotPlan[] => {
  const plans: SlotPlan[] = [];

  for (let slot = 0; slot < size; slot++) {
    plans.push({ slot, role: null, itemIndex: null, item: null, needsReplace: false });
  }

  const roles: PoolRole[] = ['prev', 'current', 'next'];

  for (const role of roles) {
    const itemIndex = index + ROLE_OFFSET[role];
    if (itemIndex < 0 || itemIndex >= items.length) continue;

    const slot = slotForItemIndex(itemIndex, size);
    const plan = plans[slot];
    if (!plan) continue;

    plan.role = role;
    plan.itemIndex = itemIndex;
    plan.item = items[itemIndex] ?? null;
  }

  for (const plan of plans) {
    // A slot with no role (off the end of the list) keeps whatever it holds. Clearing
    // it would throw away a buffer that stepping back would immediately want again.
    plan.needsReplace = plan.item !== null && (loadedIds[plan.slot] ?? null) !== plan.item.id;
  }

  return plans;
};

const sourceOf = (item: TapeItem | null): unknown =>
  item && item.type === 'video' ? item.source : null;

/**
 * Applies a plan to the pool. Off-screen players are paused, never released
 * (SPEC §4.2) — releasing is what forces a decode on the way back.
 */
export const applyPoolPlan = (
  players: readonly PoolPlayer[],
  plans: readonly SlotPlan[],
  loadedIds: readonly (string | null)[],
  options: { muted: boolean; playing: boolean; restartCurrent: boolean },
): (string | null)[] => {
  const loaded: (string | null)[] = players.map((_, slot) => loadedIds[slot] ?? null);

  for (const plan of plans) {
    const player = players[plan.slot];
    if (!player) continue;

    if (plan.needsReplace) {
      player.replace(sourceOf(plan.item));
      loaded[plan.slot] = plan.item?.id ?? null;
    }

    player.muted = options.muted;

    if (plan.role === 'current') {
      // Stepping back re-uses an already-loaded player that is sitting at its end
      // position, so restart keys off the item changing, not the source changing.
      if (options.restartCurrent) player.currentTime = 0;
      if (options.playing && plan.item?.type === 'video') player.play();
      else player.pause();
    } else {
      player.pause();
    }
  }

  return loaded;
};
