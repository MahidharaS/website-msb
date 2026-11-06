import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { storyline } from "@/data/content";

export type StoryInput = {
  progress: number;
  reduced: boolean;
  active: boolean;
  x: number;
  y: number;
};

const ACTS = storyline.length;
const START = 0.03;
const SPAN = 0.92;
/** path parameter (0..1) where each act's beacon stands */
export const actT = (i: number) => START + ((i + 0.5) / ACTS) * SPAN;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildPath() {
  const pts: THREE.Vector3[] = [];
  const n = ACTS * 2 + 3;
  for (let k = 0; k < n; k++) {
    const swing = Math.sin(k * 1.25) * (2.4 + (k % 3) * 0.6);
    pts.push(new THREE.Vector3(swing, Math.sin(k * 0.7) * 0.35, -k * 4.2));
  }
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
}

const ACT_COLORS = storyline.map((a) => new THREE.Color(a.color));
function colorAt(t: number, out: THREE.Color) {
  const x = Math.max(0, Math.min(ACTS - 1, ((t - START) / SPAN) * ACTS - 0.5));
  const i = Math.floor(x);
  return out
    .copy(ACT_COLORS[i]!)
    .lerp(ACT_COLORS[Math.min(ACTS - 1, i + 1)]!, x - i);
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  attribute vec3 color;
  attribute float aT;
  attribute float aKind;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);
    float reached = aT < 0.0 ? 1.0 : smoothstep(aT + 0.02, aT - 0.01, uProgress) ;
    float traveled = aT < 0.0 ? 0.0 : step(aT, uProgress);
    float alpha = 0.0;
    float size = 0.0;
    vec3 col = color;
    if (aKind < 0.5) {
      // the road: lit behind you, dim ahead, with light streaming forward
      float stream = smoothstep(0.035, 0.0, abs(fract(aT * 24.0 - uTime * 0.35) - 0.5) - 0.44);
      float ahead = smoothstep(uProgress + 0.18, uProgress, aT);
      alpha = mix(0.22, 0.95, max(traveled, ahead * 0.65)) * twinkle + stream * 0.5;
      size = 5.0 + aSeed * 6.0 + stream * 4.0;
      col = mix(col * 0.55, col * 1.35, max(traveled, ahead * 0.6)) + stream * 0.35;
    } else if (aKind < 1.5) {
      alpha = 0.32 * twinkle; size = 3.5 + aSeed * 3.0;
    } else if (aKind < 2.5) {
      alpha = 0.18 * twinkle; size = 2.5 + aSeed * 3.5;
    } else {
      // beacons light up as you reach them
      float near = 1.0 - smoothstep(0.0, 0.09, abs(uProgress - aT));
      alpha = (0.18 + 0.82 * max(near, traveled * 0.45)) * twinkle;
      size = 4.0 + aSeed * 5.0 + near * 5.0;
      p.y += near * sin(uTime * 2.0 + aSeed * 20.0) * 0.03;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(size * uPixelRatio * min(2.2, 5.0 / max(0.6, -mv.z)), 14.0 * uPixelRatio);
    vColor = col;
    vAlpha = alpha * smoothstep(30.0, 7.0, -mv.z);
  }
