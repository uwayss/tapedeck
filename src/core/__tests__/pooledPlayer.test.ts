import { PooledPlayer, type AsyncPlayer } from '../pooledPlayer';

/** A player whose loads resolve only when the test says so. */
class FakeAsyncPlayer implements AsyncPlayer {
  muted = false;
  currentTime = 0;
  playing = false;
  source: unknown = null;

  private pending: { source: unknown; resolve: () => void }[] = [];

  replaceAsync(source: never): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pending.push({
        source,
        resolve: () => {
          this.source = source;
          this.currentTime = 0;
          resolve();
        },
      });
    });
  }

  play() {
    this.playing = true;
  }
  pause() {
    this.playing = false;
  }

  get inFlight() {
    return this.pending.length;
  }

  /** Resolve the oldest outstanding load. */
  async settleNext() {
    const next = this.pending.shift();
    next?.resolve();
    await flush();
  }

  /** Let the queue issue its loads, then resolve them all. */
  async settleAll() {
    await flush();
    while (this.pending.length) {
      await this.settleNext();
      await flush();
    }
  }
}

/** Let queued microtasks run. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('PooledPlayer', () => {
  it('loads a source asynchronously', async () => {
    const raw = new FakeAsyncPlayer();
    const player = new PooledPlayer(raw);

    player.replace('a.mp4');
    await flush();
    expect(raw.inFlight).toBe(1);

    await raw.settleAll();
    expect(raw.source).toBe('a.mp4');
  });

  it('does not start playback until the source it belongs to has loaded', async () => {
    const raw = new FakeAsyncPlayer();
    const player = new PooledPlayer(raw);

    player.replace('a.mp4');
    player.play();
    await flush();

    // Playing here would play whatever the slot held before.
    expect(raw.playing).toBe(false);

    await raw.settleAll();
    expect(raw.playing).toBe(true);
    expect(raw.source).toBe('a.mp4');
  });

  it('drops a superseded load rather than letting it land last', async () => {
    const raw = new FakeAsyncPlayer();
    const player = new PooledPlayer(raw);

    player.replace('slow.mp4');
    player.replace('wanted.mp4');
    await raw.settleAll();

    // The first load is abandoned, so it can never overwrite the newer one.
    expect(raw.source).toBe('wanted.mp4');
  });

  it('ignores a seek and a play belonging to a superseded load', async () => {
    const raw = new FakeAsyncPlayer();
    const player = new PooledPlayer(raw);

    player.replace('stale.mp4');
    player.currentTime = 9;
    player.play();

    player.replace('wanted.mp4');
    await raw.settleAll();

    expect(raw.source).toBe('wanted.mp4');
    expect(raw.playing).toBe(false);
    expect(raw.currentTime).toBe(0);
  });

  it('pauses immediately without waiting on a load', async () => {
    const raw = new FakeAsyncPlayer();
    const player = new PooledPlayer(raw);
    raw.playing = true;

    player.replace('a.mp4');
    player.pause();

    // Audio must stop now, not after the network settles.
    expect(raw.playing).toBe(false);

    await raw.settleAll();
    expect(raw.playing).toBe(false);
  });

  it('applies mute straight through', () => {
    const raw = new FakeAsyncPlayer();
    const player = new PooledPlayer(raw);

    player.muted = true;
    expect(raw.muted).toBe(true);
    expect(player.muted).toBe(true);
  });

  it('keeps serving later items after a load fails', async () => {
    const raw = new FakeAsyncPlayer();
    const failing: AsyncPlayer = {
      ...raw,
      replaceAsync: jest.fn().mockRejectedValueOnce(new Error('network')),
      play: () => {},
      pause: () => {},
    };
    const player = new PooledPlayer(failing);

    player.replace('broken.mp4');
    await flush();

    // A rejected load must not wedge the queue forever.
    failing.replaceAsync = jest.fn().mockResolvedValue(undefined);
    player.replace('good.mp4');
    await flush();

    expect(failing.replaceAsync).toHaveBeenCalledWith('good.mp4');
  });
});
