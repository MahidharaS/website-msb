import { describe, expect, it } from "vitest";
import {
  GRAIN_COUNT,
  cubeFormation,
  dashboardFormation,
  graphFormation,
  networkFormation,
} from "@/lib/grain-targets";
import { journeyTimeline } from "@/components/motion-input";
import { retrieve } from "@/lib/answer-engine";
import { journeyChapters } from "@/data/content";

describe("grain formations", () => {
  it.each([
    ["dashboard", dashboardFormation],
    ["cube", cubeFormation],
    ["graph", graphFormation],
    ["network", networkFormation],
  ])("%s fills every grain with finite positions", (_, make) => {
    const f = make();
    for (let i = 0; i < GRAIN_COUNT * 4; i++)
      expect(Number.isFinite(f.data[i])).toBe(true);
    expect(f.data[(GRAIN_COUNT - 1) * 4 + 3]).toBeGreaterThan(0);
  });
  it("has an anchor for every chapter label", () => {
    expect(cubeFormation().anchors.length).toBe(
      journeyChapters[0].anchors.length,
    );
    expect(graphFormation().anchors.length).toBe(
      journeyChapters[1].anchors.length,
    );
    expect(networkFormation().anchors.length).toBe(
      journeyChapters[2].anchors.length,
    );
  });
});

describe("journey timeline", () => {
  it("holds the live dashboard first, then hands over to grains", () => {
    expect(journeyTimeline(0.02, true)).toMatchObject({
      dom: 1,
      grains: 0,
      chapter: 0,
    });
    expect(journeyTimeline(0.4, true)).toMatchObject({
      dom: 0,
      grains: 1,
      to: "cube",
      mix: 1,
    });
    expect(journeyTimeline(1, true)).toMatchObject({
      to: "network",
      mix: 1,
      reveal: 1,
    });
  });
  it("shows grains from the start when the dashboard is not pinned", () => {
    expect(journeyTimeline(0, false)).toMatchObject({ dom: 0, grains: 1 });
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
