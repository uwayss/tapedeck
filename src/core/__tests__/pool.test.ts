import { applyPoolPlan, planPool, POOL_SIZE, slotForItemIndex, type PoolPlayer } from '../pool';
import { type TapeItem } from '../types';

class FakePlayer implements PoolPlayer {
  muted = false;
  currentTime = 0;
  playing = false;
  source: unknown = null;
  replaceCount = 0;
  released = false;

  replace(source: unknown) {
    this.source = source;
    this.currentTime = 0;
    this.replaceCount++;
  }
  play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }
}

const makeItems = (n: number): TapeItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `item-${i}`,
    type: 'video' as const,
    source: `https://example.com/${i}.mp4`,
  }));

/** Drives the pool the way the hook does: plan, apply, remember what got loaded. */
class Harness {
  players = [new FakePlayer(), new FakePlayer(), new FakePlayer()];
  loaded: (string | null)[] = [null, null, null];
  lastCurrentId: string | null = null;

  constructor(private items: TapeItem[]) {}

  goTo(index: number, opts: { muted?: boolean; playing?: boolean } = {}) {
    const plans = planPool(index, this.items, this.loaded);
    const currentId = this.items[index]?.id ?? null;
    this.loaded = applyPoolPlan(this.players, plans, this.loaded, {
      muted: opts.muted ?? false,
      playing: opts.playing ?? true,
      restartCurrent: currentId !== this.lastCurrentId,
    });
    this.lastCurrentId = currentId;
    return plans;
  }

  /** The player holding the item at `index`, whatever slot that lands on. */
  playerFor(index: number): FakePlayer {
    const player = this.players[slotForItemIndex(index)];
    if (!player) throw new Error(`no player for index ${index}`);
    return player;
  }

  sourceFor(index: number): unknown {
    return this.playerFor(index).source;
  }

  totalReplaces(): number {
    return this.players.reduce((sum, p) => sum + p.replaceCount, 0);
  }
}

const uri = (i: number) => `https://example.com/${i}.mp4`;

describe('slotForItemIndex', () => {
  it('maps items onto three slots, cycling', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => slotForItemIndex(i))).toEqual([0, 1, 2, 0, 1, 2, 0]);
  });

  it('handles a negative index without producing a negative slot', () => {
    expect(slotForItemIndex(-1)).toBe(2);
  });
});

describe('planPool', () => {
  it('assigns prev/current/next to distinct slots', () => {
    const plans = planPool(3, makeItems(6), [null, null, null]);
    const roles = plans.map((p) => p.role);

    expect(new Set(roles.filter(Boolean)).size).toBe(3);
    expect(plans.find((p) => p.role === 'current')?.itemIndex).toBe(3);
    expect(plans.find((p) => p.role === 'prev')?.itemIndex).toBe(2);
    expect(plans.find((p) => p.role === 'next')?.itemIndex).toBe(4);
  });

  it('leaves prev empty at the start and next empty at the end', () => {
    const items = makeItems(3);

    const atStart = planPool(0, items, [null, null, null]);
    expect(atStart.find((p) => p.role === 'prev')).toBeUndefined();
    expect(atStart.find((p) => p.role === 'current')?.itemIndex).toBe(0);

    const atEnd = planPool(2, items, [null, null, null]);
    expect(atEnd.find((p) => p.role === 'next')).toBeUndefined();
    expect(atEnd.find((p) => p.role === 'prev')?.itemIndex).toBe(1);
  });

  it('does not replace a slot that already holds the right item', () => {
    const items = makeItems(5);
    const first = planPool(1, items, [null, null, null]);
    expect(first.every((p) => p.needsReplace)).toBe(true);

    const loaded = ['item-0', 'item-1', 'item-2'];
    const second = planPool(1, items, loaded);
    expect(second.some((p) => p.needsReplace)).toBe(false);
  });
});

