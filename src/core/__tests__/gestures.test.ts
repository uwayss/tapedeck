import {
  DEFAULT_DISMISS_THRESHOLD,
  DEFAULT_TAP_ZONES,
  DISMISS_VELOCITY,
  resolveTapZone,
  rubberBand,
  scaleForDismiss,
  shouldDismiss,
} from '../gestures';

describe('resolveTapZone', () => {
  const width = 400;

  it('sends the left band back and the right band forward', () => {
    expect(resolveTapZone(10, width, DEFAULT_TAP_ZONES)).toBe('prev');
    expect(resolveTapZone(390, width, DEFAULT_TAP_ZONES)).toBe('next');
  });

  it('ignores the middle, so a mis-aimed tap skips nothing', () => {
    expect(resolveTapZone(200, width, DEFAULT_TAP_ZONES)).toBeNull();
  });

  it('treats the band edges as inclusive', () => {
    // left: 0.3 → 120px, right: 0.7 → 280px
    expect(resolveTapZone(120, width, DEFAULT_TAP_ZONES)).toBe('prev');
    expect(resolveTapZone(121, width, DEFAULT_TAP_ZONES)).toBeNull();
    expect(resolveTapZone(280, width, DEFAULT_TAP_ZONES)).toBe('next');
    expect(resolveTapZone(279, width, DEFAULT_TAP_ZONES)).toBeNull();
  });

  it('honours custom zones', () => {
    const zones = { left: 0.5, right: 0.5 };
    expect(resolveTapZone(199, width, zones)).toBe('prev');
    expect(resolveTapZone(201, width, zones)).toBe('next');
  });

  it('does nothing before layout has reported a width', () => {
    expect(resolveTapZone(10, 0, DEFAULT_TAP_ZONES)).toBeNull();
  });
});

describe('rubberBand', () => {
  it('follows the finger downward', () => {
    expect(rubberBand(100)).toBe(100);
    expect(rubberBand(0)).toBe(0);
  });

  it('resists upward, since there is nothing up there', () => {
    expect(rubberBand(-100)).toBe(-20);
  });
});

describe('scaleForDismiss', () => {
  it('shrinks as the deck is dragged down', () => {
    expect(scaleForDismiss(0, 800)).toBe(1);
    expect(scaleForDismiss(400, 800)).toBe(0.9);
    expect(scaleForDismiss(800, 800)).toBe(0.8);
  });

  it('does not shrink past the floor or grow on an upward drag', () => {
    expect(scaleForDismiss(1600, 800)).toBe(0.8);
    expect(scaleForDismiss(-100, 800)).toBe(1);
    expect(scaleForDismiss(100, 0)).toBe(1);
  });
});

describe('shouldDismiss', () => {
  const dismiss = (
    translationY: number,
    velocityY: number,
    threshold = DEFAULT_DISMISS_THRESHOLD,
  ) => shouldDismiss(translationY, velocityY, threshold, DISMISS_VELOCITY);

  it('dismisses past the distance threshold', () => {
    expect(dismiss(DEFAULT_DISMISS_THRESHOLD + 1, 0)).toBe(true);
    expect(dismiss(DEFAULT_DISMISS_THRESHOLD, 0)).toBe(false);
    expect(dismiss(20, 0)).toBe(false);
  });

  it('dismisses on a fast flick that never travelled far', () => {
    expect(dismiss(20, 1200)).toBe(true);
    expect(dismiss(20, 200)).toBe(false);
  });

  it('never dismisses on an upward drag, however fast', () => {
    expect(dismiss(-200, 5000)).toBe(false);
  });

  it('honours a custom threshold', () => {
    expect(dismiss(60, 0, 50)).toBe(true);
    expect(dismiss(60, 0, 300)).toBe(false);
  });

  it('takes both thresholds explicitly, never from a default parameter', () => {
    // Regression: the worklet plugin does not capture identifiers used in default
    // parameter values, so a defaulted module constant is undefined on the UI thread
    // and the gesture throws mid-swipe. Every threshold must be an explicit argument.
    expect(shouldDismiss).toHaveLength(4);
  });
});
