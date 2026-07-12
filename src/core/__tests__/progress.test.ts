import {
  clamp01,
  createSeenTracker,
  DRIFT_THRESHOLD_MS,
  driftMs,
  exceedsDrift,
  progressForPlayerTime,
  remainingMs,
  SEEN_AT,
} from '../progress';

describe('clamp01', () => {
  it('clamps to 0..1 and rejects garbage', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(Infinity)).toBe(1);
  });
});

describe('remainingMs', () => {
  it('returns the time left to animate', () => {
    expect(remainingMs(0, 5_000)).toBe(5_000);
    expect(remainingMs(0.25, 5_000)).toBe(3_750);
    expect(remainingMs(1, 5_000)).toBe(0);
  });

  it('never goes negative', () => {
    expect(remainingMs(1.5, 5_000)).toBe(0);
  });
});

describe('drift', () => {
  it('measures the gap between the animation and the player, in ms', () => {
    // Player at 2.0s, animation thinks 40% of 5000ms = 2000ms. No drift.
    expect(driftMs(2, 0.4, 5_000)).toBe(0);
    // Player at 2.5s, animation at 2000ms. 500ms behind.
    expect(driftMs(2.5, 0.4, 5_000)).toBe(500);
  });

  it('only corrects past the threshold', () => {
    // 100ms of drift is under 150ms — leave the animation alone.
    expect(exceedsDrift(2.1, 0.4, 5_000)).toBe(false);
    // 200ms is over.
    expect(exceedsDrift(2.2, 0.4, 5_000)).toBe(true);
    expect(DRIFT_THRESHOLD_MS).toBe(150);
  });

  it('is exclusive at exactly the threshold', () => {
    expect(exceedsDrift(2.15, 0.4, 5_000)).toBe(false);
  });

  it('reports nothing when there is no duration to compare against', () => {
    expect(driftMs(2, 0.4, 0)).toBeNull();
    expect(exceedsDrift(2, 0.4, 0)).toBe(false);
    expect(exceedsDrift(NaN, 0.4, 5_000)).toBe(false);
  });

  it('converts player seconds into a progress value', () => {
    expect(progressForPlayerTime(2.5, 5_000)).toBe(0.5);
    expect(progressForPlayerTime(9, 5_000)).toBe(1);
    expect(progressForPlayerTime(1, 0)).toBe(0);
  });
});

describe('seen tracker', () => {
  it('fires exactly once per item', () => {
    const tracker = createSeenTracker();

    expect(tracker.markSeen('a')).toBe(true);
    expect(tracker.markSeen('a')).toBe(false);
    expect(tracker.markSeen('a')).toBe(false);
  });

  it('tracks items independently', () => {
    const tracker = createSeenTracker();

    expect(tracker.markSeen('a')).toBe(true);
    expect(tracker.markSeen('b')).toBe(true);
    expect(tracker.markSeen('a')).toBe(false);
    expect(tracker.hasSeen('b')).toBe(true);
    expect(tracker.hasSeen('c')).toBe(false);
  });

  it('does not re-fire for an item you scrub back into', () => {
    const tracker = createSeenTracker();
    const fired: string[] = [];

    // Walk forward, then back, then forward again.
    for (const id of ['a', 'b', 'c', 'b', 'a', 'b', 'c']) {
      if (tracker.markSeen(id)) fired.push(id);
    }

    expect(fired).toEqual(['a', 'b', 'c']);
  });

  it('fires at the halfway mark', () => {
    expect(SEEN_AT).toBe(0.5);
  });
});
