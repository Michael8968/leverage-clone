'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Icosahedron } from '@react-three/drei';
import { useRef } from 'react';
import { Mesh } from 'three';

function SpinningMesh() {
  const meshRef = useRef<Mesh>(null!);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.1;
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <Icosahedron ref={meshRef} args={[1.5, 0]}>
      <meshStandardMaterial 
        color={'#6b48ff'} 
        wireframe={true} 
        transparent 
        opacity={0.6}
        metalness={0.1}
        roughness={0.5}
      />
    </Icosahedron>
  );
}

export function ThreeDBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none' // Allow clicks to pass through
      }}
    >
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        
        <SpinningMesh />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={0.5}
          // Make controls respond to events on the parent element
          domElement={
            typeof window !== 'undefined'
              ? (document.querySelector('main') as HTMLElement)
              : undefined
          }
        />
      </Canvas>
    </div>
  );
}