describe('pool rotation', () => {
  it('hands the next player straight to current on advance — no reload', () => {
    const h = new Harness(makeItems(5));
    h.goTo(0);

    const preloadedNext = h.playerFor(1);
    const replacesBefore = preloadedNext.replaceCount;

    h.goTo(1);

    // The player that was preloading item 1 is now current, and was never reloaded.
    expect(h.playerFor(1)).toBe(preloadedNext);
    expect(preloadedNext.replaceCount).toBe(replacesBefore);
    expect(preloadedNext.source).toBe(uri(1));
    expect(preloadedNext.playing).toBe(true);
  });

  it('keeps exactly one player playing and pauses the rest', () => {
    const h = new Harness(makeItems(5));
    h.goTo(2);

    expect(h.players.filter((p) => p.playing)).toHaveLength(1);
    expect(h.playerFor(2).playing).toBe(true);
  });

  it('holds prev/current/next after a walk forward and back', () => {
    const h = new Harness(makeItems(6));

    h.goTo(0);
    h.goTo(1);
    h.goTo(2);
    h.goTo(3);

    expect(h.sourceFor(3)).toBe(uri(3));
    expect(h.sourceFor(2)).toBe(uri(2));
    expect(h.sourceFor(4)).toBe(uri(4));

    h.goTo(2);
    expect(h.sourceFor(2)).toBe(uri(2));
    expect(h.sourceFor(1)).toBe(uri(1));
    expect(h.sourceFor(3)).toBe(uri(3));
  });

  it('restarts an item you step back into', () => {
    const h = new Harness(makeItems(5));
    h.goTo(0);
    h.goTo(1);

    // Item 0's player is still loaded, sitting where it was left.
    const prevPlayer = h.playerFor(0);
    prevPlayer.currentTime = 4.2;
    expect(prevPlayer.replaceCount).toBe(1);

    h.goTo(0);

    expect(h.playerFor(0)).toBe(prevPlayer);
    expect(prevPlayer.currentTime).toBe(0);
    expect(prevPlayer.playing).toBe(true);
    // Restarted by seeking, not by reloading the source.
    expect(prevPlayer.replaceCount).toBe(1);
  });

  it('never creates or releases a player — the same three serve the whole list', () => {
    const items = makeItems(12);
    const h = new Harness(items);
    const identities = [...h.players];

    for (let i = 0; i < items.length; i++) h.goTo(i);
    for (let i = items.length - 1; i >= 0; i--) h.goTo(i);

    expect(h.players).toEqual(identities);
    expect(h.players.every((p) => !p.released)).toBe(true);
    expect(h.players).toHaveLength(POOL_SIZE);
  });

  it('loads each item exactly once on a straight pass through the list', () => {
    const items = makeItems(9);
    const h = new Harness(items);

    for (let i = 0; i < items.length; i++) h.goTo(i);

    // 9 items over 3 slots, each loaded once and never reloaded.
    expect(h.totalReplaces()).toBe(items.length);
  });

  it('keeps a trailing item buffered at the end of the list so stepping back is free', () => {
    const items = makeItems(4);
    const h = new Harness(items);

    for (let i = 0; i < items.length; i++) h.goTo(i);
    const replacesAtEnd = h.totalReplaces();

    // At the last item there is no `next`, so that slot keeps item 2 rather than
    // being cleared — walking back to it must not reload anything.
    h.goTo(2);
    expect(h.totalReplaces()).toBe(replacesAtEnd);
    expect(h.sourceFor(2)).toBe(uri(2));
  });

  it('applies mute to every player, not just the audible one', () => {
    const h = new Harness(makeItems(5));
    h.goTo(1, { muted: true });

    expect(h.players.every((p) => p.muted)).toBe(true);
  });

  it('pauses the current player when not playing', () => {
    const h = new Harness(makeItems(5));
    h.goTo(1, { playing: false });

    expect(h.players.some((p) => p.playing)).toBe(false);
  });

  it('survives a list shorter than the pool', () => {
    const h = new Harness(makeItems(2));
    h.goTo(0);

    expect(h.sourceFor(0)).toBe(uri(0));
    expect(h.sourceFor(1)).toBe(uri(1));
    // The third slot has no item to hold.
    expect(h.players[2]?.source).toBeNull();

    h.goTo(1);
    expect(h.playerFor(1).playing).toBe(true);
  });
});
