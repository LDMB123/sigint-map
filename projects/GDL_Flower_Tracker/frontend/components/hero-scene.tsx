"use client";

import { Float } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function BloomForms() {
  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 3, 4]} intensity={2.4} color="#9ef0b3" />
      <directionalLight position={[-3, -2, -3]} intensity={1.3} color="#1f6b52" />
      <Float speed={1.2} rotationIntensity={0.55} floatIntensity={0.6}>
        <mesh rotation={[0.6, 0.6, 0]}>
          <icosahedronGeometry args={[1.35, 1]} />
          <meshStandardMaterial color="#00c853" emissive="#0c4628" metalness={0.3} roughness={0.2} wireframe />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.9}>
        <mesh position={[1.8, -0.2, -0.5]}>
          <torusKnotGeometry args={[0.52, 0.16, 120, 16]} />
          <meshStandardMaterial color="#9fe8bc" emissive="#163b2b" roughness={0.35} />
        </mesh>
      </Float>
      <Float speed={1.1} rotationIntensity={0.45} floatIntensity={0.7}>
        <points position={[-1.7, 0.45, -0.2]}>
          <sphereGeometry args={[0.8, 14, 14]} />
          <pointsMaterial color="#d2ffe2" size={0.035} sizeAttenuation />
        </points>
      </Float>
    </>
  );
}

function SceneRig({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!active || !groupRef.current) return;

    groupRef.current.rotation.y += delta * 0.18;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.32) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <BloomForms />
    </group>
  );
}

export function HeroScene({ active }: { active: boolean }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (reduced) return null;

  return (
    <div className="hero-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        dpr={[1, 1.25]}
        frameloop={active ? "always" : "never"}
      >
        <color attach="background" args={["#0f1117"]} />
        <fog attach="fog" args={["#0f1117", 4, 8]} />
        <SceneRig active={active} />
      </Canvas>
    </div>
  );
}
