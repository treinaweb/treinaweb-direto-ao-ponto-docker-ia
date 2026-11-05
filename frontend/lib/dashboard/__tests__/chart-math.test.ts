import { describe, expect, it } from "vitest";
import { donutSegments, fractions, proportions, sum } from "@/lib/dashboard/chart-math";

describe("chart-math", () => {
  it("soma e frações", () => {
    expect(sum([5, 3, 2])).toBe(10);
    expect(fractions([5, 3, 2])).toEqual([0.5, 0.3, 0.2]);
  });

  it("total zero → frações e proporções zeradas (sem NaN)", () => {
    expect(fractions([0, 0, 0])).toEqual([0, 0, 0]);
    expect(proportions([0, 0])).toEqual([0, 0]);
    expect(donutSegments([0, 0], 100)).toEqual([
      { length: 0, offset: 0 },
      { length: 0, offset: 0 },
    ]);
  });

  it("proporção relativa ao maior valor", () => {
    expect(proportions([1, 2, 0, 4])).toEqual([0.25, 0.5, 0, 1]);
  });

  it("fatia única ocupa o anel inteiro", () => {
    expect(donutSegments([0, 7, 0], 100)).toEqual([
      { length: 0, offset: 0 },
      { length: 100, offset: 0 },
      { length: 0, offset: 100 },
    ]);
  });

  it("fatias acumulam o deslocamento e fecham a circunferência", () => {
    const segments = donutSegments([5, 3, 2], 200);
    expect(segments).toEqual([
      { length: 100, offset: 0 },
      { length: 60, offset: 100 },
      { length: 40, offset: 160 },
    ]);
    const last = segments.at(-1)!;
    expect(last.offset + last.length).toBe(200);
  });
});
