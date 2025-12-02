'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RequestBeaconProps {
  position: [number, number, number];
  onClick?: () => void;
}

export function RequestBeacon({ position, onClick }: RequestBeaconProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.015;
      meshRef.current.rotation.z += 0.01;
    }
    if (pulseRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.004) * 0.3;
      pulseRef.current.scale.set(scale, scale, scale);
    }
    if (ringRef.current) {
      ringRef.current.rotation.x += 0.01;
    }
  });

  // Generate orbit points for decorative ring
  const orbitPoints = (() => {
    const points: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      points.push(Math.cos(angle) * 1.2, Math.sin(angle) * 0.3, Math.sin(angle) * 1.2);
    }
    return new Float32Array(points);
  })();

  return (
    <group position={position} onClick={onClick}>
      {/* Main beacon - octahedron shape */}
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial
          color={new THREE.Color(1.0, 0.7, 0.2)}
          metalness={0.8}
          roughness={0.2}
          emissive={new THREE.Color(1.0, 0.7, 0.2)}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Pulse ring */}
      <mesh ref={pulseRef}>
        <octahedronGeometry args={[0.65, 1]} />
        <meshBasicMaterial color={new THREE.Color(1.0, 0.7, 0.2)} transparent opacity={0.25} />
      </mesh>

      {/* Orbit ring */}
      <lineSegments ref={ringRef}>
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" args={[orbitPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={new THREE.Color(1.0, 0.7, 0.2)}
          opacity={0.8}
          transparent
          linewidth={2}
        />
      </lineSegments>

      {/* Outer glow ring */}
      <lineSegments>
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" args={[orbitPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={new THREE.Color(1.0, 0.7, 0.2)}
          opacity={0.3}
          transparent
          linewidth={6}
        />
      </lineSegments>
    </group>
  );
}
