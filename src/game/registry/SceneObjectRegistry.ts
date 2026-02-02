/**
 * Scene Object Registry
 * Singleton that manages controllable scene objects (traffic lights, signs, etc.)
 * Events can reference and control these objects by ID
 */

export interface SceneObjectHandle {
    id: string
    type: string
    // Generic method to execute commands on the object
    executeCommand: (command: string, params?: Record<string, any>) => void
}

/**
 * Traffic light specific handle
 */
export interface TrafficLightHandle extends SceneObjectHandle {
    type: 'traffic_light'
    setState: (state: TrafficLightState) => void
    getState: () => TrafficLightState
}

/**
 * Traffic light states
 */
export type TrafficLightState = 'red' | 'yellow' | 'green' | 'flashing_yellow' | 'off'

/**
 * Scene Object Registry Singleton
 */
class SceneObjectRegistryClass {
    private objects: Map<string, SceneObjectHandle> = new Map()
    private listeners: Map<string, Set<(object: SceneObjectHandle | null) => void>> = new Map()

    /**
     * Register a scene object
     */
    register(object: SceneObjectHandle): void {
        this.objects.set(object.id, object)
        console.log(`[SceneObjectRegistry] ✅ Registered ${object.type}: ${object.id}`)

        // Notify listeners
        const objectListeners = this.listeners.get(object.id)
        if (objectListeners) {
            objectListeners.forEach(listener => listener(object))
        }
    }

    /**
     * Unregister a scene object
     */
    unregister(id: string): void {
        const object = this.objects.get(id)
        if (object) {
            this.objects.delete(id)
            console.log(`[SceneObjectRegistry] ❌ Unregistered ${object.type}: ${id}`)

            // Notify listeners
            const objectListeners = this.listeners.get(id)
            if (objectListeners) {
                objectListeners.forEach(listener => listener(null))
            }
        }
    }

    /**
     * Get a scene object by ID
     */
    getObject<T extends SceneObjectHandle = SceneObjectHandle>(id: string): T | null {
        return (this.objects.get(id) as T) || null
    }

    /**
     * Get all objects of a specific type
     */
    getObjectsByType<T extends SceneObjectHandle = SceneObjectHandle>(type: string): T[] {
        const result: T[] = []
        this.objects.forEach(obj => {
            if (obj.type === type) {
                result.push(obj as T)
            }
        })
        return result
    }

    /**
     * Subscribe to object registration/unregistration
     */
    subscribe(id: string, listener: (object: SceneObjectHandle | null) => void): () => void {
        if (!this.listeners.has(id)) {
            this.listeners.set(id, new Set())
        }
        this.listeners.get(id)!.add(listener)

        // Return unsubscribe function
        return () => {
            this.listeners.get(id)?.delete(listener)
        }
    }

    /**
     * Check if an object exists
     */
    has(id: string): boolean {
        return this.objects.has(id)
    }

    /**
     * Get all registered object IDs
     */
    getAllIds(): string[] {
        return Array.from(this.objects.keys())
    }

    /**
     * Clear all objects (for cleanup)
     */
    clear(): void {
        this.objects.clear()
        console.log(`[SceneObjectRegistry] 🧹 Cleared all objects`)
    }
}

// Export singleton instance
export const SceneObjectRegistry = new SceneObjectRegistryClass()
