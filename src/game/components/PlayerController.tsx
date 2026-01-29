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
      const currentPos = groupRef.current.position.clone()

      // Calculate path direction (from current position to target, ignoring Y)
      const pathDirection = new THREE.Vector3(
        targetPoint.x - currentPos.x,
        0,
        targetPoint.z - currentPos.z
      )
      const distanceToTarget = pathDirection.length()

      if (distanceToTarget < 0.5) {
        // 到達目標點，切換到下一個點
        currentPointIndex.current = (currentPointIndex.current + 1) % cruisePoints.length
      } else {
        // Calculate perpendicular direction for lane offset (rotate path direction 90 degrees)
        // Perpendicular on XZ plane: (x, z) -> (-z, x) for left offset
        const perpendicular = new THREE.Vector3(-pathDirection.z, 0, pathDirection.x).normalize()

        // Apply lane offset perpendicular to path direction
        const offsetTargetPoint = targetPoint.clone()
        if (Math.abs(currentLaneOffset.current) > 0.01) {
          offsetTargetPoint.add(perpendicular.multiplyScalar(currentLaneOffset.current))
        }

        // Direction to offset target point (for actual movement)
        const directionToOffset = offsetTargetPoint.clone().sub(currentPos)
        const flatDirectionToOffset = new THREE.Vector3(directionToOffset.x, 0, directionToOffset.z)

        // 移動向目標
        if (flatDirectionToOffset.lengthSq() > 0.0001) {
          flatDirectionToOffset.normalize()

          // 平滑轉向 - use direction to offset target
          const targetRotation = Math.atan2(flatDirectionToOffset.x, flatDirectionToOffset.z)
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

    // 更新相機位置（機車騎士第一人稱視角）
    if (enableCameraFollow) {
      // 騎士眼睛位置：高度約 1.5m，稍微前方 0.3m
      const eyeOffset = new THREE.Vector3(0, 2.5, -1.0)
      eyeOffset.applyQuaternion(groupRef.current.quaternion)
      camera.position.copy(groupRef.current.position).add(eyeOffset)

      // 看向前方遠處
      const lookOffset = new THREE.Vector3(0, 1.3, 20)
      lookOffset.applyQuaternion(groupRef.current.quaternion)
      const lookTarget = groupRef.current.position.clone().add(lookOffset)
      camera.lookAt(lookTarget)
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
    <group ref={groupRef} position={position} rotation={[0, -Math.PI, 0]}>
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
