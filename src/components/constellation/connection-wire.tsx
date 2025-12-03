'use client';

import * as THREE from 'three';
import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';

interface ConnectionWireProps {
  fromPos: [number, number, number];
  toPos: [number, number, number];
  isActive: boolean;
  isSyncing?: boolean;
}

export function ConnectionWire({
  fromPos,
  toPos,
  isActive,
  isSyncing = false,
}: ConnectionWireProps) {
  const color: string = isActive ? '#33ffff' : '#2666cc';
  const particleRef = useRef<THREE.Points>(null);
  const [glowOpacity, setGlowOpacity] = useState(0.3);
  const [pulseOpacity, setPulseOpacity] = useState(0.2);

  // Create curved path for better visual effect
  const { curvePoints, particlePositions, curve } = useMemo(() => {
    const start = new THREE.Vector3(...fromPos);
    const end = new THREE.Vector3(...toPos);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    // Add arc height based on distance
    const distance = start.distanceTo(end);
    mid.y += distance * 0.2;

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(32);

    // Particle positions along the curve for data flow effect
    const particleCount = 8;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount;
      const point = curve.getPoint(t);
      particlePositions[i * 3] = point.x;
      particlePositions[i * 3 + 1] = point.y;
      particlePositions[i * 3 + 2] = point.z;
    }

    return {
      curvePoints: points.map((p) => [p.x, p.y, p.z] as [number, number, number]),
      particlePositions,
      curve,
    };
  }, [fromPos, toPos]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Update glow opacity
    if (isActive) {
      setGlowOpacity(0.3 + Math.sin(time * 3) * 0.15);
    }

    // Pulse effect for syncing connections
    if (isSyncing) {
      setPulseOpacity(0.1 + Math.sin(time * 5) * 0.1);
    }

    // Animate particles along the path for syncing
    if (particleRef.current && isSyncing) {
      const positions = particleRef.current.geometry.attributes.position;

      for (let i = 0; i < positions.count; i++) {
        const t = (i / positions.count + time * 0.3) % 1;
        const point = curve.getPoint(t);
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Main curved wire */}
      <Line
        points={curvePoints}
        color={color}
        lineWidth={1.5}
        opacity={isActive ? 0.9 : 0.4}
        transparent
      />

      {/* Glow effect for active connections */}
      {isActive && (
        <Line points={curvePoints} color={color} lineWidth={3} opacity={glowOpacity} transparent />
      )}

      {/* Extra pulse layer for syncing */}
      {isSyncing && (
        <Line
          points={curvePoints}
          color="#88ffff"
          lineWidth={4}
          opacity={pulseOpacity}
          transparent
        />
      )}

      {/* Data flow particles for syncing connections */}
      {isSyncing && (
        <points ref={particleRef}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={new THREE.Color(0.4, 1.0, 1.0)}
            size={0.08}
            transparent
            opacity={0.9}
            attach="material"
          />
        </points>
      )}
    </group>
  );
}
