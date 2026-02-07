import * as THREE from 'three'
import { AnimationController } from '../animations/AnimationController'

/**
 * Pooled actor instance
 */
export interface PooledActor {
    scene: THREE.Object3D
    mixer: THREE.AnimationMixer | null
    animationController: AnimationController | null
    modelUrl: string
    inUse: boolean
    lastUsedTime: number
}

/**
 * Pool statistics
 */
export interface PoolStats {
    totalPools: number
    totalActors: number
    inUseActors: number
    availableActors: number
    poolSizes: Map<string, { total: number; inUse: number; available: number }>
}

/**
 * Configuration for ActorPool
 */
export interface ActorPoolConfig {
    maxPoolSize: number          // Maximum actors per model type (default: 10)
    warmupCount: number           // Number of actors to preload (default: 3)
    enableLogging: boolean        // Enable detailed logging (default: true)
    idleTimeout: number           // Time in ms before idle actors can be disposed (default: 300000 = 5 min)
    enableIdleCleanup: boolean    // Auto-cleanup idle actors (default: false)
}

/**
 * Actor Pool
 * Manages reusable actor instances to reduce loading overhead
 */
export class ActorPool {
    private pools: Map<string, PooledActor[]> = new Map()
    private config: Required<ActorPoolConfig>
    private loadingPromises: Map<string, Promise<void>> = new Map()

    constructor(config: Partial<ActorPoolConfig> = {}) {
        this.config = {
            maxPoolSize: config.maxPoolSize ?? 10,
            warmupCount: config.warmupCount ?? 3,
            enableLogging: config.enableLogging ?? true,
            idleTimeout: config.idleTimeout ?? 300000, // 5 minutes
            enableIdleCleanup: config.enableIdleCleanup ?? false
        }
    }

    /**
     * Acquire an actor from the pool
     * Returns null if pool is empty (need to load new one)
     */
    acquire(modelUrl: string): PooledActor | null {
        const pool = this.pools.get(modelUrl)
        if (!pool || pool.length === 0) {
            if (this.config.enableLogging) {
                console.log(`[ActorPool] ❌ No available actors for model: ${modelUrl}`)
            }
            return null
        }

        // Find first available actor
        const actor = pool.find(a => !a.inUse)
        if (!actor) {
            if (this.config.enableLogging) {
                console.log(`[ActorPool] ⚠️ All actors in use for model: ${modelUrl}`)
            }
            return null
        }

        // Mark as in use
        actor.inUse = true
        actor.lastUsedTime = Date.now()

        if (this.config.enableLogging) {
            console.log(`[ActorPool] ✅ Acquired actor for model: ${modelUrl}`)
            console.log(`[ActorPool] 📊 Pool status: ${this.getPoolStatus(modelUrl)}`)
        }

        return actor
    }

    /**
     * Release an actor back to the pool
     */
    release(actor: PooledActor): void {
        const pool = this.pools.get(actor.modelUrl)
        if (!pool) {
            if (this.config.enableLogging) {
                console.warn(`[ActorPool] ⚠️ No pool found for model: ${actor.modelUrl}`)
            }
            this.disposeActor(actor)
            return
        }

        // Check if pool is at capacity
        if (pool.length >= this.config.maxPoolSize) {
            if (this.config.enableLogging) {
                console.log(`[ActorPool] 🗑️ Pool full, disposing actor: ${actor.modelUrl}`)
            }
            this.disposeActor(actor)
            // Remove from pool
            const index = pool.indexOf(actor)
            if (index > -1) {
                pool.splice(index, 1)
            }
            return
        }

        // Reset actor state
        this.resetActor(actor)
        actor.inUse = false
        actor.lastUsedTime = Date.now()

        if (this.config.enableLogging) {
            console.log(`[ActorPool] ♻️ Released actor back to pool: ${actor.modelUrl}`)
            console.log(`[ActorPool] 📊 Pool status: ${this.getPoolStatus(actor.modelUrl)}`)
        }
    }

    /**
     * Add a new actor to the pool
     */
    addToPool(
        modelUrl: string,
        scene: THREE.Object3D,
        animationController: AnimationController | null = null
    ): PooledActor {
        let pool = this.pools.get(modelUrl)
        if (!pool) {
            pool = []
            this.pools.set(modelUrl, pool)
        }

        // Clone the scene to avoid shared references
        const clonedScene = scene.clone()

        // AnimationController will be recreated for each pooled actor instance
        // so we don't store it in the pool
        const actor: PooledActor = {
            scene: clonedScene,
            mixer: null, // Will be set when actor is actually used
            animationController: null, // Will be recreated when actor is used
            modelUrl,
            inUse: false,
            lastUsedTime: Date.now()
        }

        pool.push(actor)

        if (this.config.enableLogging) {
            console.log(`[ActorPool] ➕ Added actor to pool: ${modelUrl}`)
            console.log(`[ActorPool] 📊 Pool size: ${pool.length}/${this.config.maxPoolSize}`)
        }

        return actor
    }

    /**
     * Warm up the pool by preloading actors
     */
    async warm(
        modelUrl: string,
        loadFunction: () => Promise<{ scene: THREE.Object3D; animationController?: AnimationController }>
    ): Promise<void> {
        // Check if already warming up
        if (this.loadingPromises.has(modelUrl)) {
            if (this.config.enableLogging) {
                console.log(`[ActorPool] ⏳ Already warming up: ${modelUrl}`)
            }
            return this.loadingPromises.get(modelUrl)!
        }

        if (this.config.enableLogging) {
            console.log(`[ActorPool] 🔥 Warming up pool for: ${modelUrl} (count: ${this.config.warmupCount})`)
        }

        const warmupPromise = (async () => {
            const loadPromises: Promise<void>[] = []

            for (let i = 0; i < this.config.warmupCount; i++) {
                const promise = loadFunction()
                    .then(({ scene, animationController }) => {
                        this.addToPool(modelUrl, scene, animationController || null)
                    })
                    .catch(error => {
                        console.error(`[ActorPool] Failed to load actor ${i} for ${modelUrl}:`, error)
                    })

                loadPromises.push(promise)
            }

            await Promise.all(loadPromises)

            if (this.config.enableLogging) {
                console.log(`[ActorPool] ✅ Warmup complete for: ${modelUrl}`)
            }

            this.loadingPromises.delete(modelUrl)
        })()

        this.loadingPromises.set(modelUrl, warmupPromise)
        return warmupPromise
    }

