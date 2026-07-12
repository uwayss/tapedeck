import { DEFAULT_DURATION, resolveDuration } from '../duration';
import { type TapeItem } from '../types';

const video = (duration?: number): TapeItem => ({
  id: 'v',
  type: 'video',
  source: 'https://example.com/v.mp4',
  ...(duration === undefined ? {} : { duration }),
});

const image = (duration?: number): TapeItem => ({
  id: 'i',
  type: 'image',
  source: 'https://example.com/i.jpg',
  ...(duration === undefined ? {} : { duration }),
});

describe('resolveDuration', () => {
  it('prefers the item declared duration over everything', () => {
    expect(resolveDuration(video(2_000), 30, 7_000)).toBe(2_000);
    expect(resolveDuration(image(1_500), null, 7_000)).toBe(1_500);
  });

  it('falls back to the player duration, converting seconds to ms', () => {
    expect(resolveDuration(video(), 12.5, 7_000)).toBe(12_500);
  });

  it('falls back to defaultDuration when the player knows nothing yet', () => {
    expect(resolveDuration(video(), 0, 7_000)).toBe(7_000);
    expect(resolveDuration(video(), null, 7_000)).toBe(7_000);
    expect(resolveDuration(video(), undefined, 7_000)).toBe(7_000);
  });

  it('never lets a player duration drive an image item', () => {
    expect(resolveDuration(image(), 30, 7_000)).toBe(7_000);
  });

  it('uses 5s when no defaultDuration is supplied', () => {
    expect(resolveDuration(video(), null)).toBe(DEFAULT_DURATION);
    expect(DEFAULT_DURATION).toBe(5_000);
  });

  it('ignores garbage durations', () => {
    expect(resolveDuration(video(0), null, 7_000)).toBe(7_000);
    expect(resolveDuration(video(-5), null, 7_000)).toBe(7_000);
    expect(resolveDuration(video(), Infinity, 7_000)).toBe(7_000);
    expect(resolveDuration(video(), NaN, 7_000)).toBe(7_000);
    expect(resolveDuration(undefined, null, 7_000)).toBe(7_000);
  });
});
