// Kept apart from motion-scene so pages can share input state without pulling three.js
// into the initial bundle (the scene itself is lazy-loaded).
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
  anchorCount: number;
  anchorAlpha: number;
  anchorKey: string;
  /** 0..1 intro assembly, written by the scene */
  intro: number;
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
    anchorCount: 0,
    anchorAlpha: 0,
    anchorKey: "",
    intro: 0,
  };
}

export type SceneMode = "hero" | "journey" | "terrain";
