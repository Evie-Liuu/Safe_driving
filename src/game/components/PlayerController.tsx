import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerControllerProps {
  position?: [number, number, number]
  speed?: number
  rotationSpeed?: number
  onPositionChange?: (position: THREE.Vector3) => void
  enableCameraFollow?: boolean
  children?: React.ReactNode
}

/**
 * 玩家控制器
 * 支援鍵盤和觸控操作
 */
export function PlayerController({
  position = [0, 0, 0],
  speed = 5,
  rotationSpeed = 2,
  enableCameraFollow = true,
  onPositionChange,
  children
}: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  // 鍵盤狀態
  const [keys, setKeys] = useState({
    forward: false,
    backward: false,
    left: false,
    right: false
  })

  // 監聽鍵盤事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys((k) => ({ ...k, forward: true }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys((k) => ({ ...k, backward: true }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys((k) => ({ ...k, left: true }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys((k) => ({ ...k, right: true }))
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys((k) => ({ ...k, forward: false }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys((k) => ({ ...k, backward: false }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys((k) => ({ ...k, left: false }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys((k) => ({ ...k, right: false }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 更新玩家位置和相機
  useFrame((state, delta) => {
    if (!groupRef.current) return

    const moveSpeed = speed * delta
    const turnSpeed = rotationSpeed * delta

    // 移動
    if (keys.forward) {
      groupRef.current.translateZ(-moveSpeed)
    }
    if (keys.backward) {
      groupRef.current.translateZ(moveSpeed)
    }

    // 旋轉
    if (keys.left) {
      groupRef.current.rotateY(turnSpeed)
    }
    if (keys.right) {
      groupRef.current.rotateY(-turnSpeed)
    }

    // 更新相機位置（第三人稱視角）
    if (enableCameraFollow) {
      const offset = new THREE.Vector3(0, 3, 8)
      offset.applyQuaternion(groupRef.current.quaternion)
      camera.position.copy(groupRef.current.position).add(offset)
      camera.lookAt(groupRef.current.position)
    }

    // 回調位置變化
    if (onPositionChange) {
      onPositionChange(groupRef.current.position)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {children}
    </group>
  )
}

/**
 * Hook: 使用鍵盤輸入
 */
export function useKeyboardControls() {
  const [keys, setKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: true }))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.code]: false }))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keys
}
