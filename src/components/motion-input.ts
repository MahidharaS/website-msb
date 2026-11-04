// Kept apart from motion-scene so pages can share input state without pulling three.js
// into the initial bundle (the scene itself is lazy-loaded).
import type { Formation } from "@/lib/grain-targets";

export type MotionInput = {
  progress: number;
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pointer: boolean;
  reduced: boolean;
  active: boolean;
  /** projected anchor positions in canvas px: [x0, y0, x1, y1, ...] */
  anchors: Float32Array;
  /** per-anchor visibility 0..1 (back faces of the cube, unrevealed layers) */
  anchorVis: Float32Array;
  anchorCount: number;
  anchorAlpha: number;
  anchorKey: string;
  /** 0..1 intro assembly, written by the scene */
  intro: number;
  /** grains sampled from the live dashboard DOM (desktop) */
  dash: Formation | null;
  dashVersion: number;
  /** true when the DOM dashboard sits inside the pinned stage */
  dashInStage: boolean;
};

export function createMotionInput(): MotionInput {
  return {
    progress: 0,
    x: 0,
    y: 0,
    clientX: -9999,
    clientY: -9999,
    pointer: false,
    reduced: false,
    active: true,
    anchors: new Float32Array(64),
    anchorVis: new Float32Array(32),
    anchorCount: 0,
    anchorAlpha: 0,
    anchorKey: "",
    intro: 0,
    dash: null,
    dashVersion: 0,
    dashInStage: false,
  };
}

export type SceneMode = "journey" | "terrain";
export const JOURNEY_KEYS = ["dashboard", "cube", "graph", "network"] as const;
export type JourneyKey = (typeof JOURNEY_KEYS)[number];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Scroll choreography of the pinned journey, shared by the DOM overlay and the scene.
 * dom: opacity of the live dashboard; grains: opacity of the particles;
 * reveal: how much of the neural network has grown (0..1); chapter: copy to show (0 = dashboard).
 */
export function journeyTimeline(p: number, dashInStage: boolean) {
  const dom = dashInStage ? 1 - smooth(0.1, 0.14, p) : 0;
  const grains = dashInStage ? smooth(0.1, 0.14, p) : 1;
  let from: JourneyKey = "dashboard",
    to: JourneyKey = "dashboard",
    mix = 0;
  if (p < 0.14) mix = 0;
  else if (p < 0.3)
    [from, to, mix] = ["dashboard", "cube", smooth(0.14, 0.3, p)];
  else if (p < 0.46) [from, to, mix] = ["dashboard", "cube", 1];
  else if (p < 0.58) [from, to, mix] = ["cube", "graph", smooth(0.46, 0.58, p)];
  else if (p < 0.7) [from, to, mix] = ["cube", "graph", 1];
  else [from, to, mix] = ["graph", "network", smooth(0.7, 0.8, p)];
  const reveal = 0.12 + smooth(0.78, 0.97, p) * 0.88;
  const chapter = p < 0.2 ? 0 : p < 0.52 ? 1 : p < 0.74 ? 2 : 3;
  return { dom, grains, from, to, mix, reveal, chapter };
}
