import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface LODLevel {
  distance: number
  model: JSX.Element
}

interface LODSystemProps {
  levels: LODLevel[]
  position?: [number, number, number]
  hysteresis?: number // 距離切換的遲滯值，避免頻繁切換
}

/**
 * LOD（Level of Detail）系統
 * 根據相機距離自動切換不同細節級別的模型
 */
export function LODSystem({
  levels,
  position = [0, 0, 0],
  hysteresis = 0.1
}: LODSystemProps) {
  const groupRef = useRef<THREE.Group>(null)
  const currentLevelRef = useRef<number>(0)

  // 排序 LOD 級別（距離由小到大）
  const sortedLevels = useMemo(() => {
    return [...levels].sort((a, b) => a.distance - b.distance)
  }, [levels])

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    // 計算距離
    const distance = camera.position.distanceTo(
      new THREE.Vector3(...position)
    )

    // 找到合適的 LOD 級別
    let newLevel = 0
    for (let i = 0; i < sortedLevels.length; i++) {
      if (distance < sortedLevels[i].distance) {
        newLevel = i
        break
      }
      newLevel = i
    }

    // 使用遲滯值避免頻繁切換
    const currentDistance = sortedLevels[currentLevelRef.current].distance
    const newDistance = sortedLevels[newLevel].distance
    const diff = Math.abs(currentDistance - newDistance)

    if (diff > hysteresis * newDistance) {
      currentLevelRef.current = newLevel

      // 顯示/隱藏對應的模型
      groupRef.current.children.forEach((child, index) => {
        child.visible = index === newLevel
      })
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {sortedLevels.map((level, index) => (
        <group key={index} visible={index === 0}>
          {level.model}
        </group>
      ))}
    </group>
  )
}

/**
 * Hook: 創建 LOD 模型配置
 */
export function useLODLevels(
  highDetail: JSX.Element,
  mediumDetail: JSX.Element,
  lowDetail: JSX.Element,
  distances = [10, 30, 100]
): LODLevel[] {
  return useMemo(
    () => [
      { distance: distances[0], model: highDetail },
      { distance: distances[1], model: mediumDetail },
      { distance: distances[2], model: lowDetail }
    ],
    [highDetail, mediumDetail, lowDetail, distances]
  )
}
