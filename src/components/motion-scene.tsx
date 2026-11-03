import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

export type MotionInput = { progress: number; x: number; y: number; reduced: boolean; active: boolean };
type Palette = { lime: string; paper: string; olive: string };

function Field({ input, palette }: { input: MutableRefObject<MotionInput>; palette: Palette }) {
  const group = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);
  const time = useRef(0);
  const smooth = useRef(0);
  const geometry = useMemo(() => {
    const curves: THREE.BufferGeometry[] = [];
    for (let row = 0; row < 44; row++) {
      const points: THREE.Vector3[] = [];
      const v = (row / 43 - 0.5) * 1.9;
      for (let i = 0; i <= 160; i++) {
        const t = i / 160 * Math.PI * 2;
        const radius = 2.15 + v * Math.cos(t * 1.5);
        points.push(new THREE.Vector3(radius * Math.cos(t), radius * Math.sin(t), v * Math.sin(t * 1.5) + Math.sin(t * 3) * .42));
      }
      curves.push(new THREE.BufferGeometry().setFromPoints(points));
    }
    return curves;
  }, []);
  const positions = useMemo(() => new Float32Array(600 * 3), []);
  useEffect(() => () => geometry.forEach(g => g.dispose()), [geometry]);
  useFrame(({ camera, gl }, rawDelta) => {
    const state = input.current;
    if (!state.active) return;
    const dt = Math.min(rawDelta, .05);
    if (!state.reduced) time.current += dt;
    const ease = 1 - Math.exp(-4 * dt);
    smooth.current += (state.progress - smooth.current) * ease;
    const p = smooth.current;
    if (group.current) {
      group.current.rotation.x = .48 + p * 1.2 + state.y * .15;
      group.current.rotation.y = -.4 + p * 2.7 + time.current * .065 + state.x * .3;
      group.current.rotation.z = -.35 + Math.sin(time.current * .18) * .06;
      group.current.scale.setScalar(1 - Math.sin(p * Math.PI) * .18);
    }
    if (particles.current) {
      const attribute = particles.current.geometry.getAttribute('position');
      const array = attribute.array;
      for (let i = 0; i < 600; i++) {
        const a = i * 2.39996;
        const r = 2.65 + Math.sin(i * 7.13) * .7;
        const looseX = Math.cos(a) * r;
        const looseY = Math.sin(a) * r;
        const organized = Math.min(1, p * 1.3);
        array[i * 3] = THREE.MathUtils.lerp(looseX, (i % 30 - 14.5) * .17, organized);
        array[i * 3 + 1] = THREE.MathUtils.lerp(looseY, (Math.floor(i / 30) - 9.5) * .19, organized);
        array[i * 3 + 2] = Math.sin(a + time.current * .25) * (1 - organized) * .8;
      }
      attribute.needsUpdate = true;
      particles.current.rotation.y = -p * .5;
    }
    camera.position.x += (state.x * .3 - camera.position.x) * ease;
    camera.position.y += (state.y * .2 - camera.position.y) * ease;
    camera.lookAt(0, 0, 0);
    gl.domElement.dataset['motionProgress'] = p.toFixed(3);
    gl.domElement.dataset['motionTime'] = time.current.toFixed(2);
  });
  return <>
    <group ref={group}>
      {geometry.map((g, i) => <lineLoop key={i} geometry={g}>
        <lineBasicMaterial color={i % 7 === 0 ? palette.paper : palette.lime} transparent opacity={i % 7 === 0 ? .65 : .36 + i / 100} />
      </lineLoop>)}
      <mesh rotation={[.4, -.3, .2]}>
        <torusKnotGeometry args={[1.24, .065, 180, 8, 2, 3]} />
        <meshStandardMaterial color={palette.paper} metalness={.85} roughness={.25} />
      </mesh>
    </group>
    <points ref={particles}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color={palette.lime} size={.025} transparent opacity={.65} sizeAttenuation />
    </points>
    <ambientLight intensity={.65} />
    <Environment resolution={64}>
      <Lightformer intensity={3} position={[0, 4, 3]} scale={[8, 8, 1]} color={palette.paper} />
      <Lightformer intensity={2} position={[-4, 0, 2]} scale={[5, 5, 1]} color={palette.lime} />
    </Environment>
  </>;
}

export default function MotionScene({ input }: { input: MutableRefObject<MotionInput> }) {
  const palette = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    return { lime: css.getPropertyValue('--scene-lime').trim(), paper: css.getPropertyValue('--scene-paper').trim(), olive: css.getPropertyValue('--scene-olive').trim() };
  }, []);
  return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 8], fov: 48 }} gl={{ antialias: true, alpha: true }}>
    <Field input={input} palette={palette} />
  </Canvas>;
}