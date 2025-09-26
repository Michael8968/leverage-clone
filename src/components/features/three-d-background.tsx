
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Icosahedron } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh } from 'three';

function SpinningIcosahedron() {
  const meshRef = useRef<Mesh>(null!);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Icosahedron args={[1.5, 1]} ref={meshRef}>
      <meshStandardMaterial
        color="#8A2BE2" // A nice violet color
        emissive="#4B0082" // A darker indigo for emission
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.8}
        wireframe
      />
    </Icosahedron>
  );
}


export function ThreeDBackground() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
      <Canvas>
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <SpinningIcosahedron />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
