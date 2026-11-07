import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import {
  CUBE_GAP,
  CUBIE,
  GRAIN_COUNT,
  NETWORK_DX,
  NETWORK_LAYERS,
  NETWORK_X0,
  TEX_H,
  TEX_W,
  cloudFormation,
  cubeFormation,
  dashboardFormation,
  graphFormation,
  loadImageFormation,
  networkFormation,
  type Formation,
} from "@/lib/grain-targets";
import {
  journeyTimeline,
  type MotionInput,
  type SceneMode,
} from "./motion-input";

export type { MotionInput, SceneMode };

const vertex = /* glsl */ `
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform sampler2D uFromCol;
  uniform sampler2D uToCol;
  uniform float uMix;
  uniform float uTime;
  uniform float uAlpha;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uPulse;
  uniform vec3 uPointer;
  uniform vec3 uPointerVel;
  uniform float uPointerStrength;
  uniform float uRadius;
  // Rubik twist: which side of the mix is the cube (0 none, 1 from, 2 to)
  uniform float uCubeSide;
  uniform float uTwistAxis;
  uniform float uTwistLayer;
  uniform float uTwistAngle;
  uniform float uCubeStep;
  // network growth: which side is the network, and the x of the growth frontier
  uniform float uNetSide;
  uniform float uRevealX;
  attribute vec2 aRef;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 flow(vec3 p, float s) {
    return vec3(
      sin(p.y * 1.7 + s * 91.7 + uTime * 0.31) + cos(p.z * 1.3 + s * 13.1),
      cos(p.x * 1.5 + s * 53.1 - uTime * 0.27) + sin(p.z * 1.9 + s * 7.7),
      sin(p.x * 1.1 + p.y * 1.3 + s * 27.3 + uTime * 0.21)
    ) * 0.5;
  }
  vec3 twist(vec3 p) {
    float coord = uTwistAxis < 0.5 ? p.x : uTwistAxis < 1.5 ? p.y : p.z;
    float layer = clamp(floor(coord / uCubeStep + 0.5), -1.0, 1.0);
    if (abs(layer - uTwistLayer) > 0.5) return p;
    float c = cos(uTwistAngle), s = sin(uTwistAngle);
    if (uTwistAxis < 0.5) return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
    if (uTwistAxis < 1.5) return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
    return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
  }
  // returns hidden amount and moves not-yet-grown network grains onto the frontier
  float grow(inout vec3 p) {
    float hide = smoothstep(uRevealX - 0.12, uRevealX + 0.3, p.x);
    p = mix(p, vec3(uRevealX, p.y * 0.25, p.z * 0.25), hide);
    return hide;
  }

  void main() {
    vec4 a = texture2D(uFrom, aRef);
    vec4 b = texture2D(uTo, aRef);
    vec3 A = a.xyz, B = b.xyz;
    float hidden = 0.0;
    if (uCubeSide > 1.5) B = twist(B); else if (uCubeSide > 0.5) A = twist(A);
    float lag = aSeed * 0.38 + clamp((A.x + 3.5) / 7.0, 0.0, 1.0) * 0.17;
    float t = smoothstep(lag, lag + 0.45, uMix);
    if (uNetSide > 1.5) hidden = grow(B) * t; else if (uNetSide > 0.5) hidden = grow(A) * (1.0 - t);
    float burst = sin(3.14159265 * t);
    vec3 pos = mix(A, B, t);
    vec3 dir = flow(pos, aSeed);
    // scatter mid-flight, then reassemble
    pos += dir * burst * (0.9 + aSeed * 2.2);
    pos.z += burst * (aSeed - 0.5) * 2.5;
    // breathing at rest
    pos += dir * 0.014 * sin(uTime * 1.1 + aSeed * 40.0);

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vec2 d = world.xy - uPointer.xy;
    float f = smoothstep(uRadius, 0.0, length(d)) * uPointerStrength;
    world.xy += normalize(d + 1e-4) * f * (0.55 + aSeed * 0.9);
    world.z += f * (aSeed - 0.3) * 1.6;
    world.xyz += uPointerVel * f * (0.5 + aSeed);

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    // a share of grains vanishes mid-transition so frames dissolve rather than slide
    float vanish = burst * step(0.42, fract(aSeed * 7.13));
    vec3 col = mix(texture2D(uFromCol, aRef).rgb, texture2D(uToCol, aRef).rgb, t);
    float wave = smoothstep(0.08, 0.0, abs(fract(pos.x * 0.18 - uTime * 0.32 + aSeed * 0.04) - 0.5));
    col += uPulse * wave * vec3(0.5, 0.6, 0.15);
    col = mix(col, vec3(0.78, 0.96, 0.2), clamp(f * 0.85, 0.0, 0.85));
    vColor = col;
    vAlpha = (1.0 - vanish * 0.96) * (1.0 - hidden * 0.97) * uAlpha;
    float size = uSize * (0.55 + fract(aSeed * 13.7) * 0.95) * (1.0 + f * 0.8 + burst * 0.4) * (1.0 - vanish * 0.6);
    gl_PointSize = size * uPixelRatio / max(0.5, -mv.z);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.18, d) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

type FormationTextures = { pos: THREE.DataTexture; col: THREE.DataTexture };

// Positions in a float texture; colours in a separate 8-bit texture so no GPU has to unpack
// 24-bit integers from a float (some drivers sample float textures at half precision).
function toTextures(f: Formation): FormationTextures {
  const col = new Uint8Array(TEX_W * TEX_H * 4);
  for (let i = 0; i < TEX_W * TEX_H; i++) {
    const v = Math.round(f.data[i * 4 + 3] ?? 0);
    col[i * 4] = (v >> 16) & 255;
    col[i * 4 + 1] = (v >> 8) & 255;
    col[i * 4 + 2] = v & 255;
    col[i * 4 + 3] = 255;
  }
  const make = (
    data: Float32Array | Uint8Array,
    type: THREE.TextureDataType,
  ) => {
    const t = new THREE.DataTexture(data, TEX_W, TEX_H, THREE.RGBAFormat, type);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  };
  return {
    pos: make(f.data, THREE.FloatType),
    col: make(col, THREE.UnsignedByteType),
  };
}

function useFormations(mode: SceneMode) {
  const procedural = useMemo<Record<string, Formation>>(() => {
    const cloud = cloudFormation();
    if (mode !== "journey") return { cloud };
    return {
      cloud,
      dashboard: dashboardFormation(),
      cube: cubeFormation(),
      graph: graphFormation(),
      network: networkFormation(),
    };
  }, [mode]);
  const [images, setImages] = useState<Record<string, Formation>>({});
  useEffect(() => {
    if (mode !== "terrain") return;
    let alive = true;
    loadImageFormation("/grains/mountains.bin", {
      tint: [0.95, 0.94, 0.92],
      tintAmount: 0.3,
      gain: 2.2,
    })
      .then((f) => alive && setImages({ mountains: f }))
      .catch((e) => console.warn("grain data", e));
    return () => {
      alive = false;
    };
  }, [mode]);
  const formations = useMemo(
    () => ({ ...procedural, ...images }),
    [procedural, images],
  );
  const textures = useMemo(() => {
    const out: Record<string, FormationTextures> = {};
    for (const [k, f] of Object.entries(formations)) out[k] = toTextures(f);
    return out;
  }, [formations]);
  useEffect(
    () => () =>
      Object.values(textures).forEach((t) => {
        t.pos.dispose();
        t.col.dispose();
      }),
    [textures],
  );
  return {
    formations,
    textures,
    ready: mode !== "terrain" || "mountains" in images,
  };
}

const TWISTS: [number, number][] = [
  [1, 1],
  [0, 1],
  [2, -1],
  [1, -1],
  [0, -1],
  [2, 1],
];

function Grains({
  input,
  mode,
}: {
  input: MutableRefObject<MotionInput>;
  mode: SceneMode;
}) {
  const { formations, textures, ready } = useFormations(mode);
  const { size, viewport } = useThree();
  const group = useRef<THREE.Group>(null);
  const clock = useRef({
    time: 0,
    intro: 0,
    spin: 0,
    p: 0,
    mix: 0,
    alpha: 0,
    reveal: 0,
    twistT: 0,
  });
  // spin only accumulates while the cube is on screen and is applied scaled by its weight
  const live = useRef<{
    version: number;
    tex: FormationTextures | null;
    f: Formation | null;
  }>({ version: -1, tex: null, f: null });
  const pointerWorld = useRef(new THREE.Vector3(99, 99, 0));
  const pointerVel = useRef(new THREE.Vector3());
  const tmp = useMemo(
    () => ({
      v: new THREE.Vector3(),
      w: new THREE.Vector3(),
      prev: new THREE.Vector3(),
      ray: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      ndc: new THREE.Vector2(),
    }),
    [],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const ref = new Float32Array(GRAIN_COUNT * 2);
    const seed = new Float32Array(GRAIN_COUNT);
    const order = Array.from({ length: GRAIN_COUNT }, (_, i) => i);
    let s = 1234567;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    for (let i = 0; i < GRAIN_COUNT; i++) {
      const texel = order[i]!;
      ref[i * 2] = ((texel % TEX_W) + 0.5) / TEX_W;
      ref[i * 2 + 1] = (Math.floor(texel / TEX_W) + 0.5) / TEX_H;
      seed[i] = r();
    }
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(GRAIN_COUNT * 3), 3),
    );
    g.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uFrom: { value: null as THREE.Texture | null },
      uTo: { value: null as THREE.Texture | null },
      uFromCol: { value: null as THREE.Texture | null },
      uToCol: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uTime: { value: 0 },
      uAlpha: { value: 1 },
      uSize: { value: 14 },
      uPixelRatio: { value: 1 },
      uPulse: { value: 0 },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uPointerVel: { value: new THREE.Vector3() },
      uPointerStrength: { value: 0 },
      uRadius: { value: 1.1 },
      uCubeSide: { value: 0 },
      uTwistAxis: { value: 1 },
      uTwistLayer: { value: 1 },
      uTwistAngle: { value: 0 },
      uCubeStep: { value: CUBIE + CUBE_GAP },
      uNetSide: { value: 0 },
      uRevealX: { value: 10 },
    }),
    [],
  );
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    geometry.setDrawRange(
      0,
      size.width < 700 ? Math.round(GRAIN_COUNT * 0.5) : GRAIN_COUNT,
    );
  }, [geometry, size.width]);
  useEffect(
    () => () => {
      live.current.tex?.pos.dispose();
      live.current.tex?.col.dispose();
    },
    [],
  );

  useFrame(({ camera, gl }, rawDelta) => {
    const state = input.current;
    if (!state.active) return;
    const dt = Math.min(rawDelta, 0.05);
    const c = clock.current;
    const u = uniforms;
    if (!state.reduced) c.time += dt;
    u.uTime.value = c.time;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value =
      (mode === "terrain" ? 13 : 14) *
      Math.min(1.25, Math.max(0.75, size.height / 760));
    const ease = 1 - Math.exp(-5 * dt);
    c.p += (state.progress - c.p) * ease;

    // live dashboard grains (sampled from the DOM)
    if (state.dash && state.dashVersion !== live.current.version) {
      live.current.tex?.pos.dispose();
      live.current.tex?.col.dispose();
      live.current = {
        version: state.dashVersion,
        tex: toTextures(state.dash),
        f: state.dash,
      };
    }
    const tex = (k: string) =>
      k === "dashboard" && live.current.tex ? live.current.tex : textures[k];
    const form = (k: string) =>
      k === "dashboard" && live.current.f ? live.current.f : formations[k];

    let fromKey = "cloud",
      toKey = "cloud",
      mix = 0,
      alpha = 1,
      reveal = 1;
    if (mode === "journey") {
      const tl = journeyTimeline(c.p, state.dashInStage);
      [fromKey, toKey, mix, alpha, reveal] = [
        tl.from,
        tl.to,
        tl.mix,
        tl.grains,
        tl.reveal,
      ];
    } else {
      if (ready) c.intro = state.reduced ? 1 : Math.min(1, c.intro + dt / 2.8);
      toKey = textures["mountains"] ? "mountains" : "cloud";
      mix = 1 - Math.pow(1 - c.intro, 3);
      state.intro = c.intro;
    }
    c.mix += (mix - c.mix) * (1 - Math.exp(-8 * dt));
    c.alpha += (alpha - c.alpha) * (1 - Math.exp(-12 * dt));
    c.reveal += (reveal - c.reveal) * (1 - Math.exp(-4 * dt));
    const from = tex(fromKey)!,
      to = tex(toKey)!;
    u.uFrom.value = from.pos;
    u.uTo.value = to.pos;
    u.uFromCol.value = from.col;
    u.uToCol.value = to.col;
    u.uMix.value = c.mix;
    u.uAlpha.value = c.alpha;
    const weight = (k: string) =>
      (fromKey === k ? 1 - c.mix : 0) + (toKey === k ? c.mix : 0);
    const dashW =
      fromKey === toKey && fromKey === "dashboard" ? 1 : weight("dashboard");
    const cubeW = weight("cube"),
      netW = weight("network");
    u.uPulse.value = netW + weight("graph") * 0.4;
    u.uCubeSide.value = toKey === "cube" ? 2 : fromKey === "cube" ? 1 : 0;
    u.uNetSide.value = toKey === "network" ? 2 : fromKey === "network" ? 1 : 0;
    u.uRevealX.value =
      NETWORK_X0 -
      0.35 +
      c.reveal * ((NETWORK_LAYERS.length - 1) * NETWORK_DX + 0.9);

    // Rubik twist: quarter turns on alternating layers, with a pause between moves
    if (!state.reduced && cubeW > 0.01) c.twistT += dt;
    const move = Math.floor(c.twistT / 2.2);
    const phase = Math.min(1, (c.twistT % 2.2) / 1.1);
    const [axis, layer] = TWISTS[move % TWISTS.length]!;
    u.uTwistAxis.value = axis;
    u.uTwistLayer.value = layer;
    u.uTwistAngle.value =
      (phase < 0.5 ? 4 * phase ** 3 : 1 - (-2 * phase + 2) ** 3 / 2) *
      (Math.PI / 2);
    if (!state.reduced && cubeW > 0.01) c.spin += dt * 0.22;

    // pointer → world plane
    const rect = gl.domElement.getBoundingClientRect();
    const inside =
      state.pointer &&
      state.clientX > rect.left &&
      state.clientX < rect.right &&
      state.clientY > rect.top &&
      state.clientY < rect.bottom;
    if (inside) {
      tmp.ndc.set(
        ((state.clientX - rect.left) / rect.width) * 2 - 1,
        -((state.clientY - rect.top) / rect.height) * 2 + 1,
      );
      tmp.ray.setFromCamera(tmp.ndc, camera);
      if (tmp.ray.ray.intersectPlane(tmp.plane, tmp.v)) {
        tmp.prev.copy(pointerWorld.current);
        pointerWorld.current.lerp(tmp.v, 1 - Math.exp(-18 * dt));
        tmp.w
          .copy(pointerWorld.current)
          .sub(tmp.prev)
          .multiplyScalar(0.025 / Math.max(dt, 0.008));
        pointerVel.current.lerp(tmp.w.clampLength(0, 0.8), 0.2);
      }
    } else pointerVel.current.multiplyScalar(0.9);
    const targetStrength = inside && !state.reduced && c.alpha > 0.5 ? 1 : 0;
    u.uPointerStrength.value +=
      (targetStrength - u.uPointerStrength.value) * (1 - Math.exp(-4 * dt));
    u.uPointer.value.copy(pointerWorld.current);
    u.uPointerVel.value.copy(pointerVel.current);

    const g = group.current;
    if (!g) return;
    // the dashboard formation must sit exactly on the DOM: no tilt, no scale while it shows
    const free = 1 - dashW;
    const fit = Math.min(1, viewport.width / (size.width < 700 ? 6.6 : 7.4));
    const tiltX = (-0.12 * state.y + cubeW * 0.42) * free;
    const graphW = weight("graph");
    const tiltY =
      (0.3 * state.x +
        Math.sin(c.time * 0.17) * 0.05 +
        (c.spin + 0.6) * cubeW +
        Math.sin(c.time * 0.12) * 0.35 * graphW) *
      free;
    g.rotation.x += (tiltX - g.rotation.x) * ease;
    g.rotation.y += (tiltY - g.rotation.y) * ease;
    g.scale.setScalar(mode === "terrain" ? 1.25 * fit : 1 + (fit - 1) * free);
    g.position.x =
      mode === "journey" && size.width >= 1000 ? -(1.7 + 0.5 * netW) * free : 0;
    g.updateMatrixWorld();

    // project the anchors of the formation on screen
    const activeKey = c.mix < 0.5 ? fromKey : toKey;
    const anchors = form(activeKey)?.anchors ?? [];
    const n = Math.min(anchors.length, 32);
    for (let k = 0; k < n; k++) {
      const an = anchors[k]!;
      tmp.v.set(an[0], an[1], an[2]);
      let vis = 1;
      if (activeKey === "network")
        vis = an[0] < u.uRevealX.value - 0.05 ? 1 : 0;
      tmp.v.applyMatrix4(g.matrixWorld);
      if (activeKey === "cube") {
        // only label faces turned towards the camera
        tmp.w.set(0, 0, 0).applyMatrix4(g.matrixWorld);
        const facing =
          (tmp.v.z - tmp.w.z) / Math.max(0.001, tmp.v.distanceTo(tmp.w));
        vis = Math.min(1, Math.max(0, (facing + 0.15) * 2.5));
      }
      tmp.v.project(camera);
      state.anchors[k * 2] = (tmp.v.x * 0.5 + 0.5) * size.width;
      state.anchors[k * 2 + 1] = (-tmp.v.y * 0.5 + 0.5) * size.height;
      state.anchorVis[k] = vis;
    }
    state.anchorCount = n;
    state.anchorKey = activeKey;
    state.anchorAlpha = Math.pow(Math.abs(c.mix - 0.5) * 2, 3) * c.alpha;
    gl.domElement.dataset["formation"] =
      `${fromKey}>${toKey}:${c.mix.toFixed(2)}`;
  });

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export default function MotionScene({
  input,
  mode = "journey",
}: {
  input: MutableRefObject<MotionInput>;
  mode?: SceneMode;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8], fov: 48 }}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      }}
    >
      <Grains input={input} mode={mode} />
    </Canvas>
  );
}
