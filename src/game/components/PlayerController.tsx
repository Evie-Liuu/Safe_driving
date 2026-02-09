import { useRef, useEffect, useState, useLayoutEffect } from 'react'
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
  onCruiseComplete?: () => void
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
  onCruiseComplete,
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
  const cruiseCompletedRef = useRef(false)

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
      const currentIdx = currentPointIndex.current
      const targetPoint = new THREE.Vector3(...cruisePoints[currentIdx])
      const currentPos = groupRef.current.position.clone()

      // Calculate path direction from PREVIOUS cruise point to CURRENT target
      // This gives a stable reference direction independent of player's offset position
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : cruisePoints.length - 1
      const prevPoint = new THREE.Vector3(...cruisePoints[prevIdx])
      const pathDirection = new THREE.Vector3(
        targetPoint.x - prevPoint.x,
        0,
        targetPoint.z - prevPoint.z
      )

      // If path direction is too short (same point), fall back to player-to-target direction
      const toTarget = new THREE.Vector3(
        targetPoint.x - currentPos.x,
        0,
        targetPoint.z - currentPos.z
      )
      if (pathDirection.lengthSq() < 0.01) {
        pathDirection.copy(toTarget)
      }
      pathDirection.normalize()

      // Calculate perpendicular direction for lane offset (rotate 90 degrees on XZ plane)
      // (x, z) -> (-z, x) gives left direction when facing forward
      const perpendicular = new THREE.Vector3(-pathDirection.z, 0, pathDirection.x)

      // Calculate offset target: target point + perpendicular offset
      const offsetTargetPoint = targetPoint.clone()
      if (Math.abs(currentLaneOffset.current) > 0.01) {
        offsetTargetPoint.add(perpendicular.clone().multiplyScalar(currentLaneOffset.current))
      }

      // Check distance to OFFSET target for point switching (not original target)
      // This prevents getting stuck when offset keeps player far from original target
      const toOffsetTarget = new THREE.Vector3(
        offsetTargetPoint.x - currentPos.x,
        0,
        offsetTargetPoint.z - currentPos.z
      )
      const distanceToOffsetTarget = toOffsetTarget.length()

      // Improved Waypoint Switching Logic
      // Check 1: Close enough (Relaxed from 0.5 to 1.5)
      const hitThreshold = 1.5
      const isCloseEnough = distanceToOffsetTarget < hitThreshold

      // Check 2: Passed the point (Dot product)
      // pathDirection points to the target.
      // toOffsetTarget points FROM player TO target.
      // If dot product is negative, player has passed the target "plane".
      const distanceAhead = toOffsetTarget.dot(pathDirection)
      const isPassed = distanceAhead < 0

      // Check 3: Corridor width (Rejection)
      // Only switch if we passed AND we are relatively close to the path line (e.g. 5m)
      const isWithinCorridor = distanceToOffsetTarget < 5.0

      if (isCloseEnough || (isPassed && isWithinCorridor)) {
        // 到達目標點，切換到下一個點
        const nextIdx = currentPointIndex.current + 1
        if (nextIdx >= cruisePoints.length) {
          // 巡航結束
          if (!cruiseCompletedRef.current) {
            cruiseCompletedRef.current = true
            onCruiseComplete?.()
          }
        } else {
          currentPointIndex.current = nextIdx
        }
      } else {
        // 移動向目標
        if (toOffsetTarget.lengthSq() > 0.0001) {
          toOffsetTarget.normalize()

          // 平滑轉向
          const targetRotation = Math.atan2(toOffsetTarget.x, toOffsetTarget.z)
          let rotationDiff = targetRotation - groupRef.current.rotation.y

          // 確保旋轉角度在 -PI 到 PI 之間
          while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
          while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2

          // Use constant angular velocity for stable turning
          // Prevents overshoot and provides consistent turning radius
          const maxTurnStep = turnSpeed // defined as rotationSpeed * delta

          if (Math.abs(rotationDiff) < maxTurnStep) {
            groupRef.current.rotation.y = targetRotation
          } else {
            groupRef.current.rotation.y += Math.sign(rotationDiff) * maxTurnStep
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
      // const eyeOffset = new THREE.Vector3(0, 3, -0.35)
      const eyeOffset = new THREE.Vector3(0, 3, -1.65)
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

  // Initial position and rotation setup
  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2])
      groupRef.current.rotation.set(0, -Math.PI, 0)
    }
  }, []) // Only run once on mount

  return (
    <group ref={groupRef}>
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
