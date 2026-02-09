import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

interface PlayerVehicleProps {
  isMoving?: boolean
  isFalling?: boolean
  currentSpeed?: number
  characterModel?: string
  scooterModel?: string
}

/**
 * 玩家載具組件
 * 分別載入角色和機車模型，並應用駕駛動畫
 * 設計為 PlayerController 的子組件，會跟隨父組件移動
 */
export function PlayerVehicle({
  isMoving = true,
  isFalling = false,
  currentSpeed = 0,
  characterModel = '/src/assets/models/Player_Rigged.glb',
  scooterModel = '/src/assets/models/Scooter3_Rigged.glb'
}: PlayerVehicleProps) {
  const characterGroupRef = useRef<THREE.Group>(null)
  const scooterGroupRef = useRef<THREE.Group>(null)

  // 載入角色模型
  const characterGltf = useGLTF(characterModel)

  // 載入機車模型
  const scooterGltf = useGLTF(scooterModel)

  // 載入角色騎乘動畫
  const { animations: ridingAnimations } = useGLTF('/src/assets/animations/character/Male_Riding_Scooter_Animation.glb')

  // 載入機車移動動畫
  const { animations: scooterAnimations } = useGLTF('/src/assets/animations/car/Scooter_Moving_Animation.glb')

  // 載入摔倒動畫
  const { animations: fallingCharacterAnimations } = useGLTF('/src/assets/animations/character/Male_Falling_Scooter_Animation.glb')
  const { animations: fallingScooterAnimations } = useGLTF('/src/assets/animations/car/Scooter_Falling_Animation.glb')

  // 合併角色動畫
  const characterAnimations = useMemo(() => {
    return [
      ...(ridingAnimations || []),
      ...(fallingCharacterAnimations || [])
    ]
  }, [ridingAnimations, fallingCharacterAnimations])

  // 合併機車動畫
  const scooterOnlyAnimations = useMemo(() => {
    return [
      ...(scooterAnimations || []),
      ...(fallingScooterAnimations || [])
    ]
  }, [scooterAnimations, fallingScooterAnimations])

  // 處理角色動畫軌道
  const filteredCharacterAnimations = useMemo(() => {
    if (!characterAnimations || characterAnimations.length === 0) return []

    return characterAnimations.map(clip => {
      const newClip = clip.clone()
      // 可以在這裡過濾特定軌道以避免位置偏移
      newClip.tracks = newClip.tracks.filter(track => {
        const name = track.name.toLowerCase()
        // 保留所有軌道，或添加過濾邏輯
        return true
      })
      return newClip
    })
  }, [characterAnimations])

  // 處理機車動畫軌道
  const filteredScooterAnimations = useMemo(() => {
    if (!scooterOnlyAnimations || scooterOnlyAnimations.length === 0) return []

    return scooterOnlyAnimations.map(clip => {
      const newClip = clip.clone()
      newClip.tracks = newClip.tracks.filter(track => {
        const name = track.name.toLowerCase()
        return true
      })
      return newClip
    })
  }, [scooterOnlyAnimations])

  // 綁定角色動畫
  const { actions: characterActions, mixer: characterMixer } = useAnimations(
    filteredCharacterAnimations,
    characterGroupRef
  )

  // 綁定機車動畫
  const { actions: scooterActions, mixer: scooterMixer } = useAnimations(
    filteredScooterAnimations,
    scooterGroupRef
  )

  // 角色動畫控制
  useEffect(() => {
    if (!characterActions) return

    // 停止所有角色動畫
    Object.values(characterActions).forEach(action => action?.stop())

    if (isFalling) {
      // 播放摔倒動畫
      const fallingAction = characterActions['Male_Falling_Scooter_Animation']
      if (fallingAction) {
        fallingAction.reset().fadeIn(0.2).play()
        fallingAction.setLoop(THREE.LoopOnce, 1)
        fallingAction.clampWhenFinished = true
      }
    } else if (isMoving && currentSpeed > 0.1) {
      // 播放騎乘動畫
      const ridingAction = characterActions['Male_Riding_Scooter_Animation']
      if (ridingAction) {
        ridingAction.reset().fadeIn(0.3).play()
        ridingAction.setLoop(THREE.LoopRepeat, Infinity)

        // 根據速度調整動畫播放速度
        const speedFactor = Math.max(0.5, Math.min(2.0, currentSpeed / 16.67))
        ridingAction.timeScale = speedFactor
      }
    } else {
      // 靜止狀態
      const ridingAction = characterActions['Male_Riding_Scooter_Animation']
      if (ridingAction) {
        ridingAction.fadeOut(0.3)
      }
    }

    return () => {
      Object.values(characterActions).forEach(action => action?.fadeOut(0.3))
    }
  }, [characterActions, isMoving, isFalling, currentSpeed])

  // 機車動畫控制
  useEffect(() => {
    if (!scooterActions) return

    // 停止所有機車動畫
    Object.values(scooterActions).forEach(action => action?.stop())

    if (isFalling) {
      // 播放摔倒動畫
      const fallingAction = scooterActions['Scooter_Falling_Animation']
      if (fallingAction) {
        fallingAction.reset().fadeIn(0.2).play()
        fallingAction.setLoop(THREE.LoopOnce, 1)
        fallingAction.clampWhenFinished = true
      }
    } else if (isMoving && currentSpeed > 0.1) {
      // 播放移動動畫
      const movingAction = scooterActions['Scooter_Moving_Animation']
      if (movingAction) {
        movingAction.reset().fadeIn(0.3).play()
        movingAction.setLoop(THREE.LoopRepeat, Infinity)

        // 同步機車動畫速度
        const speedFactor = Math.max(0.5, Math.min(2.0, currentSpeed / 16.67))
        movingAction.timeScale = speedFactor
      }
    } else {
      // 靜止狀態
      const movingAction = scooterActions['Scooter_Moving_Animation']
      if (movingAction) {
        movingAction.fadeOut(0.3)
      }
    }

    return () => {
      Object.values(scooterActions).forEach(action => action?.fadeOut(0.3))
    }
  }, [scooterActions, isMoving, isFalling, currentSpeed])

  // 調試：輸出可用動畫
  useEffect(() => {
    if (characterActions && Object.keys(characterActions).length > 0) {
      console.log('Character animations:', Object.keys(characterActions))
    }
    if (scooterActions && Object.keys(scooterActions).length > 0) {
      console.log('Scooter animations:', Object.keys(scooterActions))
    }
  }, [characterActions, scooterActions])

  // 克隆場景以避免共享問題 - 使用 SkeletonUtils 以支持骨骼動畫
  const scooterScene = useMemo(() => SkeletonUtils.clone(scooterGltf.scene), [scooterGltf.scene])
  const characterScene = useMemo(() => SkeletonUtils.clone(characterGltf.scene), [characterGltf.scene])

  // 檢查模型是否載入完成
  if (!characterGltf.scene || !scooterGltf.scene || !scooterScene || !characterScene) {
    console.warn('PlayerVehicle: Models not loaded yet')
    return null
  }

  return (
    <group dispose={null}>
      {/* 機車模型 */}
      <group ref={scooterGroupRef}>
        <primitive object={scooterScene} />
      </group>

      {/* 角色模型 - 位置需要根據機車調整 */}
      <group ref={characterGroupRef}>
        <primitive object={characterScene} />
      </group>
    </group>
  )
}

// 預載入資源以提升性能
useGLTF.preload('/src/assets/models/Male1_Rigged.glb')
useGLTF.preload('/src/assets/models/Scooter3_Rigged.glb')
useGLTF.preload('/src/assets/animations/character/Male_Riding_Scooter_Animation.glb')
useGLTF.preload('/src/assets/animations/car/Scooter_Moving_Animation.glb')
useGLTF.preload('/src/assets/animations/character/Male_Falling_Scooter_Animation.glb')
useGLTF.preload('/src/assets/animations/car/Scooter_Falling_Animation.glb')
