import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'

interface AnimationConfig {
  name: string
  loop: THREE.AnimationActionLoopStyles
  timeScale?: number
  weight?: number
  clampWhenFinished?: boolean
  fadeIn?: number
  fadeOut?: number
}

/**
 * 動畫控制器
 * 支援骨架和動畫分離的系統
 */
export class AnimationController {
  private mixer: THREE.AnimationMixer
  private actions: Map<string, THREE.AnimationAction> = new Map()
  private currentAction: THREE.AnimationAction | null = null
  private animations: Map<string, THREE.AnimationClip> = new Map()

  constructor(model: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(model)
  }

  /**
   * 從 GLTF 加載動畫
   * @param gltf GLTF 物件
   */
  loadAnimationsFromGLTF(gltf: GLTF) {
    if (gltf.animations && gltf.animations.length > 0) {
      gltf.animations.forEach((clip) => {
        this.addAnimationClip(clip)
      })
    }
  }

  /**
   * 從外部檔案加載動畫（支援動畫分離）
   * @param animationGltf 包含動畫的 GLTF 物件
   * @param targetModel 目標模型
   */
  loadSeparateAnimations(animationGltf: GLTF, targetModel: THREE.Object3D) {
    if (animationGltf.animations && animationGltf.animations.length > 0) {
      animationGltf.animations.forEach((clip) => {
        // 重新定位動畫軌道到目標模型的骨架
        const retargetedClip = this.retargetAnimation(clip, targetModel)
        this.addAnimationClip(retargetedClip)
      })
    }
  }

  /**
   * 重新定位動畫到新骨架
   * @param clip 動畫剪輯
   * @param targetModel 目標模型
   * @returns 重新定位後的動畫剪輯
   */
  private retargetAnimation(
    clip: THREE.AnimationClip,
    targetModel: THREE.Object3D
  ): THREE.AnimationClip {
    const tracks: THREE.KeyframeTrack[] = []

    clip.tracks.forEach((track) => {
      // 解析軌道名稱
      const parts = track.name.split('.')
      const boneName = parts[0]

      // 在目標模型中尋找對應的骨骼
      let targetBone: THREE.Object3D | undefined
      targetModel.traverse((child) => {
        if (child.name === boneName) {
          targetBone = child
        }
      })

      if (targetBone) {
        // 創建新軌道，使用目標骨骼的 UUID
        const newTrackName = `${targetBone.uuid}.${parts.slice(1).join('.')}`
        const TrackConstructor = track.constructor as any
        const newTrack = new TrackConstructor(
          newTrackName,
          track.times,
          track.values,
          track.getInterpolation()
        )
        tracks.push(newTrack)
      }
    })

    return new THREE.AnimationClip(clip.name, clip.duration, tracks)
  }

  /**
   * 添加動畫剪輯
   * @param clip 動畫剪輯
   */
  addAnimationClip(clip: THREE.AnimationClip) {
    this.animations.set(clip.name, clip)
    const action = this.mixer.clipAction(clip)
    this.actions.set(clip.name, action)
  }
  /**
   * 播放動畫
   * @param name 動畫名稱
   * @param config 動畫配置
   */
  play(name: string, config?: Partial<AnimationConfig>) {
    const action = this.actions.get(name)
    if (!action) {
      console.warn(`Animation "${name}" not found`)
      return
    }

    // 應用配置
    if (config) {
      if (config.loop !== undefined) action.loop = config.loop
      if (config.timeScale !== undefined) action.timeScale = config.timeScale
      if (config.weight !== undefined) action.setEffectiveWeight(config.weight)
      if (config.clampWhenFinished !== undefined)
        action.clampWhenFinished = config.clampWhenFinished
    }

    const fadeInDuration = config?.fadeIn !== undefined ? config.fadeIn : 0.5
    const fadeOutDuration = config?.fadeOut !== undefined ? config.fadeOut : 0.5

    // 淡出當前動畫
    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.fadeOut(fadeOutDuration)
    }

    // 淡入新動畫
    action.reset()
    if (fadeInDuration > 0) {
      action.fadeIn(fadeInDuration)
    } else {
      action.setEffectiveWeight(1) // Ensure full weight immediately if no fade
    }
    action.play()

    this.currentAction = action
  }

  /**
   * 停止動畫
   * @param name 動畫名稱
   */
  stop(name: string) {
    const action = this.actions.get(name)
    if (action) {
      action.stop()
    }
  }

  /**
   * 停止所有動畫
   */
  stopAll() {
    this.actions.forEach((action) => action.stop())
    this.currentAction = null
  }

  /**
   * 混合兩個動畫
   * @param name1 動畫1名稱
   * @param name2 動畫2名稱
   * @param weight 混合權重（0-1）
   */
  blend(name1: string, name2: string, weight: number) {
    const action1 = this.actions.get(name1)
    const action2 = this.actions.get(name2)

    if (action1 && action2) {
      action1.setEffectiveWeight(1 - weight)
      action2.setEffectiveWeight(weight)

      if (!action1.isRunning()) action1.play()
      if (!action2.isRunning()) action2.play()
    }
  }

  /**
   * 更新動畫混合器
   * @param deltaTime 時間增量
   */
  update(deltaTime: number) {
    this.mixer.update(deltaTime)
  }

  /**
   * 獲取所有動畫名稱
   */
  getAnimationNames(): string[] {
    return Array.from(this.animations.keys())
  }

  /**
   * 獲取當前播放的動畫名稱
   */
  getCurrentAnimationName(): string | null {
    if (!this.currentAction) return null

    for (const [name, action] of this.actions.entries()) {
      if (action === this.currentAction) {
        return name
      }
    }

    return null
  }

  /**
   * 設置動畫速度
   * @param speed 速度倍率
   */
  setTimeScale(speed: number) {
    if (this.currentAction) {
      this.currentAction.timeScale = speed
    }
  }

  /**
   * 設置全局 mixer timeScale（影響所有動畫）
   * @param speed 速度倍率
   */
  setMixerTimeScale(speed: number) {
    this.mixer.timeScale = speed
  }

  /**
   * 獲取全局 mixer timeScale
   */
  getMixerTimeScale(): number {
    return this.mixer.timeScale
  }

  /**
   * 手動更新 mixer（用於設置初始姿勢）
   * @param deltaTime 時間增量
   */
  updateMixer(deltaTime: number) {
    this.mixer.update(deltaTime)
  }

  /**
   * 銷毀動畫控制器
   */
  dispose() {
    this.stopAll()
    this.mixer.uncacheRoot(this.mixer.getRoot())
    this.actions.clear()
    this.animations.clear()
  }
}
