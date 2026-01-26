import * as THREE from 'three'
import type { GLTF } from 'three-stdlib'
import { getSharedLoader } from '../utils/SharedLoader'

interface ModelCacheEntry {
  gltf: GLTF
  instances: THREE.Object3D[]
  loadTime: number
}

/**
 * 模型管理器
 * 負責模型的快取、實例化和記憶體管理
 */
export class ModelManager {
  private cache: Map<string, ModelCacheEntry> = new Map()
  private loadingPromises: Map<string, Promise<GLTF>> = new Map()
  private maxCacheSize: number = 100 // 最大快取數量
  private maxCacheAge: number = 300000 // 快取時間（5分鐘）

  /**
   * 獲取模型（從快取或加載）
   * @param url 模型 URL
   * @returns GLTF 物件
   */
  async getModel(url: string): Promise<GLTF> {
    // 檢查快取
    const cached = this.cache.get(url)
    if (cached) {
      return cached.gltf
    }

    // 檢查是否正在加載
    const loading = this.loadingPromises.get(url)
    if (loading) {
      return loading
    }

    // 開始加載
    const promise = this.loadModel(url)
    this.loadingPromises.set(url, promise)

    try {
      const gltf = await promise
      this.cacheModel(url, gltf)
      return gltf
    } finally {
      this.loadingPromises.delete(url)
    }
  }

  /**
   * 加載模型
   * @param url 模型 URL
   * @returns GLTF 物件
   */
  private async loadModel(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      getSharedLoader().load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        reject
      )
    })
  }

  /**
   * 快取模型
   * @param url 模型 URL
   * @param gltf GLTF 物件
   */
  private cacheModel(url: string, gltf: GLTF) {
    // 檢查快取大小
    if (this.cache.size >= this.maxCacheSize) {
      this.clearOldestCache()
    }

    this.cache.set(url, {
      gltf,
      instances: [],
      loadTime: Date.now()
    })
  }

  /**
   * 創建模型實例
   * @param url 模型 URL
   * @returns 模型克隆
   */
  async createInstance(url: string): Promise<THREE.Object3D> {
    const gltf = await this.getModel(url)
    const instance = gltf.scene.clone()

    const cacheEntry = this.cache.get(url)
    if (cacheEntry) {
      cacheEntry.instances.push(instance)
    }

    return instance
  }

  /**
   * 移除模型實例
   * @param url 模型 URL
   * @param instance 模型實例
   */
  removeInstance(url: string, instance: THREE.Object3D) {
    const cacheEntry = this.cache.get(url)
    if (cacheEntry) {
      const index = cacheEntry.instances.indexOf(instance)
      if (index > -1) {
        cacheEntry.instances.splice(index, 1)
      }
    }

    // 清理實例資源
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }

  /**
   * 清除最舊的快取
   */
  private clearOldestCache() {
    let oldestUrl: string | null = null
    let oldestTime = Infinity

    for (const [url, entry] of this.cache.entries()) {
      if (entry.loadTime < oldestTime && entry.instances.length === 0) {
        oldestTime = entry.loadTime
        oldestUrl = url
      }
    }

    if (oldestUrl) {
      this.cache.delete(oldestUrl)
    }
  }

  /**
   * 清理過期快取
   */
  cleanupExpiredCache() {
    const now = Date.now()
    for (const [url, entry] of this.cache.entries()) {
      if (
        now - entry.loadTime > this.maxCacheAge &&
        entry.instances.length === 0
      ) {
        this.cache.delete(url)
      }
    }
  }

  /**
   * 清除所有快取
   */
  clearAll() {
    this.cache.clear()
    this.loadingPromises.clear()
  }

  /**
   * 獲取快取統計
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingPromises.size,
      totalInstances: Array.from(this.cache.values()).reduce(
        (sum, entry) => sum + entry.instances.length,
        0
      )
    }
  }
}

// 全域模型管理器實例
export const modelManager = new ModelManager()
