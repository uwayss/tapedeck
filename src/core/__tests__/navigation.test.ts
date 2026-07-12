import { clampIndex, nextIndex, prevIndex } from '../navigation';

describe('clampIndex', () => {
  it('clamps at both ends', () => {
    expect(clampIndex(-3, 5)).toBe(0);
    expect(clampIndex(0, 5)).toBe(0);
    expect(clampIndex(2, 5)).toBe(2);
    expect(clampIndex(4, 5)).toBe(4);
    expect(clampIndex(9, 5)).toBe(4);
  });

  it('survives an empty list', () => {
    expect(clampIndex(0, 0)).toBe(0);
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe('nextIndex', () => {
  it('advances until the end, then reports off-the-end', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(1, 3)).toBe(2);
    expect(nextIndex(2, 3)).toBeNull();
  });

  it('reports off-the-end for a single item', () => {
    expect(nextIndex(0, 1)).toBeNull();
  });
});

describe('prevIndex', () => {
  it('goes back until zero, then reports off-the-start', () => {
    expect(prevIndex(2)).toBe(1);
    expect(prevIndex(1)).toBe(0);
    expect(prevIndex(0)).toBeNull();
  });
});
