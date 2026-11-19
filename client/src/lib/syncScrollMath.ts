/**
 * Pure mapping maths for sync scroll, kept free of Monaco and the DOM so they
 * can be unit-tested in isolation.
 *
 * An "anchor" is a top-level preview block: its source line (`line`, 1-based)
 * and its pixel offset from the top of the preview's scroll content (`top`).
 * The preview collects these from the `data-source-line` attributes that
 * rehypeSourceLines stamps; the editor side gets line/offset pairs from Monaco.
 */

export interface Anchor {
  /** 1-based source line the block starts on. */
  line: number;
  /** Pixel offset of the block's top from the top of the scroll content. */
  top: number;
}

/** Clamp `value` into [min, max]. `max` below `min` collapses to `min`. */
export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Map a (possibly fractional) editor line to a preview pixel offset, by linear
 * interpolation between the two anchors that bracket it.
 *
 * - Before the first anchor: interpolate from offset 0 at line 1.
 * - After the last anchor: interpolate toward `maxOffset` at the last line
 *   (`lastLine`, the editor's line count), so the very bottom lines still reach
 *   the bottom of the preview.
 * - No anchors: fall back to a proportional position (`line / lastLine`).
 *
 * The result is always clamped to [0, maxOffset].
 */
export function lineToOffset(
  line: number,
  anchors: Anchor[],
  maxOffset: number,
  lastLine: number,
): number {
  if (maxOffset <= 0) return 0;
  if (anchors.length === 0) {
    const frac = lastLine > 1 ? (line - 1) / (lastLine - 1) : 0;
    return clamp(frac * maxOffset, 0, maxOffset);
  }

  // Before the first anchor: from (line 1, offset 0) to the first anchor.
  const first = anchors[0];
  if (line <= first.line) {
    if (first.line <= 1) return clamp(first.top, 0, maxOffset);
    const frac = (line - 1) / (first.line - 1);
    return clamp(frac * first.top, 0, maxOffset);
  }

  // Between two anchors.
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (line >= a.line && line <= b.line) {
      const span = b.line - a.line;
      const frac = span > 0 ? (line - a.line) / span : 0;
      return clamp(a.top + frac * (b.top - a.top), 0, maxOffset);
    }
  }

  // After the last anchor: from the last anchor toward the bottom.
  const last = anchors[anchors.length - 1];
  if (lastLine <= last.line) return clamp(last.top, 0, maxOffset);
  const frac = (line - last.line) / (lastLine - last.line);
  return clamp(last.top + frac * (maxOffset - last.top), 0, maxOffset);
}

/**
 * Inverse of {@link lineToOffset}: map a preview pixel offset back to a
 * (possibly fractional) editor line, interpolating between the bracketing
 * anchors. No anchors falls back to a proportional line.
 */
export function offsetToLine(
  offset: number,
  anchors: Anchor[],
  maxOffset: number,
  lastLine: number,
): number {
  if (anchors.length === 0) {
    if (maxOffset <= 0) return 1;
    const frac = clamp(offset / maxOffset, 0, 1);
    return 1 + frac * Math.max(0, lastLine - 1);
  }

  const first = anchors[0];
  if (offset <= first.top) {
    if (first.top <= 0) return first.line;
    const frac = offset / first.top;
    return clamp(1 + frac * (first.line - 1), 1, first.line);
  }

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (offset >= a.top && offset <= b.top) {
      const span = b.top - a.top;
      const frac = span > 0 ? (offset - a.top) / span : 0;
      return a.line + frac * (b.line - a.line);
    }
  }

  const last = anchors[anchors.length - 1];
  const span = maxOffset - last.top;
  if (span <= 0) return last.line;
  const frac = clamp((offset - last.top) / span, 0, 1);
  return last.line + frac * Math.max(0, lastLine - last.line);
}
