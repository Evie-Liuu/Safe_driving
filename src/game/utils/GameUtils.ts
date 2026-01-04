import * as THREE from 'three'

/**
 * 遊戲工具函數
 */

/**
 * 計算兩點之間的距離
 */
export function distance(
  a: THREE.Vector3,
  b: THREE.Vector3
): number {
  return a.distanceTo(b)
}

/**
 * 插值（線性）
 */
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t
}

/**
 * 向量插值
 */
export function lerpVector(
  start: THREE.Vector3,
  end: THREE.Vector3,
  t: number
): THREE.Vector3 {
  return new THREE.Vector3().lerpVectors(start, end, t)
}

/**
 * 限制數值範圍
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 角度轉弧度
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * 弧度轉角度
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * 隨機數範圍
 */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

/**
 * 隨機整數範圍
 */
export function randomIntRange(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1))
}

/**
 * 隨機向量（在球體內）
 */
export function randomVectorInSphere(radius: number): THREE.Vector3 {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const r = Math.cbrt(Math.random()) * radius

  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  )
}

/**
 * 碰撞檢測（球體）
 */
export function sphereCollision(
  pos1: THREE.Vector3,
  radius1: number,
  pos2: THREE.Vector3,
  radius2: number
): boolean {
  const dist = distance(pos1, pos2)
  return dist < radius1 + radius2
}

/**
 * 碰撞檢測（AABB 盒）
 */
export function boxCollision(
  box1: THREE.Box3,
  box2: THREE.Box3
): boolean {
  return box1.intersectsBox(box2)
}

/**
 * 射線檢測
 */
export function raycast(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  objects: THREE.Object3D[],
  maxDistance?: number
): THREE.Intersection[] {
  const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance)
  return raycaster.intersectObjects(objects, true)
}

/**
 * 簡單計時器
 */
export class Timer {
  private startTime: number = 0
  private pausedTime: number = 0
  private isPaused: boolean = false

  start() {
    this.startTime = performance.now()
    this.isPaused = false
  }

  pause() {
    if (!this.isPaused) {
      this.pausedTime = performance.now()
      this.isPaused = true
    }
  }

  resume() {
    if (this.isPaused) {
      this.startTime += performance.now() - this.pausedTime
      this.isPaused = false
    }
  }

  getElapsedTime(): number {
    if (this.isPaused) {
      return (this.pausedTime - this.startTime) / 1000
    }
    return (performance.now() - this.startTime) / 1000
  }

  reset() {
    this.startTime = performance.now()
    this.pausedTime = 0
    this.isPaused = false
  }
}

/**
 * 簡單事件系統
 */
export class EventEmitter {
  private events: Map<string, Function[]> = new Map()

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args))
    }
  }

  clear() {
    this.events.clear()
  }
}
