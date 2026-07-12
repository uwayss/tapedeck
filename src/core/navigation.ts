export const clampIndex = (index: number, count: number): number => {
  if (count <= 0) return 0;
  if (index < 0) return 0;
  if (index > count - 1) return count - 1;
  return index;
};

/** `null` means "ran off the end" — the caller fires onComplete rather than clamping. */
export const nextIndex = (index: number, count: number): number | null =>
  index >= count - 1 ? null : index + 1;

/** `null` means "ran off the start" — the caller fires onPrevThread rather than clamping. */
export const prevIndex = (index: number): number | null => (index <= 0 ? null : index - 1);
