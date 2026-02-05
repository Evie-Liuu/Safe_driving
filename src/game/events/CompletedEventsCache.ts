/**
 * Completed Event Record
 */
export interface CompletedEventRecord {
    eventId: string
    timestamp: number
    success: boolean
}

/**
 * LRU Cache for Completed Events
 * Prevents unlimited growth of completed events tracking
 */
export class CompletedEventsCache {
    private maxSize: number
    private cache: Map<string, CompletedEventRecord> = new Map()

    constructor(maxSize: number = 20) {
        this.maxSize = maxSize
    }

    /**
     * Add a completed event to the cache
     */
    add(eventId: string, success: boolean): void {
        // If already exists, update timestamp (move to end)
        if (this.cache.has(eventId)) {
            this.cache.delete(eventId)
        }

        // Check if we need to evict
        if (this.cache.size >= this.maxSize) {
            this.evictOldest()
        }

        // Add new record
        this.cache.set(eventId, {
            eventId,
            timestamp: Date.now(),
            success
        })
    }

    /**
     * Check if an event is in the cache
     */
    has(eventId: string): boolean {
        return this.cache.has(eventId)
    }

    /**
     * Get a completed event record
     */
    get(eventId: string): CompletedEventRecord | undefined {
        return this.cache.get(eventId)
    }

    /**
     * Remove oldest entry (LRU eviction)
     */
    private evictOldest(): void {
        // Map maintains insertion order, so first entry is oldest
        const oldestKey = this.cache.keys().next().value
        if (oldestKey) {
            this.cache.delete(oldestKey)
        }
    }

    /**
     * Get current cache size
     */
    size(): number {
        return this.cache.size
    }

    /**
     * Get all completed event IDs
     */
    getAllIds(): string[] {
        return Array.from(this.cache.keys())
    }

    /**
     * Clear the entire cache
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            oldestTimestamp: this.getOldestTimestamp(),
            newestTimestamp: this.getNewestTimestamp()
        }
    }

    /**
     * Get timestamp of oldest entry
     */
    private getOldestTimestamp(): number | null {
        const oldest = this.cache.values().next().value
        return oldest ? oldest.timestamp : null
    }

    /**
     * Get timestamp of newest entry
     */
    private getNewestTimestamp(): number | null {
        let newest: CompletedEventRecord | null = null
        for (const record of this.cache.values()) {
            if (!newest || record.timestamp > newest.timestamp) {
                newest = record
            }
        }
        return newest ? newest.timestamp : null
    }

    /**
     * Remove events older than the given age (in milliseconds)
     */
    evictOlderThan(maxAge: number): number {
        const now = Date.now()
        let evictedCount = 0

        for (const [eventId, record] of this.cache.entries()) {
            if (now - record.timestamp > maxAge) {
                this.cache.delete(eventId)
                evictedCount++
            }
        }

        return evictedCount
    }

    /**
     * Set maximum cache size (will trigger eviction if needed)
     */
    setMaxSize(newMaxSize: number): void {
        this.maxSize = newMaxSize

        // Evict excess entries
        while (this.cache.size > this.maxSize) {
            this.evictOldest()
        }
    }
}