    /**
     * Reset actor to default state
     */
    private resetActor(actor: PooledActor): void {
        // Reset position and rotation
        actor.scene.position.set(0, 0, 0)
        actor.scene.rotation.set(0, 0, 0)
        actor.scene.scale.set(1, 1, 1)
        actor.scene.visible = true

        // Stop all animations
        if (actor.animationController) {
            actor.animationController.stopAll()
        }

        // Reset mixer
        if (actor.mixer) {
            actor.mixer.stopAllAction()
            actor.mixer.setTime(0)
        }
    }

    /**
     * Dispose a single actor
     */
    private disposeActor(actor: PooledActor): void {
        // Dispose animation controller
        if (actor.animationController) {
            actor.animationController.dispose()
        }

        // Dispose scene recursively
        this.disposeObject3D(actor.scene)
    }

    /**
     * Recursively dispose Object3D
     */
    private disposeObject3D(object: THREE.Object3D): void {
        if (object instanceof THREE.Mesh) {
            if (object.geometry) {
                object.geometry.dispose()
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => this.disposeMaterial(mat))
                } else {
                    this.disposeMaterial(object.material)
                }
            }
        }

        // Recursively dispose children
        object.children.forEach(child => this.disposeObject3D(child))
    }

    /**
     * Dispose material and its textures
     */
    private disposeMaterial(material: THREE.Material): void {
        const mat = material as any
        const textureProps = [
            'map', 'lightMap', 'bumpMap', 'normalMap',
            'specularMap', 'envMap', 'alphaMap', 'aoMap',
            'displacementMap', 'emissiveMap', 'gradientMap',
            'metalnessMap', 'roughnessMap'
        ]

        textureProps.forEach(prop => {
            if (mat[prop]?.dispose) {
                mat[prop].dispose()
            }
        })

        material.dispose()
    }

    /**
     * Clean up idle actors that haven't been used recently
     */
    cleanupIdle(): number {
        if (!this.config.enableIdleCleanup) {
            return 0
        }

        const now = Date.now()
        let cleanedCount = 0

        for (const [modelUrl, pool] of this.pools.entries()) {
            const toRemove: number[] = []

            pool.forEach((actor, index) => {
                if (!actor.inUse && (now - actor.lastUsedTime) > this.config.idleTimeout) {
                    this.disposeActor(actor)
                    toRemove.push(index)
                    cleanedCount++
                }
            })

            // Remove disposed actors from pool (reverse order to maintain indices)
            toRemove.reverse().forEach(index => {
                pool.splice(index, 1)
            })

            if (toRemove.length > 0 && this.config.enableLogging) {
                console.log(`[ActorPool] 🧹 Cleaned ${toRemove.length} idle actors for: ${modelUrl}`)
            }
        }

        return cleanedCount
    }

    /**
     * Get pool status string
     */
    private getPoolStatus(modelUrl: string): string {
        const pool = this.pools.get(modelUrl)
        if (!pool) return 'No pool'

        const inUse = pool.filter(a => a.inUse).length
        const available = pool.length - inUse

        return `${inUse} in use, ${available} available (total: ${pool.length}/${this.config.maxPoolSize})`
    }

    /**
     * Get pool statistics
     */
    getStats(): PoolStats {
        const poolSizes = new Map<string, { total: number; inUse: number; available: number }>()
        let totalActors = 0
        let inUseActors = 0

        for (const [modelUrl, pool] of this.pools.entries()) {
            const inUse = pool.filter(a => a.inUse).length
            const total = pool.length

            poolSizes.set(modelUrl, {
                total,
                inUse,
                available: total - inUse
            })

            totalActors += total
            inUseActors += inUse
        }

        return {
            totalPools: this.pools.size,
            totalActors,
            inUseActors,
            availableActors: totalActors - inUseActors,
            poolSizes
        }
    }

    /**
     * Get pool for a specific model
     */
    getPool(modelUrl: string): PooledActor[] {
        return this.pools.get(modelUrl) || []
    }

    /**
     * Check if a pool exists and has available actors
     */
    hasAvailable(modelUrl: string): boolean {
        const pool = this.pools.get(modelUrl)
        return pool ? pool.some(a => !a.inUse) : false
    }

    /**
     * Clear a specific pool
     */
    clearPool(modelUrl: string): void {
        const pool = this.pools.get(modelUrl)
        if (!pool) return

        pool.forEach(actor => this.disposeActor(actor))
        this.pools.delete(modelUrl)

        if (this.config.enableLogging) {
            console.log(`[ActorPool] 🗑️ Cleared pool: ${modelUrl}`)
        }
    }

    /**
     * Clear all pools
     */
    clear(): void {
        for (const [modelUrl] of this.pools.entries()) {
            this.clearPool(modelUrl)
        }

        if (this.config.enableLogging) {
            console.log(`[ActorPool] 🧹 Cleared all pools`)
        }
    }

    /**
     * Dispose the pool manager
     */
    dispose(): void {
        this.clear()
        this.loadingPromises.clear()
    }
}
