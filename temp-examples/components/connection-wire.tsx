"use client"

import * as THREE from "three"
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"

interface ConnectionWireProps {
  fromPos: [number, number, number]
  toPos: [number, number, number]
  isActive: boolean
}

export default function ConnectionWire({ fromPos, toPos, isActive }: ConnectionWireProps) {
  const color = isActive ? [0.2, 1.0, 1.0] : [0.15, 0.4, 0.8]
  const glowRef = useRef<THREE.LineSegments>(null)

  useFrame(() => {
    if (glowRef.current && isActive) {
      glowRef.current.material.opacity = 0.3 + Math.sin(Date.now() * 0.003) * 0.15
    }
  })

  const positions = new Float32Array([...fromPos, ...toPos])

  return (
    <group>
      <lineSegments>
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" count={2} array={positions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial
          color={new THREE.Color(...color)}
          linewidth={2}
          fog={false}
          opacity={isActive ? 1.0 : 0.4}
          transparent
        />
      </lineSegments>

      {isActive && (
        <lineSegments ref={glowRef}>
          <bufferGeometry attach="geometry">
            <bufferAttribute attach="attributes-position" count={2} array={positions} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={new THREE.Color(...color)} linewidth={6} fog={false} opacity={0.3} transparent />
        </lineSegments>
      )}
    </group>
  )
}
