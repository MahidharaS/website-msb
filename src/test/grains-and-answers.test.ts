import { describe, expect, it } from "vitest";
import {
  GRAIN_COUNT,
  dashboardFormation,
  neuralFormation,
  vectorFormation,
} from "@/lib/grain-targets";
import { retrieve } from "@/lib/answer-engine";
import { journeyChapters } from "@/data/content";

describe("grain formations", () => {
  it.each([
    ["dashboard", dashboardFormation],
    ["neural", neuralFormation],
    ["vector", vectorFormation],
  ])("%s fills every grain with finite positions", (_, make) => {
    const f = make();
    for (let i = 0; i < GRAIN_COUNT * 4; i++)
      expect(Number.isFinite(f.data[i])).toBe(true);
    // the last grain must be placed (dust fills the remainder)
    expect(f.data[(GRAIN_COUNT - 1) * 4 + 3]).toBeGreaterThan(0);
  });
  it("has enough anchors for each chapter's labels", () => {
    const counts = {
      dashboard: dashboardFormation().anchors.length,
      neural: neuralFormation().anchors.length,
      vector: vectorFormation().anchors.length,
    };
    expect(counts.dashboard).toBeGreaterThanOrEqual(8);
    expect(counts.neural).toBeGreaterThanOrEqual(
      journeyChapters[1].anchors.length,
    );
    expect(counts.vector).toBeGreaterThanOrEqual(
      journeyChapters[2].anchors.length,
    );
  });
});

describe("offline answer engine", () => {
  it("finds the lead-scoring case", () => {
    expect(retrieve("lead scoring accuracy").map((h) => h.doc.url)).toContain(
      "/work/lead-engine",
    );
  });
  it("returns nothing for unrelated questions", () => {
    expect(retrieve("recipe for biryani")).toHaveLength(0);
  });
});
