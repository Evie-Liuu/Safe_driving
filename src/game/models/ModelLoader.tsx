import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'
import { SkeletonUtils } from 'three-stdlib'
import { useMemo } from 'react'

interface ModelLoaderProps {
  url: string
  onLoad?: (gltf: GLTF) => void
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

/**
 * 基礎模型加載器組件
 * 支援 GLTF/GLB 格式
 */
export function ModelLoader({
  url,
  onLoad,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1]
}: ModelLoaderProps) {
  const gltf = useGLTF(url)
  // 複製模型場景，以便多個實例可以同時顯示
  const clonedScene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene])

  useEffect(() => {
    if (gltf && onLoad) {
      onLoad(gltf)
    }
  }, [gltf, onLoad])

  return (
    <primitive
      object={clonedScene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

/**
 * 預加載模型
 * @param urls 模型 URL 陣列
 */
export function preloadModels(urls: string[]) {
  urls.forEach(url => {
    useGLTF.preload(url)
  })
}

/**
 * Hook: 使用模型加載器
 * @param url 模型 URL
 * @returns GLTF 物件
 */
export function useModel(url: string) {
  return useGLTF(url)
}

/**
 * 清除模型快取
 * @param url 要清除的模型 URL（可選，不提供則清除所有）
 */
export function clearModelCache(url?: string) {
  if (url) {
    useGLTF.clear(url)
  } else {
    useGLTF.clear('')
  }
}
