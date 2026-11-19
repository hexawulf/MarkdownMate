import { describe, expect, it } from "vitest";
import { clamp, lineToOffset, offsetToLine, type Anchor } from "./syncScrollMath";

describe("clamp", () => {
  it.each([
    [5, 0, 10, 5],
    [-3, 0, 10, 0],
    [20, 0, 10, 10],
    [5, 10, 0, 10], // max < min collapses to min
  ])("clamp(%i, %i, %i) = %i", (v, min, max, expected) => {
    expect(clamp(v, min, max)).toBe(expected);
  });
});

// A simple anchor list: line 1 -> 0px, line 10 -> 100px, line 20 -> 400px.
const ANCHORS: Anchor[] = [
  { line: 1, top: 0 },
  { line: 10, top: 100 },
  { line: 20, top: 400 },
];
const MAX = 500;
const LAST = 30;

describe("lineToOffset", () => {
  it.each([
    // line, expected offset
    [1, 0], // first anchor
    [10, 100], // exact anchor
    [20, 400], // exact anchor
    [5, (4 / 9) * 100], // between line 1 and 10
    [15, 100 + (5 / 10) * 300], // between line 10 and 20 -> 250
  ])("maps line %f to offset %f", (line, expected) => {
    expect(lineToOffset(line, ANCHORS, MAX, LAST)).toBeCloseTo(expected, 5);
  });

  it("interpolates past the last anchor toward maxOffset", () => {
    // line 25 is halfway from the last anchor (line 20, 400) to last line 30.
    // offset: 400 + 0.5 * (500 - 400) = 450.
    expect(lineToOffset(25, ANCHORS, MAX, LAST)).toBeCloseTo(450, 5);
    expect(lineToOffset(30, ANCHORS, MAX, LAST)).toBeCloseTo(500, 5);
  });

  it("clamps out-of-range lines", () => {
    expect(lineToOffset(-5, ANCHORS, MAX, LAST)).toBe(0);
    expect(lineToOffset(999, ANCHORS, MAX, LAST)).toBe(MAX);
  });

  it("returns 0 when there is nowhere to scroll", () => {
    expect(lineToOffset(10, ANCHORS, 0, LAST)).toBe(0);
  });

  it("falls back to a proportional offset with no anchors", () => {
    // line 1 -> 0, last line -> max, linear in between.
    expect(lineToOffset(1, [], MAX, LAST)).toBe(0);
    expect(lineToOffset(LAST, [], MAX, LAST)).toBe(MAX);
    expect(lineToOffset((1 + LAST) / 2, [], MAX, LAST)).toBeCloseTo(MAX / 2, 5);
  });

  it("handles a single anchor at line 1", () => {
    const one: Anchor[] = [{ line: 1, top: 0 }];
    expect(lineToOffset(1, one, MAX, LAST)).toBe(0);
    expect(lineToOffset(LAST, one, MAX, LAST)).toBeCloseTo(MAX, 5);
  });
});

describe("offsetToLine", () => {
  it.each([
    [0, 1],
    [100, 10],
    [400, 20],
    [50, 1 + (50 / 100) * 9], // halfway to first anchor -> line 5.5
    [250, 15], // halfway between line 10 and 20
  ])("maps offset %f to line %f", (offset, expected) => {
    expect(offsetToLine(offset, ANCHORS, MAX, LAST)).toBeCloseTo(expected, 5);
  });

  it("interpolates past the last anchor toward the last line", () => {
    // offset 450 is halfway from last anchor (400) to max (500) -> line 25.
    expect(offsetToLine(450, ANCHORS, MAX, LAST)).toBeCloseTo(25, 5);
    expect(offsetToLine(500, ANCHORS, MAX, LAST)).toBeCloseTo(30, 5);
  });

  it("falls back to a proportional line with no anchors", () => {
    expect(offsetToLine(0, [], MAX, LAST)).toBe(1);
    expect(offsetToLine(MAX, [], MAX, LAST)).toBe(LAST);
    expect(offsetToLine(MAX / 2, [], MAX, LAST)).toBeCloseTo((1 + LAST) / 2, 5);
  });

  it("returns line 1 for a non-scrollable preview with no anchors", () => {
    expect(offsetToLine(0, [], 0, LAST)).toBe(1);
  });
});

describe("round trip", () => {
  it("line -> offset -> line is close to identity between anchors", () => {
    for (const line of [2, 5, 8, 12, 16, 19]) {
      const off = lineToOffset(line, ANCHORS, MAX, LAST);
      const back = offsetToLine(off, ANCHORS, MAX, LAST);
      expect(back).toBeCloseTo(line, 4);
    }
  });
});