`;
const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

function World({ input }: { input: MutableRefObject<StoryInput> }) {
  const curve = useMemo(buildPath, []);
  const { camera, gl } = useThree();
  const walker = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.PointLight>(null);
  const state = useRef({
    t: START,
    time: 0,
    look: new THREE.Vector3(),
    cam: new THREE.Vector3(0, 2, 6),
  });

  const geometry = useMemo(() => {
    const r = rng(7);
    const pos: number[] = [],
      col: number[] = [],
      tt: number[] = [],
      kind: number[] = [],
      seed: number[] = [];
    const c = new THREE.Color(),
      up = new THREE.Vector3(0, 1, 0),
      side = new THREE.Vector3(),
      tan = new THREE.Vector3(),
      p = new THREE.Vector3();
    const gauss = () =>
      Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r());
    const add = (v: THREE.Vector3, cc: THREE.Color, t: number, k: number) => {
      pos.push(v.x, v.y, v.z);
      col.push(cc.r, cc.g, cc.b);
      tt.push(t);
      kind.push(k);
      seed.push(r());
    };
    // the road
    for (let n = 0; n < 34000; n++) {
      const t = r();
      curve.getPointAt(t, p);
      curve.getTangentAt(t, tan);
      side.crossVectors(tan, up).normalize();
      const w = gauss() * 0.34;
      p.addScaledVector(side, w).addScaledVector(up, Math.abs(gauss()) * 0.03);
      colorAt(t, c);
      if (r() < 0.12) c.lerp(new THREE.Color("#F2F0EA"), 0.6);
      add(p, c, t, 0);
    }
    // the ending forks: three new roads leave the last beacon
    {
      const t0 = actT(ACTS - 1);
      const from = curve.getPointAt(t0, new THREE.Vector3());
      const dir = curve.getTangentAt(t0, new THREE.Vector3());
      const forkColors = ["#F2F0EA", "#C6F432", "#C9D4E0"].map(
        (x) => new THREE.Color(x),
      );
      for (let k = 0; k < 3; k++) {
        const d = dir.clone().applyAxisAngle(up, (k - 1) * 0.55);
        const bend = (k - 1) * 0.08;
        for (let n = 0; n < 2600; n++) {
          const u = r();
          const along = d.clone().applyAxisAngle(up, bend * u * 6);
          p.copy(from).addScaledVector(along, u * 9);
          side.crossVectors(along, up).normalize();
          p.addScaledVector(side, gauss() * 0.22 * (1 - u * 0.5));
          add(
            p,
            c.copy(forkColors[k]!).lerp(new THREE.Color("#F2F0EA"), r() * 0.3),
            t0 + 0.01 + u * 0.04,
            0,
          );
        }
      }
    }
    // roads not taken: tangled, dim crimson
    const crimson = new THREE.Color("#3a3d44");
    for (let g = 0; g < 7; g++) {
      const off = new THREE.Vector3(
        (r() - 0.5) * 16,
        -1.5 - r() * 3,
        (r() - 0.5) * 8,
      );
      const rot = (r() - 0.5) * 1.6;
      for (let n = 0; n < 2600; n++) {
        const t = r();
        curve.getPointAt(t, p);
        p.applyAxisAngle(up, rot).add(off);
        p.y += Math.sin(t * 9 + g) * 1.2;
        p.x += gauss() * 0.25;
        add(p, c.copy(crimson).multiplyScalar(0.8 + r() * 0.6), -1, 1);
      }
    }
    // dust / stars
    const dust = new THREE.Color("#9fb3ff");
    const len = curve.getLength();
    for (let n = 0; n < 9000; n++) {
      p.set((r() - 0.5) * 30, (r() - 0.35) * 14, 6 - r() * (len + 14));
      add(p, c.copy(dust).lerp(new THREE.Color("#F2F0EA"), r()), -1, 2);
    }
    // beacons: a column of light and a ring at every act
    for (let i = 0; i < ACTS; i++) {
      const t = actT(i);
      const base = curve.getPointAt(t, new THREE.Vector3());
      curve.getTangentAt(t, tan);
      side.crossVectors(tan, up).normalize();
      const at = base.clone().addScaledVector(side, i % 2 ? 1.25 : -1.25);
      colorAt(t, c);
      for (let n = 0; n < 700; n++) {
        const h = Math.pow(r(), 1.6) * 3.4;
        p.set(at.x + gauss() * 0.05, at.y + h, at.z + gauss() * 0.05);
        add(p, c, t, 3);
      }
      for (let n = 0; n < 420; n++) {
        const a = r() * Math.PI * 2;
        p.set(
          at.x + Math.cos(a) * 0.55,
          at.y + 0.02,
          at.z + Math.sin(a) * 0.55,
        );
        add(p, c, t, 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(tt, 1));
    g.setAttribute("aKind", new THREE.Float32BufferAttribute(kind, 1));
    g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    return g;
  }, [curve]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: START },
          uPixelRatio: { value: 1 },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  const tmp = useMemo(
    () => ({
      p: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      side: new THREE.Vector3(),
      ahead: new THREE.Vector3(),
      want: new THREE.Vector3(),
    }),
    [],
  );
  useFrame((_, raw) => {
    const s = input.current;
    if (!s.active) return;
    const dt = Math.min(raw, 0.05);
    const st = state.current;
    if (!s.reduced) st.time += dt;
    const target = START + s.progress * SPAN;
    const prevT = st.t;
    st.t += (target - st.t) * (1 - Math.exp(-3.2 * dt));
    const speed = Math.abs(st.t - prevT) / Math.max(dt, 1e-3);
    material.uniforms["uTime"]!.value = st.time;
    material.uniforms["uProgress"]!.value = st.t;
    material.uniforms["uPixelRatio"]!.value = gl.getPixelRatio();

    curve.getPointAt(Math.min(0.999, st.t), tmp.p);
    curve.getTangentAt(Math.min(0.999, st.t), tmp.tan);
    tmp.side.crossVectors(tmp.tan, new THREE.Vector3(0, 1, 0)).normalize();
    if (walker.current) {
      const w = walker.current;
      w.position.copy(tmp.p);
      w.position.y +=
        0.02 +
        (s.reduced
          ? 0
          : Math.abs(Math.sin(st.time * 9)) * Math.min(1, speed * 40) * 0.025);
      tmp.ahead.copy(tmp.p).add(tmp.tan);
      w.lookAt(tmp.ahead.x, w.position.y, tmp.ahead.z);
    }
    if (lantern.current)
      lantern.current.intensity = 2.2 + Math.sin(st.time * 6) * 0.25;
    // camera: behind, above, slightly to the side; the pointer nudges it
    tmp.want
      .copy(tmp.p)
      .addScaledVector(tmp.tan, -4.6)
      .addScaledVector(tmp.side, -1.5 + s.x * 0.8)
      .add(new THREE.Vector3(0, 2.3 + s.y * 0.5, 0));
    st.cam.lerp(tmp.want, 1 - Math.exp(-3 * dt));
    camera.position.copy(st.cam);
    st.look.lerp(
      tmp.ahead
        .copy(tmp.p)
        .addScaledVector(tmp.tan, 3.2)
        .add(new THREE.Vector3(0, 0.1, 0)),
      1 - Math.exp(-4 * dt),
    );
    camera.lookAt(st.look);
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <points geometry={geometry} material={material} frustumCulled={false} />
      <group ref={walker} scale={1}>
        {/* a small figure carrying a lantern */}
        <mesh position={[0, 0.17, 0]}>
          <capsuleGeometry args={[0.045, 0.2, 6, 12]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.042, 16, 16]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.7} />
        </mesh>
        <mesh position={[0.07, 0.2, 0.05]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshBasicMaterial color="#fff4d6" />
        </mesh>
        <pointLight
          ref={lantern}
          position={[0.07, 0.22, 0.08]}
          color="#ffe2a8"
          intensity={2.2}
          distance={3.2}
          decay={2}
        />
      </group>
    </>
  );
}

export default function StoryScene({
  input,
}: {
  input: MutableRefObject<StoryInput>;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 2, 6], fov: 52, near: 0.05, far: 80 }}
      gl={{ antialias: true, alpha: true }}
    >
      <World input={input} />
    </Canvas>
  );
}
