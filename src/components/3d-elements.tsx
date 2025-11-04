'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float, Text3D, Center } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function RotatingBox({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#3b82f6"
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
    </Float>
  );
}

function FloatingSphere({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} rotationIntensity={1.5} floatIntensity={3}>
      <mesh position={position}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#60a5fa"
          metalness={0.7}
          roughness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>
    </Float>
  );
}

function FloatingTorus({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={1.8} rotationIntensity={2} floatIntensity={2.5}>
      <mesh position={position} rotation={[Math.PI / 4, 0, 0]}>
        <torusGeometry args={[0.6, 0.2, 16, 100]} />
        <meshStandardMaterial
          color="#1e40af"
          metalness={0.6}
          roughness={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>
    </Float>
  );
}

export function ThreeDBackground() {
  return (
    <div className="hidden md:block fixed inset-0 -z-10 opacity-30 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#60a5fa" />
        
        <RotatingBox position={[-3, 2, 0]} />
        <RotatingBox position={[3, -2, -1]} />
        <FloatingSphere position={[2, 2, -2]} />
        <FloatingSphere position={[-2, -1, 1]} />
        <FloatingTorus position={[0, -3, -1]} />
        <FloatingTorus position={[-4, 0, -2]} />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}

function AnimatedLogo3D() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Center>
        <mesh>
          <boxGeometry args={[2, 2, 0.5]} />
          <meshStandardMaterial
            color="#1e40af"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Center>
    </Float>
  );
}

export function Logo3DCanvas() {
  return (
    <div className="w-full h-64 md:h-80">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <pointLight position={[-10, -10, -5]} intensity={0.7} color="#60a5fa" />
        
        <AnimatedLogo3D />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={2}
        />
      </Canvas>
    </div>
  );
}
