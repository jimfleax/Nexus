"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MotionValue } from "motion/react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uScroll;
  varying vec2 vUv;

  vec3 permute(vec3 x) {
    return mod((34.0 * x + 1.0) * x, 289.0);
  }

  vec2 cellular(vec2 P) {
    #define K 0.142857142857
    #define K2 0.0714285714285
    #define jitter 1.0
    vec2 Pi = mod(floor(P), 289.0);
    vec2 Pf = fract(P);
    vec3 oi = vec3(-1.0, 0.0, 1.0);
    vec3 of = vec3(-0.5, 0.5, 1.5);
    vec3 px = permute(Pi.x + oi);
    vec3 p = permute(px.x + (Pi.y + oi));
    vec3 p1 = permute(px.y + (Pi.y + oi));
    vec3 p2 = permute(px.z + (Pi.y + oi));
    vec3 ox = fract(p*K) - K2;
    vec3 oy = mod(floor(p*K), 7.0)*K - K2;
    vec3 dx = Pf.x + 0.5 + jitter*ox;
    vec3 dy = Pf.y - of + jitter*oy;
    vec3 d1 = dx * dx + dy * dy;
    p = permute(px.x + (Pi.y + oi + 1.0));
    ox = fract(p*K) - K2;
    oy = mod(floor(p*K), 7.0)*K - K2;
    dx = Pf.x - 0.5 + jitter*ox;
    dy = Pf.y - of + jitter*oy;
    vec3 d2 = dx * dx + dy * dy;
    p1 = permute(px.y + (Pi.y + oi + 1.0));
    ox = fract(p1*K) - K2;
    oy = mod(floor(p1*K), 7.0)*K - K2;
    dx = Pf.x - 0.5 + jitter*ox;
    dy = Pf.y - of + jitter*oy;
    vec3 d3 = dx * dx + dy * dy;
    return vec2(min(d1.x, d2.x), min(d1.y, d2.y));
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 3.0 + vec2(uTime * 0.1, uScroll * 1.5 - uTime * 0.15);
    vec2 cell = cellular(p);
    float n = cell.x;
    n = smoothstep(0.0, 1.0, n);
    
    vec3 color1 = vec3(98.0 / 255.0, 71.0 / 255.0, 170.0 / 255.0);
    vec3 color2 = vec3(45.0 / 255.0, 27.0 / 255.0, 78.0 / 255.0);
    vec3 finalColor = mix(color1, color2, n + uScroll * 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function FluidMaterial({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uScroll.value = scrollYProgress.get();
    }
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
    />
  );
}

export function ThreejsBackground({
  scrollYProgress,
}: {
  scrollYProgress: MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <mesh>
          <planeGeometry args={[2, 2]} />
          <FluidMaterial scrollYProgress={scrollYProgress} />
        </mesh>
      </Canvas>
    </div>
  );
}
