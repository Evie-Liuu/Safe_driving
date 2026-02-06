import { EventActorHandle } from '../components/EventActor'

/**
 * Actor information tracked by lifecycle manager
 */
export interface ActorInfo {
    actorId: string
    eventId: string
    ref: React.RefObject<EventActorHandle>
    onRequestCleanup?: () => void
    registeredTime: number
}

/**
 * Removal task for batch cleanup
 */
export interface RemovalTask {
    actorId: string
    eventId: string
    timestamp: number
    ref?: React.RefObject<EventActorHandle>
}

/**
 * Configuration for ActorLifecycleManager
 */
export interface ActorLifecycleConfig {
    removalThreshold: number        // Number of actors to accumulate before cleanup (default: 5)
    removalDelay: number            // Delay before removing actor after marking (default: 0)
    enableLogging: boolean          // Enable detailed logging (default: true)
}

/**
 * Actor Lifecycle Manager
 * Manages registration, tracking, and cleanup of EventActor components
 */
export class ActorLifecycleManager {
    private activeActors: Map<string, ActorInfo> = new Map()
    private pendingRemoval: Map<string, RemovalTask> = new Map()
    private config: Required<ActorLifecycleConfig>

    constructor(config: Partial<ActorLifecycleConfig> = {}) {
        this.config = {
            removalThreshold: config.removalThreshold ?? 5,
            removalDelay: config.removalDelay ?? 0,
            enableLogging: config.enableLogging ?? true
        }
    }

    /**
     * Register an actor with the lifecycle manager
     */
    registerActor(
        actorId: string,
        eventId: string,
        ref: React.RefObject<EventActorHandle>,
        onRequestCleanup?: () => void
    ): void {
        const info: ActorInfo = {
            actorId,
            eventId,
            ref,
            onRequestCleanup,
            registeredTime: Date.now()
        }

        this.activeActors.set(actorId, info)

        if (this.config.enableLogging) {
            console.log(`[ActorLifecycle] ✅ Registered actor '${actorId}' for event '${eventId}'`)
            console.log(`[ActorLifecycle] 📊 Active actors: ${this.activeActors.size}`)
        }
    }

    /**
     * Unregister an actor (called when actor component unmounts)
     */
    unregisterActor(actorId: string): void {
        const removed = this.activeActors.delete(actorId)
        this.pendingRemoval.delete(actorId)

        if (removed && this.config.enableLogging) {
            console.log(`[ActorLifecycle] 🗑️ Unregistered actor '${actorId}'`)
        }
    }

    /**
     * Mark an actor for removal
     */
    markForRemoval(actorId: string, eventId: string, delay: number = this.config.removalDelay): void {
        const info = this.activeActors.get(actorId)
        if (!info) {
            if (this.config.enableLogging) {
                console.warn(`[ActorLifecycle] ⚠️ Cannot mark unknown actor '${actorId}' for removal`)
            }
            return
        }

        const task: RemovalTask = {
            actorId,
            eventId,
            timestamp: Date.now() + delay,
            ref: info.ref
        }

        this.pendingRemoval.set(actorId, task)

        if (this.config.enableLogging) {
            console.log(`[ActorLifecycle] 🗓️ Marked actor '${actorId}' for removal (delay: ${delay}ms)`)
            console.log(`[ActorLifecycle] 📋 Pending removal: ${this.pendingRemoval.size}/${this.config.removalThreshold}`)
        }
    }

    /**
     * Perform batch cleanup of actors ready for removal
     * Returns array of removed actor IDs
     */
    cleanupBatch(): string[] {
        if (this.pendingRemoval.size === 0) {
            return []
        }

        const now = Date.now()
        const toRemove = Array.from(this.pendingRemoval.values())
            .filter(task => task.timestamp <= now)

        if (toRemove.length === 0) {
            return []
        }

        if (this.config.enableLogging) {
            console.log(`[ActorLifecycle] 🧹 Starting batch cleanup of ${toRemove.length} actors...`)
        }

        const removedIds: string[] = []

        for (const task of toRemove) {
            this.removeActor(task.actorId)
            removedIds.push(task.actorId)
        }

        if (this.config.enableLogging) {
            console.log(`[ActorLifecycle] ✅ Batch cleanup complete. Removed: ${removedIds.length} actors`)
            console.log(`[ActorLifecycle] 📊 Remaining active: ${this.activeActors.size}, Pending: ${this.pendingRemoval.size}`)
        }

        return removedIds
    }

    /**
     * Immediately cleanup all pending actors
     */
    cleanupImmediately(): string[] {
        const allPending = Array.from(this.pendingRemoval.keys())

        if (this.config.enableLogging && allPending.length > 0) {
            console.log(`[ActorLifecycle] 🚨 Immediate cleanup of ${allPending.length} actors`)
        }

        for (const actorId of allPending) {
            this.removeActor(actorId)
        }

        return allPending
    }

    /**
     * Remove a single actor
     */
    private removeActor(actorId: string): void {
        const info = this.activeActors.get(actorId)
        if (!info) return

        // Notify the component to cleanup
        if (info.onRequestCleanup) {
            info.onRequestCleanup()
        }

        this.activeActors.delete(actorId)
        this.pendingRemoval.delete(actorId)

        if (this.config.enableLogging) {
            console.log(`[ActorLifecycle] 🗑️ Removed actor '${actorId}' from event '${info.eventId}'`)
        }
    }

    /**
     * Mark all actors for a specific event for removal
     */
    markEventActorsForRemoval(eventId: string, delay: number = this.config.removalDelay): string[] {
        const actorIds: string[] = []

        for (const [actorId, info] of this.activeActors.entries()) {
            if (info.eventId === eventId) {
                this.markForRemoval(actorId, eventId, delay)
                actorIds.push(actorId)
            }
        }

        if (this.config.enableLogging && actorIds.length > 0) {
            console.log(`[ActorLifecycle] 🎯 Marked ${actorIds.length} actors for removal from event '${eventId}'`)
        }

        return actorIds
    }

    /**
     * Get number of active actors
     */
    getActiveCount(): number {
        return this.activeActors.size
    }

    /**
     * Get number of pending removal actors
     */
    getPendingRemovalCount(): number {
        return this.pendingRemoval.size
    }

    /**
     * Get all active actor IDs
     */
    getActiveActorIds(): string[] {
        return Array.from(this.activeActors.keys())
    }

    /**
     * Get actors for a specific event
     */
    getEventActors(eventId: string): ActorInfo[] {
        const actors: ActorInfo[] = []
        for (const info of this.activeActors.values()) {
            if (info.eventId === eventId) {
                actors.push(info)
            }
        }
        return actors
    }

    /**
     * Check if should trigger batch cleanup based on threshold
     */
    shouldCleanup(): boolean {
        return this.pendingRemoval.size >= this.config.removalThreshold
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            activeActors: this.activeActors.size,
            pendingRemoval: this.pendingRemoval.size,
            removalThreshold: this.config.removalThreshold
        }
    }

    /**
     * Clear all tracked actors (for reset/debug)
     */
    clear(): void {
        this.activeActors.clear()
        this.pendingRemoval.clear()

        if (this.config.enableLogging) {
            console.log(`[ActorLifecycle] 🧹 Cleared all actors`)
        }
    }

    /**
     * Dispose the lifecycle manager
     */
    dispose(): void {
        this.cleanupImmediately()
        this.clear()
    }
}
