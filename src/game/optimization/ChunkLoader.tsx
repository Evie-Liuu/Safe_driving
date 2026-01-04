import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Chunk {
  id: string
  position: [number, number, number]
  size: number
  content: JSX.Element
  isLoaded: boolean
}

interface ChunkLoaderProps {
  chunkSize: number // 每個分塊的大小
  viewDistance: number // 視距（加載範圍）
  chunks: Omit<Chunk, 'isLoaded'>[] // 所有分塊的配置
  centerPosition?: [number, number, number] // 中心位置（通常是玩家位置）
}

/**
 * 分塊加載系統
 * 只加載視距範圍內的分塊，優化大場域性能
 */
export function ChunkLoader({
  chunkSize,
  viewDistance,
  chunks,
  centerPosition = [0, 0, 0]
}: ChunkLoaderProps) {
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set())
  const centerRef = useRef<THREE.Vector3>(new THREE.Vector3(...centerPosition))

  // 更新中心位置
  useEffect(() => {
    centerRef.current.set(...centerPosition)
  }, [centerPosition])

  // 每幀檢查需要加載/卸載的分塊
  useFrame(() => {
    const newLoadedChunks = new Set<string>()

    chunks.forEach((chunk) => {
      const chunkPos = new THREE.Vector3(...chunk.position)
      const distance = centerRef.current.distanceTo(chunkPos)

      // 如果在視距範圍內，標記為需要加載
      if (distance <= viewDistance) {
        newLoadedChunks.add(chunk.id)
      }
    })

    // 只在有變化時更新狀態
    if (!areSetsEqual(loadedChunks, newLoadedChunks)) {
      setLoadedChunks(newLoadedChunks)
    }
  })

  return (
    <group>
      {chunks.map((chunk) => {
        const isLoaded = loadedChunks.has(chunk.id)
        return isLoaded ? (
          <group key={chunk.id} position={chunk.position}>
            {chunk.content}
          </group>
        ) : null
      })}
    </group>
  )
}

/**
 * 比較兩個 Set 是否相等
 */
function areSetsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
  if (set1.size !== set2.size) return false
  for (const item of set1) {
    if (!set2.has(item)) return false
  }
  return true
}

/**
 * Hook: 生成網格狀分塊配置
 */
export function useGridChunks(
  gridSize: number, // 網格大小（例如 10x10）
  chunkSize: number,
  generateContent: (x: number, z: number) => JSX.Element
): Omit<Chunk, 'isLoaded'>[] {
  return Array.from({ length: gridSize * gridSize }, (_, index) => {
    const x = Math.floor(index / gridSize)
    const z = index % gridSize

    return {
      id: `chunk_${x}_${z}`,
      position: [
        x * chunkSize - (gridSize * chunkSize) / 2,
        0,
        z * chunkSize - (gridSize * chunkSize) / 2
      ] as [number, number, number],
      size: chunkSize,
      content: generateContent(x, z)
    }
  })
}
