import * as THREE from 'three'

/**
 * Resources to be cleaned up for an event
 */
export interface CleanupResources {
    geometries: THREE.BufferGeometry[]
    materials: THREE.Material[]
    textures: THREE.Texture[]
    animationMixers: THREE.AnimationMixer[]
    sceneObjects: THREE.Object3D[]
}

/**
 * Cleanup task for a completed event
 */
export interface EventCleanupTask {
    eventId: string
    actorIds: string[]
    timestamp: number
    resources: CleanupResources
}

/**
 * Cleanup statistics
 */
export interface CleanupStats {
    totalEvents: number
    totalGeometries: number
    totalMaterials: number
    totalTextures: number
    totalMixers: number
    totalObjects: number
    lastCleanupTime: number
}

/**
 * Configuration for ResourceCleanupManager
 */
export interface ResourceCleanupConfig {
    cleanupThreshold: number        // Number of events to accumulate before cleanup (default: 5)
    cleanupInterval: number          // Time interval in ms to force cleanup (default: 2000)
    aggressiveMode: boolean          // If true, cleanup immediately (default: false)
    enableLogging: boolean           // Enable detailed logging (default: true)
}

/**
 * Resource Cleanup Manager
 * Manages batch cleanup of Three.js resources from completed events
 */
export class ResourceCleanupManager {
    private completedEventQueue: EventCleanupTask[] = []
    private config: Required<ResourceCleanupConfig>
    private lastCleanupTime: number = 0
    private stats: CleanupStats = {
        totalEvents: 0,
        totalGeometries: 0,
        totalMaterials: 0,
        totalTextures: 0,
        totalMixers: 0,
        totalObjects: 0,
        lastCleanupTime: 0
    }

    constructor(config: Partial<ResourceCleanupConfig> = {}) {
        this.config = {
            cleanupThreshold: config.cleanupThreshold ?? 5,
            cleanupInterval: config.cleanupInterval ?? 2000,
            aggressiveMode: config.aggressiveMode ?? false,
            enableLogging: config.enableLogging ?? true
        }
    }

    /**
     * Schedule cleanup for a completed event
     */
    scheduleCleanup(
        eventId: string,
        actorIds: string[],
        resources: CleanupResources
    ): void {
        const task: EventCleanupTask = {
            eventId,
            actorIds,
            timestamp: Date.now(),
            resources
        }

        this.completedEventQueue.push(task)

        if (this.config.enableLogging) {
            console.log(`[ResourceCleanup] 📋 Scheduled cleanup for event '${eventId}' with ${actorIds.length} actors`)
            console.log(`[ResourceCleanup] 📊 Queue size: ${this.completedEventQueue.length}/${this.config.cleanupThreshold}`)
        }

        // Check if should trigger cleanup
        this.checkAndCleanup()
    }

    /**
     * Check if cleanup should be triggered and execute if needed
     */
    private checkAndCleanup(): void {
        const now = Date.now()
        const timeSinceLastCleanup = now - this.lastCleanupTime
        const shouldCleanupByThreshold = this.completedEventQueue.length >= this.config.cleanupThreshold
        const shouldCleanupByTime = timeSinceLastCleanup >= this.config.cleanupInterval && this.completedEventQueue.length > 0
        const shouldCleanupAggressive = this.config.aggressiveMode && this.completedEventQueue.length > 0

        if (shouldCleanupByThreshold || shouldCleanupByTime || shouldCleanupAggressive) {
            this.performBatchCleanup()
        }
    }

    /**
     * Force cleanup check (called from update loop)
     */
    update(currentTime: number): void {
        if (this.completedEventQueue.length === 0) return

        const timeSinceLastCleanup = currentTime - this.lastCleanupTime
        if (timeSinceLastCleanup >= this.config.cleanupInterval) {
            this.performBatchCleanup()
        }
    }

