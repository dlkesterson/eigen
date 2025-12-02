"use client"

import { useRef, useState } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"

interface DeviceOrbProps {
  device: {
    id: string
    name: string
    position: [number, number, number]
    isLocal: boolean
    isOnline: boolean
    isSyncing: boolean
    syncProgress: number
  }
  onClick: () => void
}

export default function DeviceOrb({ device, onClick }: DeviceOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.LineSegments>(null)
  const [isHovered, setIsHovered] = useState(false)

  useFrame(() => {
    if (device.isSyncing && meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
    if (glowRef.current) {
      glowRef.current.scale.x = 1 + Math.sin(Date.now() * 0.003) * 0.1
      glowRef.current.scale.y = 1 + Math.sin(Date.now() * 0.003) * 0.1
      glowRef.current.scale.z = 1 + Math.sin(Date.now() * 0.003) * 0.1
    }
    if (ringRef.current && device.isSyncing) {
      ringRef.current.rotation.z += 0.03
    }

    if (meshRef.current && glowRef.current) {
      const targetScale = isHovered ? 1.3 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)

      const glowTargetScale = isHovered ? 1.5 : 1
      glowRef.current.scale.x = glowRef.current.scale.x + (glowTargetScale - glowRef.current.scale.x) * 0.1
      glowRef.current.scale.y = glowRef.current.scale.y + (glowTargetScale - glowRef.current.scale.y) * 0.1
      glowRef.current.scale.z = glowRef.current.scale.z + (glowTargetScale - glowRef.current.scale.z) * 0.1
    }
  })

  const getOrbColor = () => {
    if (!device.isOnline) return [0.15, 0.2, 0.35]
    if (device.isSyncing) return [0.2, 0.95, 1.0]
    return [0.25, 0.5, 0.95]
  }

  const getGlowColor = () => {
    if (!device.isOnline) return [0.1, 0.12, 0.2]
    if (device.isSyncing) return [0.2, 1.0, 1.0]
    return [0.15, 0.6, 1.0]
  }

  const orbColor = getOrbColor()
  const glowColor = getGlowColor()
  const size = device.isLocal ? 1.2 : 0.6

  return (
    <group
      position={device.position}
      onClick={onClick}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[size, 4]} />
        <meshStandardMaterial
          color={new THREE.Color(...orbColor)}
          metalness={0.9}
          roughness={0.1}
          emissive={new THREE.Color(...orbColor)}
          emissiveIntensity={isHovered ? 1.5 : device.isSyncing ? 1.0 : 0.5}
        />
      </mesh>

      <mesh ref={glowRef}>
        <icosahedronGeometry args={[size * 1.3, 2]} />
        <meshBasicMaterial
          color={new THREE.Color(...glowColor)}
          transparent
          opacity={isHovered ? 0.5 : device.isOnline ? 0.25 : 0.08}
        />
      </mesh>

      <mesh>
        <icosahedronGeometry args={[size * 1.8, 2]} />
        <meshBasicMaterial
          color={new THREE.Color(...glowColor)}
          transparent
          opacity={isHovered ? 0.15 : device.isOnline ? 0.08 : 0.02}
        />
      </mesh>

      {device.isSyncing && (
        <lineSegments ref={ringRef}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={33}
              array={(() => {
                const size = device.isLocal ? 1.2 : 0.6
                const points = []
                for (let i = 0; i <= 32; i++) {
                  const angle = (i / 32) * Math.PI * 2
                  points.push(Math.cos(angle) * (size * 1.8), 0, Math.sin(angle) * (size * 1.8))
                }
                return new Float32Array(points)
              })()}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={new THREE.Color(...orbColor)} opacity={0.8} transparent linewidth={3} />
        </lineSegments>
      )}
    </group>
  )
}
