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
  CONTOUR_ANCHORS,
  GRAIN_COUNT,
  TEX_H,
  TEX_W,
  cloudFormation,
  dashboardFormation,
  loadImageFormation,
  neuralFormation,
  vectorFormation,
  type Formation,
} from "@/lib/grain-targets";

import type { MotionInput, SceneMode } from "./motion-input";
export type { MotionInput, SceneMode };
export const JOURNEY_KEYS = [
  "dashboard",
  "neural",
  "vector",
  "contours",
  "portrait",
] as const;

const vertex = /* glsl */ `
  uniform sampler2D uFrom;
  uniform sampler2D uTo;
  uniform sampler2D uFromCol;
  uniform sampler2D uToCol;
  uniform float uMix;
  uniform float uTime;
  uniform float uScatter;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uPulse;
  uniform vec3 uPointer;
  uniform vec3 uPointerVel;
  uniform float uPointerStrength;
  uniform float uRadius;
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

  void main() {
    vec4 a = texture2D(uFrom, aRef);
    vec4 b = texture2D(uTo, aRef);
    // staggered sweep: grains leave left to right with a random lag
    float lag = aSeed * 0.38 + clamp((a.x + 3.5) / 7.0, 0.0, 1.0) * 0.17;
    float t = smoothstep(lag, lag + 0.45, uMix);
    float burst = sin(3.14159265 * t);
    vec3 pos = mix(a.xyz, b.xyz, t);
    vec3 dir = flow(pos, aSeed);
    // scatter mid-flight, then reassemble
    pos += dir * burst * (0.9 + aSeed * 2.2);
    pos.z += burst * (aSeed - 0.5) * 2.5;
    // breathing at rest
    pos += dir * 0.018 * sin(uTime * 1.1 + aSeed * 40.0);
    // global scatter (scrolling a section away)
    pos += dir * uScatter * (0.6 + aSeed * 3.2);
    pos.z += uScatter * aSeed * 2.0;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vec2 d = world.xy - uPointer.xy;
    float dist = length(d);
    float f = smoothstep(uRadius, 0.0, dist) * uPointerStrength;
    world.xy += normalize(d + 1e-4) * f * (0.55 + aSeed * 0.9);
    world.z += f * (aSeed - 0.3) * 1.6;
    world.xyz += uPointerVel * f * (0.5 + aSeed);

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    // a share of grains vanishes mid-transition so frames dissolve rather than slide
    float vanish = burst * step(0.42, fract(aSeed * 7.13));
    vec3 col = mix(texture2D(uFromCol, aRef).rgb, texture2D(uToCol, aRef).rgb, t);
    // signal pulses travelling through the network
    float wave = smoothstep(0.08, 0.0, abs(fract(pos.x * 0.18 - uTime * 0.32 + aSeed * 0.04) - 0.5));
    col += uPulse * wave * vec3(0.5, 0.6, 0.15);
    col = mix(col, vec3(0.78, 0.96, 0.2), clamp(f * 0.85, 0.0, 0.85));
    vColor = col;
    vAlpha = (1.0 - vanish * 0.96) * (1.0 - uScatter * 0.35);
    float size = uSize * (0.55 + fract(aSeed * 13.7) * 0.95) * (1.0 + f * 0.8 + burst * 0.4) * (1.0 - vanish * 0.6);
    gl_PointSize = size * uPixelRatio / max(0.5, -mv.z);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.18, d) * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

type FormationTextures = { pos: THREE.DataTexture; col: THREE.DataTexture };

// Positions go in a float texture; colours in a separate 8-bit texture so no GPU has to
// unpack 24-bit integers from a float (some drivers sample float textures at half precision).
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
  const procedural = useMemo(() => {
    const cloud = cloudFormation();
    if (mode !== "journey") return { cloud } as Record<string, Formation>;
    return {
      cloud,
      dashboard: dashboardFormation(),
      neural: neuralFormation(),
      vector: vectorFormation(),
    } as Record<string, Formation>;
  }, [mode]);
  const [images, setImages] = useState<Record<string, Formation>>({});
  useEffect(() => {
    let alive = true;
    const want: [string, string, Parameters<typeof loadImageFormation>[1]][] =
      mode === "terrain"
        ? [
            [
              "mountains",
              "/grains/mountains.bin",
              { tint: [0.95, 0.94, 0.92], tintAmount: 0.3, gain: 2.2 },
            ],
          ]
        : mode === "hero"
          ? [["portrait", "/grains/portrait.bin", { gain: 1.15 }]]
          : [
              ["portrait", "/grains/portrait.bin", { gain: 1.15 }],
              [
                "contours",
                "/grains/contours.bin",
                {
                  tint: [0.78, 0.96, 0.2],
                  tintAmount: 0.25,
                  gain: 1.5,
                  anchors: CONTOUR_ANCHORS,
                },
              ],
            ];
    Promise.all(
      want.map(([k, url, o]) =>
        loadImageFormation(url, o).then((f) => [k, f] as const),
      ),
    )
      .then((list) => alive && setImages(Object.fromEntries(list)))
      .catch((e) => console.warn("grain data", e));
    return () => {
      alive = false;
    };
  }, [mode]);
  const all = { ...procedural, ...images };
  const textures = useMemo(() => {
    const out: Record<string, FormationTextures> = {};
    for (const [k, f] of Object.entries(all)) out[k] = toTextures(f);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procedural, images]);
  useEffect(
    () => () =>
      Object.values(textures).forEach((t) => {
        t.pos.dispose();
        t.col.dispose();
      }),
    [textures],
  );
  return { formations: all, textures, ready: Object.keys(images).length > 0 };
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
  const points = useRef<THREE.Points>(null);
  const clock = useRef({ time: 0, intro: 0, spin: 0, p: 0, mix: 0 });
  const pointerWorld = useRef(new THREE.Vector3(99, 99, 0));
  const pointerVel = useRef(new THREE.Vector3());
  const tmp = useMemo(
    () => ({
      v: new THREE.Vector3(),
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
      uScatter: { value: 0 },
      uSize: { value: 15 },
      uPixelRatio: { value: 1 },
      uPulse: { value: 0 },
      uPointer: { value: new THREE.Vector3(99, 99, 0) },
      uPointerVel: { value: new THREE.Vector3() },
      uPointerStrength: { value: 0 },
      uRadius: { value: 1.1 },
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
    // fewer grains on small screens keeps phones at frame rate
    geometry.setDrawRange(
      0,
      size.width < 700 ? Math.round(GRAIN_COUNT * 0.5) : GRAIN_COUNT,
    );
  }, [geometry, size.width]);

  useFrame(({ camera, gl }, rawDelta) => {
    const state = input.current;
    if (!state.active) return;
    const dt = Math.min(rawDelta, 0.05);
    const c = clock.current;
    if (!state.reduced) c.time += dt;
    const u = uniforms;
    u.uTime.value = c.time;
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value =
      (mode === "hero" ? 17 : mode === "terrain" ? 13 : 14) *
      Math.min(1.25, Math.max(0.75, size.height / 760));

    const ease = 1 - Math.exp(-5 * dt);
    c.p += (state.progress - c.p) * ease;

    let fromKey = "cloud",
      toKey = "cloud",
      mix = 0,
      scatter = 0;
    if (mode === "journey") {
      const K = JOURNEY_KEYS.length;
      const s = Math.min(K - 1, Math.max(0, c.p * K - 0.5));
      const i = Math.min(K - 2, Math.floor(s));
      fromKey = JOURNEY_KEYS[i]!;
      toKey = JOURNEY_KEYS[i + 1]!;
      mix = smooth(0.18, 0.82, s - i);
      if (s >= K - 1) mix = 1;
    } else {
      const target = mode === "hero" ? "portrait" : "mountains";
      if (ready) c.intro = state.reduced ? 1 : Math.min(1, c.intro + dt / 2.8);
      fromKey = "cloud";
      toKey = textures[target] ? target : "cloud";
      mix = 1 - Math.pow(1 - c.intro, 3);
      scatter = mode === "hero" ? smooth(0.05, 1, c.p) * 1.1 : 0;
      state.intro = c.intro;
    }
    // wait for image data rather than flashing the fallback
    if (!textures[fromKey]) fromKey = "cloud";
    if (!textures[toKey]) toKey = fromKey;
    c.mix += (mix - c.mix) * (1 - Math.exp(-7 * dt));
    u.uFrom.value = textures[fromKey]?.pos ?? null;
    u.uTo.value = textures[toKey]?.pos ?? null;
    u.uFromCol.value = textures[fromKey]?.col ?? null;
    u.uToCol.value = textures[toKey]?.col ?? null;
    u.uMix.value = c.mix;
    u.uScatter.value = scatter;
    u.uPulse.value =
      (fromKey === "neural" ? 1 - c.mix : 0) + (toKey === "neural" ? c.mix : 0);
    const vectorWeight =
      (fromKey === "vector" ? 1 - c.mix : 0) + (toKey === "vector" ? c.mix : 0);
    if (!state.reduced) c.spin += dt * 0.16 * vectorWeight;

    // pointer → world plane
    const rect = gl.domElement.getBoundingClientRect();
    const inside =
      state.pointer &&
      state.clientX > rect.left - 40 &&
      state.clientX < rect.right + 40 &&
      state.clientY > rect.top - 40 &&
      state.clientY < rect.bottom + 40;
    if (inside) {
      tmp.ndc.set(
        ((state.clientX - rect.left) / rect.width) * 2 - 1,
        -((state.clientY - rect.top) / rect.height) * 2 + 1,
      );
      tmp.ray.setFromCamera(tmp.ndc, camera);
      const hit = tmp.ray.ray.intersectPlane(tmp.plane, tmp.v);
      if (hit) {
        const prev = pointerWorld.current.clone();
        pointerWorld.current.lerp(hit, 1 - Math.exp(-18 * dt));
        const vel = pointerWorld.current
          .clone()
          .sub(prev)
          .multiplyScalar(dt > 0 ? (0.5 / Math.max(dt, 0.008)) * 0.05 : 0);
        pointerVel.current.lerp(vel.clampLength(0, 0.8), 0.2);
      }
    } else pointerVel.current.multiplyScalar(0.9);
    const targetStrength = inside && !state.reduced ? 1 : 0;
    u.uPointerStrength.value +=
      (targetStrength - u.uPointerStrength.value) * (1 - Math.exp(-4 * dt));
    u.uPointer.value.copy(pointerWorld.current);
    u.uPointerVel.value.copy(pointerVel.current);
    u.uRadius.value = mode === "hero" ? 0.95 : 1.15;

    if (group.current) {
      const g = group.current;
      const tx = state.x,
        ty = state.y;
      g.rotation.y +=
        ((mode === "terrain" ? 0.15 : 0.32) * tx +
          Math.sin(c.time * 0.17) * 0.06 +
          c.spin -
          g.rotation.y) *
        ease;
      g.rotation.x +=
        (-0.14 * ty + (mode === "terrain" ? -0.25 : 0) - g.rotation.x) * ease;
      const fit = Math.min(
        1,
        viewport.width /
          (mode === "journey" ? (size.width < 700 ? 9.8 : 7.0) : 3.6),
      );
      g.scale.setScalar(fit * (mode === "terrain" ? 1.25 : 1));
      g.updateMatrixWorld();

      // project anchors of the formation currently on screen
      const activeKey = c.mix < 0.5 ? fromKey : toKey;
      const anchors = formations[activeKey]?.anchors ?? [];
      const n = Math.min(anchors.length, 32);
      for (let k = 0; k < n; k++) {
        const an = anchors[k]!;
        tmp.v
          .set(an[0], an[1], an[2])
          .applyMatrix4(g.matrixWorld)
          .project(camera);
        state.anchors[k * 2] = (tmp.v.x * 0.5 + 0.5) * size.width;
        state.anchors[k * 2 + 1] = (-tmp.v.y * 0.5 + 0.5) * size.height;
      }
      state.anchorCount = n;
      state.anchorKey = activeKey;
      state.anchorAlpha = Math.pow(Math.abs(c.mix - 0.5) * 2, 3);
    }
    gl.domElement.dataset["formation"] =
      `${fromKey}>${toKey}:${c.mix.toFixed(2)}`;
  });

  return (
    <group ref={group}>
      <points
        ref={points}
        geometry={geometry}
        material={material}
        frustumCulled={false}
      />
    </group>
  );
}

export default function MotionScene({
  input,
  mode = "hero",
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
      frameloop="always"
    >
      <Grains input={input} mode={mode} />
    </Canvas>
  );
}
