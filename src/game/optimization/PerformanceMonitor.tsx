import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PerformanceStats {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
  memoryUsage?: number
}

interface PerformanceMonitorProps {
  enabled?: boolean
  onStats?: (stats: PerformanceStats) => void
  updateInterval?: number // 更新間隔（秒）
}

/**
 * 性能監控器
 * 監控 FPS、渲染統計和記憶體使用
 */
export function PerformanceMonitor({
  enabled = true,
  onStats,
  updateInterval = 1
}: PerformanceMonitorProps) {
  const { gl, scene } = useThree()
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    programs: 0
  })

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const accumulatedTimeRef = useRef(0)

  useFrame((state, delta) => {
    if (!enabled) return

    frameCountRef.current++
    accumulatedTimeRef.current += delta

    // 每隔 updateInterval 秒更新一次統計
    if (accumulatedTimeRef.current >= updateInterval) {
      const currentTime = performance.now()
      const elapsedTime = (currentTime - lastTimeRef.current) / 1000
      const fps = Math.round(frameCountRef.current / elapsedTime)
      const frameTime = (elapsedTime / frameCountRef.current) * 1000

      // 獲取渲染統計
      const info = gl.info

      const newStats: PerformanceStats = {
        fps,
        frameTime: Math.round(frameTime * 100) / 100,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length || 0
      }

      // 嘗試獲取記憶體使用（僅在支援的瀏覽器）
      if ((performance as any).memory) {
        newStats.memoryUsage = Math.round(
          (performance as any).memory.usedJSHeapSize / 1048576
        )
      }

      setStats(newStats)

      if (onStats) {
        onStats(newStats)
      }

      // 重置計數器
      frameCountRef.current = 0
      lastTimeRef.current = currentTime
      accumulatedTimeRef.current = 0
    }
  })

  return null
}

/**
 * Hook: 使用性能統計
 */
export function usePerformanceStats(updateInterval: number = 1) {
  const [stats, setStats] = useState<PerformanceStats | null>(null)

  return { stats, setStats }
}

/**
 * 性能優化建議
 */
export function getPerformanceRecommendations(
  stats: PerformanceStats
): string[] {
  const recommendations: string[] = []

  if (stats.fps < 30) {
    recommendations.push('FPS 過低，建議降低模型複雜度或減少渲染物件')
  }

  if (stats.drawCalls > 1000) {
    recommendations.push('Draw Calls 過多，建議使用 Instancing 或合併模型')
  }

  if (stats.triangles > 1000000) {
    recommendations.push('三角形數量過多，建議使用 LOD 或簡化模型')
  }

  if (stats.textures > 50) {
    recommendations.push('材質數量過多，建議使用材質圖集或減少材質')
  }

  if (stats.memoryUsage && stats.memoryUsage > 500) {
    recommendations.push('記憶體使用過高，建議清理未使用的資源')
  }

  return recommendations
}

/**
 * 自動優化等級
 */
export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

/**
 * 根據性能自動調整品質等級
 */
export function getAutoQualityLevel(stats: PerformanceStats): QualityLevel {
  if (stats.fps >= 60) return QualityLevel.ULTRA
  if (stats.fps >= 45) return QualityLevel.HIGH
  if (stats.fps >= 30) return QualityLevel.MEDIUM
  return QualityLevel.LOW
}
