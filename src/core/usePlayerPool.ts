import { useEffect, useMemo, useRef } from 'react';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';

import { applyPoolPlan, planPool, POOL_SIZE } from './pool';
import { PooledPlayer } from './pooledPlayer';
import { type TapeItem } from './types';

const setup = (player: VideoPlayer) => {
  player.loop = false;
};

interface PoolOptions {
  items: TapeItem[];
  index: number;
  muted: boolean;
  playing: boolean;
}

/**
 * Three players for the whole session. `useVideoPlayer` is used rather than
 * `createVideoPlayer` so React owns the lifetime — a hand-rolled pool has to get
 * release() right under StrictMode double-invocation, and getting it wrong leaks
 * a native decoder. The count is fixed at three, so a fixed number of hooks is
 * not a constraint.
 */
export const usePlayerPool = ({ items, index, muted, playing }: PoolOptions): VideoPlayer[] => {
  const first = useVideoPlayer(null, setup);
  const second = useVideoPlayer(null, setup);
  const third = useVideoPlayer(null, setup);

  const players = useMemo(() => [first, second, third], [first, second, third]);

  // The pool drives players through an adapter that serialises async source loads;
  // the raw players still go to context, since the engine needs status/duration.
  const pooled = useMemo(() => players.map((player) => new PooledPlayer(player)), [players]);

  const loadedRef = useRef<(string | null)[]>(new Array<string | null>(POOL_SIZE).fill(null));
  const lastCurrentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = items[index]?.id ?? null;
    const plans = planPool(index, items, loadedRef.current);

    loadedRef.current = applyPoolPlan(pooled, plans, loadedRef.current, {
      muted,
      playing,
      restartCurrent: currentId !== lastCurrentIdRef.current,
    });

    lastCurrentIdRef.current = currentId;
  }, [index, items, pooled, muted, playing]);

  return players;
};
