"use client"

import { useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"

interface ParticleFlowProps {
  fromPos: [number, number, number]
  toPos: [number, number, number]
}

export default function ParticleFlow({ fromPos, toPos }: ParticleFlowProps) {
  const particlesRef = useRef<THREE.Points>(null)
  const offsetsRef = useRef<Float32Array | null>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)
  const positionsRef = useRef<Float32Array | null>(null)

  const particleCount = 50

  if (!positionsRef.current) {
    positionsRef.current = new Float32Array(particleCount * 3)
    offsetsRef.current = new Float32Array(particleCount)
    velocitiesRef.current = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      offsetsRef.current[i] = Math.random()
      velocitiesRef.current[i] = 0.5 + Math.random() * 0.5
    }
  }

  useFrame(() => {
    if (!particlesRef.current || !offsetsRef.current || !velocitiesRef.current || !positionsRef.current) return

    const positions = positionsRef.current
    const from = new THREE.Vector3(...fromPos)
    const to = new THREE.Vector3(...toPos)
    const direction = new THREE.Vector3().subVectors(to, from)

    for (let i = 0; i < particleCount; i++) {
      offsetsRef.current[i] = (offsetsRef.current[i] + velocitiesRef.current[i] * 0.02) % 1

      const pos = new THREE.Vector3().copy(direction).multiplyScalar(offsetsRef.current[i]).add(from)

      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.15
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.15
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.15
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positionsRef.current!}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={new THREE.Color(0.2, 1.0, 1.0)}
        size={0.2}
        sizeAttenuation
        transparent
        opacity={0.9}
        fog={false}
      />
    </points>
  )
}
