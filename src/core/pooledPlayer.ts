import { type PoolPlayer } from './pool';

/** The async slice of expo-video's VideoPlayer that the pool drives. */
export interface AsyncPlayer {
  muted: boolean;
  currentTime: number;
  replaceAsync(source: never): Promise<void>;
  play(): void;
  pause(): void;
}

/**
 * Wraps a VideoPlayer so the pool can stay synchronous while sources load off the
 * main thread. `replace` blocks the UI thread on iOS and is on its way out, so we
 * use `replaceAsync` — which introduces two races this class exists to close:
 *
 *   - a slow load can land *after* a newer one and leave the slot on a stale
 *     source, so every replace takes a token and an outdated one is dropped;
 *   - `play()` issued while a load is still in flight would start the *previous*
 *     asset, so playback and seeks are queued behind the load they belong to.
 *
 * Pausing is applied immediately as well as queued: stopping audio must never
 * wait on a network load.
 */
export class PooledPlayer implements PoolPlayer {
  private queue: Promise<unknown> = Promise.resolve();
  private token = 0;

  constructor(private readonly player: AsyncPlayer) {}

  get muted(): boolean {
    return this.player.muted;
  }

  set muted(value: boolean) {
    this.player.muted = value;
  }

  get currentTime(): number {
    return this.player.currentTime;
  }

  set currentTime(value: number) {
    this.afterLoad(this.token, () => {
      this.player.currentTime = value;
    });
  }

  replace(source: unknown): void {
    const token = ++this.token;
    this.enqueue(async () => {
      if (token !== this.token) return;
      await this.player.replaceAsync(source as never);
    });
  }

  play(): void {
    this.afterLoad(this.token, () => this.player.play());
  }

  pause(): void {
    this.player.pause();
    this.afterLoad(this.token, () => this.player.pause());
  }

  private enqueue(task: () => unknown): void {
    // A failed load must not wedge the queue for every later item.
    this.queue = this.queue.then(task).catch(() => {});
  }

  private afterLoad(token: number, task: () => void): void {
    this.enqueue(() => {
      if (token === this.token) task();
    });
  }
}
