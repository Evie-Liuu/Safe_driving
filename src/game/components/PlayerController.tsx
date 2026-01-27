import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface PlayerControllerProps {
  position?: [number, number, number]
  speed?: number
  rotationSpeed?: number
  onPositionChange?: (position: THREE.Vector3) => void
  onSpeedChange?: (speed: number) => void
  onRotationChange?: (rotation: number) => void
  onTriggerOncomingVehicle?: (playerPosition: THREE.Vector3, playerRotation: number) => void
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
  onSpeedChange,
  onRotationChange,
  onTriggerOncomingVehicle,
  children,
  isCruising = false,
  cruisePoints = [],
  isBraking = false,
  laneOffset = 0,
  targetSpeedFactor = 0
}: PlayerControllerProps & {
  isCruising?: boolean
  cruisePoints?: [number, number, number][]
  isBraking?: boolean
  laneOffset?: number
  targetSpeedFactor?: number // 0 = full brake, 1 = full speed
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const currentPointIndex = useRef(0)
  const speedFactor = useRef(1)
  const currentLaneOffset = useRef(0)
  const lastTriggerTime = useRef(0)
  const nextTriggerDelay = useRef(Math.random() * 10 + 5) // 5-15秒隨機間隔

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
      if (isCruising) return // 巡航模式下禁用鍵盤

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
  }, [isCruising])

  // 重置按鍵狀態當進入巡航模式
  useEffect(() => {
    if (isCruising) {
      setKeys({
        forward: false,
        backward: false,
        left: false,
        right: false
      })
      // Reset speed factor to avoid rapid overshooting when starting cruise
      speedFactor.current = 0
    }
  }, [isCruising])

  // 更新玩家位置和相機
  useFrame((state, delta) => {
    if (!groupRef.current) return

    // 更新速度因子
    if (isCruising) {
      const minSpeed = isBraking ? targetSpeedFactor : 1
      if (speedFactor.current > minSpeed) {
        speedFactor.current = Math.max(minSpeed, speedFactor.current - delta * 2)
      } else {
        speedFactor.current = Math.min(1, speedFactor.current + delta * 2)
      }
    } else {
      speedFactor.current = 1
    }

    const currentSpeed = speed * speedFactor.current
    const moveSpeed = currentSpeed * delta
    const turnSpeed = rotationSpeed * delta

    // 回調速度變化
    if (onSpeedChange) {
      onSpeedChange(currentSpeed)
    }

    // Smoothly interpolate lane offset
    if (isCruising) {
      const targetOffset = laneOffset
      const offsetDiff = targetOffset - currentLaneOffset.current
      currentLaneOffset.current += offsetDiff * Math.min(1, delta * 3) // Smooth lerp
    } else {
      currentLaneOffset.current = 0
    }

    if (isCruising && cruisePoints.length > 0) {
      // 隨機觸發對向車輛
      if (onTriggerOncomingVehicle) {
        const currentTime = state.clock.getElapsedTime()
        if (currentTime - lastTriggerTime.current >= nextTriggerDelay.current) {
          // 觸發對向車輛
          onTriggerOncomingVehicle(
            groupRef.current.position.clone(),
            groupRef.current.rotation.y
          )
          // 更新時間和下次延遲
          lastTriggerTime.current = currentTime
          nextTriggerDelay.current = Math.random() * 10 + 5 // 5-15秒隨機間隔
        }
      }

      // 巡航邏輯
      const targetPoint = new THREE.Vector3(...cruisePoints[currentPointIndex.current])
      // Apply lane offset (perpendicular to forward direction on X axis)
      if (Math.abs(currentLaneOffset.current) > 0.01) {
        targetPoint.x += currentLaneOffset.current
      }
      const currentPos = groupRef.current.position.clone()

      const direction = targetPoint.clone().sub(currentPos)

      // Ignore Y axis for distance and rotation to prevent spiraling if height differs
      const flatDirection = new THREE.Vector3(direction.x, 0, direction.z)
      const distance = flatDirection.length()

      if (distance < 0.5) {
        // 到達目標點，切換到下一個點
        currentPointIndex.current = (currentPointIndex.current + 1) % cruisePoints.length
      } else {
        // 移動向目標
        // Avoid zero vector normalization
        if (flatDirection.lengthSq() > 0.0001) {
          flatDirection.normalize()

          // 平滑轉向
          const targetRotation = Math.atan2(flatDirection.x, flatDirection.z)
          let rotationDiff = targetRotation - groupRef.current.rotation.y

          // 確保旋轉角度在 -PI 到 PI 之間
          while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
          while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2

          if (Math.abs(rotationDiff) > 0.05) {
            groupRef.current.rotation.y += rotationDiff * turnSpeed * 2 // 轉向稍微快一點
          } else {
            groupRef.current.rotation.y = targetRotation
          }
        }

        // 向前移動
        groupRef.current.translateZ(moveSpeed)
      }

    } else {
      // 手動控制邏輯
      // 移動
      if (keys.forward) {
        groupRef.current.translateZ(moveSpeed)
      }
      if (keys.backward) {
        groupRef.current.translateZ(-moveSpeed)
      }

      // 旋轉
      if (keys.left) {
        groupRef.current.rotateY(turnSpeed)
      }
      if (keys.right) {
        groupRef.current.rotateY(-turnSpeed)
      }
    }

    // 更新相機位置（第一人稱視角）
    if (enableCameraFollow) {
      // // Offset for Driver's eye position (approximate)
      // const offset = new THREE.Vector3(0, 1.2, 0.5)
      // offset.applyQuaternion(groupRef.current.quaternion)

      // const cameraPos = groupRef.current.position.clone().add(offset)
      // camera.position.copy(cameraPos)

      // // Look at a point in front of the car
      // const lookOffset = new THREE.Vector3(0, 1.2, 10) // 10 units forward
      // lookOffset.applyQuaternion(groupRef.current.quaternion)
      // const lookTarget = groupRef.current.position.clone().add(lookOffset)

      // camera.lookAt(lookTarget)

      // 更新相機位置（第三人稱視角）
      const offset = new THREE.Vector3(1, 4, -8)
      offset.applyQuaternion(groupRef.current.quaternion)
      camera.position.copy(groupRef.current.position).add(offset)
      camera.lookAt(groupRef.current.position)
    }

    // 回調位置變化
    if (onPositionChange) {
      onPositionChange(groupRef.current.position)
    }

    // 回調旋轉變化
    if (onRotationChange) {
      onRotationChange(groupRef.current.rotation.y)
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
