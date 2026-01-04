import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'
import { GLTFLoader } from 'three-stdlib'
import { AnimationController } from './AnimationController'

interface AnimatedModelProps {
  modelUrl: string
  animationUrls?: string[] // 外部動畫檔案（支援動畫分離）
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  autoPlay?: string // 自動播放的動畫名稱
  onLoad?: (controller: AnimationController) => void
}

/**
 * 支援骨架動畫的模型組件
 * 可從模型本身或外部檔案加載動畫
 */
export function AnimatedModel({
  modelUrl,
  animationUrls = [],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  autoPlay,
  onLoad
}: AnimatedModelProps) {
  const gltf = useGLTF(modelUrl) as GLTF
  const groupRef = useRef<THREE.Group>(null)
  const [controller, setController] = useState<AnimationController | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化動畫控制器
  useEffect(() => {
    if (!gltf.scene) return

    const animController = new AnimationController(gltf.scene)

    // 加載模型自帶的動畫
    animController.loadAnimationsFromGLTF(gltf)

    // 加載外部動畫檔案（動畫分離）
    const loadExternalAnimations = async () => {
      for (const url of animationUrls) {
        try {
          const animGltf = await new Promise<GLTF>((resolve, reject) => {
            const loader = new GLTFLoader()
            loader.load(
              url,
              (result) => resolve(result),
              undefined,
              reject
            )
          })
          animController.loadSeparateAnimations(animGltf, gltf.scene)
        } catch (error) {
          console.error(`Failed to load animation from ${url}:`, error)
        }
      }

      setController(animController)
      setIsLoading(false)

      // 自動播放
      if (autoPlay) {
        animController.play(autoPlay)
      }

      // 回調
      if (onLoad) {
        onLoad(animController)
      }
    }

    if (animationUrls.length > 0) {
      loadExternalAnimations()
    } else {
      setController(animController)
      setIsLoading(false)

      if (autoPlay) {
        animController.play(autoPlay)
      }

      if (onLoad) {
        onLoad(animController)
      }
    }

    return () => {
      animController.dispose()
    }
  }, [gltf, animationUrls, autoPlay, onLoad])

  // 更新動畫
  useFrame((state, delta) => {
    if (controller) {
      controller.update(delta)
    }
  })

  if (isLoading) {
    return null
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  )
}

/**
 * Hook: 使用動畫控制器
 */
export function useAnimationController(
  modelUrl: string,
  animationUrls: string[] = []
) {
  const [controller, setController] = useState<AnimationController | null>(null)

  useEffect(() => {
    let animController: AnimationController | null = null

    const loadModel = async () => {
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        const loader = new GLTFLoader()
        loader.load(
          modelUrl,
          (result) => resolve(result),
          undefined,
          reject
        )
      })

      animController = new AnimationController(gltf.scene)
      animController.loadAnimationsFromGLTF(gltf)

      // 加載外部動畫
      for (const url of animationUrls) {
        try {
          const animGltf = await new Promise<GLTF>((resolve, reject) => {
            const loader = new GLTFLoader()
            loader.load(
              url,
              (result) => resolve(result),
              undefined,
              reject
            )
          })
          animController.loadSeparateAnimations(animGltf, gltf.scene)
        } catch (error) {
          console.error(`Failed to load animation from ${url}:`, error)
        }
      }

      setController(animController)
    }

    loadModel()

    return () => {
      if (animController) {
        animController.dispose()
      }
    }
  }, [modelUrl, animationUrls])

  return controller
}