    /**
     * Perform batch cleanup of all queued events
     */
    private performBatchCleanup(): void {
        if (this.completedEventQueue.length === 0) return

        const startTime = performance.now()
        const tasksToClean = [...this.completedEventQueue]
        this.completedEventQueue = []

        if (this.config.enableLogging) {
            console.log(`[ResourceCleanup] 🧹 Starting batch cleanup of ${tasksToClean.length} events...`)
        }

        let cleanupStats = {
            geometries: 0,
            materials: 0,
            textures: 0,
            mixers: 0,
            objects: 0
        }

        for (const task of tasksToClean) {
            const taskStats = this.disposeEventResources(task)
            cleanupStats.geometries += taskStats.geometries
            cleanupStats.materials += taskStats.materials
            cleanupStats.textures += taskStats.textures
            cleanupStats.mixers += taskStats.mixers
            cleanupStats.objects += taskStats.objects
        }

        // Update global stats
        this.stats.totalEvents += tasksToClean.length
        this.stats.totalGeometries += cleanupStats.geometries
        this.stats.totalMaterials += cleanupStats.materials
        this.stats.totalTextures += cleanupStats.textures
        this.stats.totalMixers += cleanupStats.mixers
        this.stats.totalObjects += cleanupStats.objects
        this.stats.lastCleanupTime = Date.now()
        this.lastCleanupTime = Date.now()

        const duration = performance.now() - startTime

        if (this.config.enableLogging) {
            console.log(`[ResourceCleanup] ✅ Batch cleanup complete in ${duration.toFixed(2)}ms`)
            console.log(`[ResourceCleanup] 📊 Cleaned:`, cleanupStats)
            console.log(`[ResourceCleanup] 📈 Total stats:`, this.stats)
        }
    }

    /**
     * Dispose resources for a single event
     */
    private disposeEventResources(task: EventCleanupTask): {
        geometries: number
        materials: number
        textures: number
        mixers: number
        objects: number
    } {
        const { resources } = task
        const stats = {
            geometries: 0,
            materials: 0,
            textures: 0,
            mixers: 0,
            objects: 0
        }

        // Dispose geometries
        for (const geometry of resources.geometries) {
            try {
                geometry.dispose()
                stats.geometries++
            } catch (error) {
                console.error(`[ResourceCleanup] Failed to dispose geometry:`, error)
            }
        }

        // Dispose materials and their textures
        for (const material of resources.materials) {
            try {
                this.disposeMaterial(material)
                stats.materials++
            } catch (error) {
                console.error(`[ResourceCleanup] Failed to dispose material:`, error)
            }
        }

        // Dispose standalone textures
        for (const texture of resources.textures) {
            try {
                texture.dispose()
                stats.textures++
            } catch (error) {
                console.error(`[ResourceCleanup] Failed to dispose texture:`, error)
            }
        }

        // Stop and dispose animation mixers
        for (const mixer of resources.animationMixers) {
            try {
                mixer.stopAllAction()
                // AnimationMixer doesn't have a dispose method, but stopping actions releases references
                stats.mixers++
            } catch (error) {
                console.error(`[ResourceCleanup] Failed to stop mixer:`, error)
            }
        }

        // Remove scene objects from parent and dispose recursively
        for (const object of resources.sceneObjects) {
            try {
                this.disposeObject3D(object)
                stats.objects++
            } catch (error) {
                console.error(`[ResourceCleanup] Failed to dispose scene object:`, error)
            }
        }

        return stats
    }

    /**
     * Dispose a Three.js material and all its textures
     */
    private disposeMaterial(material: THREE.Material): void {
        // Dispose all texture maps
        const materialAny = material as any

        const textureProperties = [
            'map',
            'lightMap',
            'bumpMap',
            'normalMap',
            'specularMap',
            'envMap',
            'alphaMap',
            'aoMap',
            'displacementMap',
            'emissiveMap',
            'gradientMap',
            'metalnessMap',
            'roughnessMap'
        ]

        for (const prop of textureProperties) {
            if (materialAny[prop] && materialAny[prop].dispose) {
                materialAny[prop].dispose()
            }
        }

        material.dispose()
    }

    /**
     * Recursively dispose an Object3D and all its children
     */
    private disposeObject3D(object: THREE.Object3D): void {
        // Remove from parent first
        if (object.parent) {
            object.parent.remove(object)
        }

        // Recursively dispose children
        while (object.children.length > 0) {
            const child = object.children[0]
            this.disposeObject3D(child)
        }

        // Dispose geometry and material if it's a Mesh
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

        // Clear references
        object.clear()
    }

    /**
     * Set aggressive cleanup mode
     */
    setAggressiveMode(enabled: boolean): void {
        this.config.aggressiveMode = enabled
        if (enabled && this.completedEventQueue.length > 0) {
            this.performBatchCleanup()
        }
    }

    /**
     * Get current cleanup statistics
     */
    getStats(): CleanupStats {
        return { ...this.stats }
    }

    /**
     * Get number of pending cleanup tasks
     */
    getPendingCount(): number {
        return this.completedEventQueue.length
    }

    /**
     * Clear all pending cleanup tasks (for reset/debug)
     */
    clear(): void {
        this.completedEventQueue = []
        if (this.config.enableLogging) {
            console.log(`[ResourceCleanup] 🧹 Cleared all pending cleanup tasks`)
        }
    }

    /**
     * Dispose the cleanup manager itself
     */
    dispose(): void {
        this.performBatchCleanup()
        this.clear()
    }
}
