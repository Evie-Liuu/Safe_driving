import { PerformanceStats } from './PerformanceMonitor'
import { ResourceCleanupManager, CleanupStats } from './ResourceCleanupManager'
import { ActorLifecycleManager } from './ActorLifecycleManager'
import { ActorPool, PoolStats } from './ActorPool'

/**
 * Extended performance statistics including optimization system metrics
 */
export interface ExtendedPerformanceStats extends PerformanceStats {
    // Cleanup stats
    cleanupStats: CleanupStats
    pendingCleanup: number

    // Actor lifecycle stats
    activeActors: number
    pendingRemoval: number

    // Pool stats
    poolStats: PoolStats

    // Event system stats
    activeEvents?: number
    completedEventsCache?: number

    // Timestamp
    timestamp: number
}

/**
 * Performance optimization recommendations
 */
export interface PerformanceRecommendation {
    severity: 'info' | 'warning' | 'critical'
    category: 'fps' | 'memory' | 'cleanup' | 'pool' | 'actors'
    message: string
    action?: string
}

/**
 * Performance Integration Manager
 * Centralizes performance monitoring and optimization controls
 */
export class PerformanceIntegration {
    private cleanupManager: ResourceCleanupManager
    private lifecycleManager: ActorLifecycleManager
    private actorPool: ActorPool
    private statsHistory: ExtendedPerformanceStats[] = []
    private maxHistorySize: number = 60 // Keep 60 samples (1 minute at 1 sample/sec)

    constructor(
        cleanupManager: ResourceCleanupManager,
        lifecycleManager: ActorLifecycleManager,
        actorPool: ActorPool
    ) {
        this.cleanupManager = cleanupManager
        this.lifecycleManager = lifecycleManager
        this.actorPool = actorPool
    }

    /**
     * Collect comprehensive performance statistics
     */
    collectStats(baseStats: PerformanceStats, activeEvents?: number, completedEventsCache?: number): ExtendedPerformanceStats {
        const stats: ExtendedPerformanceStats = {
            ...baseStats,
            cleanupStats: this.cleanupManager.getStats(),
            pendingCleanup: this.cleanupManager.getPendingCount(),
            activeActors: this.lifecycleManager.getActiveCount(),
            pendingRemoval: this.lifecycleManager.getPendingRemovalCount(),
            poolStats: this.actorPool.getStats(),
            activeEvents,
            completedEventsCache,
            timestamp: Date.now()
        }

        // Add to history
        this.statsHistory.push(stats)
        if (this.statsHistory.length > this.maxHistorySize) {
            this.statsHistory.shift()
        }

        return stats
    }

    /**
     * Analyze performance and generate recommendations
     */
    analyzePerformance(stats: ExtendedPerformanceStats): PerformanceRecommendation[] {
        const recommendations: PerformanceRecommendation[] = []

        // FPS analysis
        if (stats.fps < 30) {
            recommendations.push({
                severity: 'critical',
                category: 'fps',
                message: `FPS 嚴重過低 (${stats.fps})`,
                action: '已啟動激進清理模式'
            })
        } else if (stats.fps < 45) {
            recommendations.push({
                severity: 'warning',
                category: 'fps',
                message: `FPS 偏低 (${stats.fps})`,
                action: '建議減少場景複雜度'
            })
        }

        // Memory analysis
        if (stats.memoryUsage && stats.memoryUsage > 800) {
            recommendations.push({
                severity: 'critical',
                category: 'memory',
                message: `記憶體使用過高 (${stats.memoryUsage} MB)`,
                action: '建議執行資源清理'
            })
        } else if (stats.memoryUsage && stats.memoryUsage > 500) {
            recommendations.push({
                severity: 'warning',
                category: 'memory',
                message: `記憶體使用偏高 (${stats.memoryUsage} MB)`,
                action: '注意監控記憶體變化'
            })
        }

        // Cleanup analysis
        if (stats.pendingCleanup > 10) {
            recommendations.push({
                severity: 'warning',
                category: 'cleanup',
                message: `待清理任務累積 (${stats.pendingCleanup} 個)`,
                action: '將在下次檢查時自動清理'
            })
        }

        // Actor analysis
        if (stats.activeActors > 50) {
            recommendations.push({
                severity: 'warning',
                category: 'actors',
                message: `活躍 Actor 數量過多 (${stats.activeActors} 個)`,
                action: '考慮使用物件池優化'
            })
        }

        if (stats.pendingRemoval > 10) {
            recommendations.push({
                severity: 'info',
                category: 'actors',
                message: `待移除 Actor 累積 (${stats.pendingRemoval} 個)`,
                action: '將在批次清理時處理'
            })
        }

        // Pool analysis
        const poolUtilization = stats.poolStats.totalActors > 0
            ? (stats.poolStats.inUseActors / stats.poolStats.totalActors) * 100
            : 0

        if (poolUtilization > 90) {
            recommendations.push({
                severity: 'info',
                category: 'pool',
                message: `物件池利用率高 (${poolUtilization.toFixed(0)}%)`,
                action: '考慮增加池容量'
            })
        }

        // Draw calls analysis
        if (stats.drawCalls > 1000) {
            recommendations.push({
                severity: 'warning',
                category: 'fps',
                message: `Draw Calls 過多 (${stats.drawCalls})`,
                action: '建議使用 Instancing'
            })
        }

        return recommendations
    }

    /**
     * Auto-optimize based on current performance
     */
    autoOptimize(stats: ExtendedPerformanceStats): void {
        // Enable aggressive cleanup if FPS is low
        if (stats.fps < 30) {
            this.cleanupManager.setAggressiveMode(true)
            console.log('[PerformanceIntegration] 🚨 Aggressive cleanup enabled due to low FPS')
        } else if (stats.fps > 50) {
            this.cleanupManager.setAggressiveMode(false)
        }

        // Force cleanup if memory is high
        if (stats.memoryUsage && stats.memoryUsage > 800) {
            console.log('[PerformanceIntegration] 🧹 Forcing cleanup due to high memory usage')
            this.lifecycleManager.cleanupImmediately()
        }

        // Cleanup idle pool actors if memory is high
        if (stats.memoryUsage && stats.memoryUsage > 600) {
            const cleaned = this.actorPool.cleanupIdle()
            if (cleaned > 0) {
                console.log(`[PerformanceIntegration] 🗑️ Cleaned ${cleaned} idle pool actors`)
            }
        }
    }

    /**
     * Get performance trend (improving, stable, degrading)
     */
    getPerformanceTrend(): 'improving' | 'stable' | 'degrading' | 'unknown' {
        if (this.statsHistory.length < 10) {
            return 'unknown'
        }

        // Compare last 10 samples with previous 10 samples
        const recent = this.statsHistory.slice(-10)
        const previous = this.statsHistory.slice(-20, -10)

        const recentAvgFps = recent.reduce((sum, s) => sum + s.fps, 0) / recent.length
        const previousAvgFps = previous.reduce((sum, s) => sum + s.fps, 0) / previous.length

        const fpsDiff = recentAvgFps - previousAvgFps

        if (fpsDiff > 5) return 'improving'
        if (fpsDiff < -5) return 'degrading'
        return 'stable'
    }

    /**
     * Get average FPS over time period
     */
    getAverageFPS(seconds: number = 10): number {
        if (this.statsHistory.length === 0) return 0

        const targetSamples = Math.min(seconds, this.statsHistory.length)
        const samples = this.statsHistory.slice(-targetSamples)

        return samples.reduce((sum, s) => sum + s.fps, 0) / samples.length
    }

    /**
     * Get statistics summary string
     */
    getSummary(stats: ExtendedPerformanceStats): string {
        const lines = [
            `FPS: ${stats.fps} (${stats.frameTime.toFixed(2)}ms)`,
            `Memory: ${stats.memoryUsage ? stats.memoryUsage + ' MB' : 'N/A'}`,
            `Draw Calls: ${stats.drawCalls}`,
            `Actors: ${stats.activeActors} active, ${stats.pendingRemoval} pending removal`,
            `Cleanup: ${stats.cleanupStats.totalEvents} events cleaned, ${stats.pendingCleanup} pending`,
            `Pool: ${stats.poolStats.inUseActors}/${stats.poolStats.totalActors} in use`,
            `Events: ${stats.activeEvents || 0} active, ${stats.completedEventsCache || 0} cached`
        ]

        return lines.join('\n')
    }

    /**
     * Export statistics for analysis
     */
    exportStats(): ExtendedPerformanceStats[] {
        return [...this.statsHistory]
    }

    /**
     * Clear statistics history
     */
    clearHistory(): void {
        this.statsHistory = []
    }

    /**
     * Get cleanup manager
     */
    getCleanupManager(): ResourceCleanupManager {
        return this.cleanupManager
    }

    /**
     * Get lifecycle manager
     */
    getLifecycleManager(): ActorLifecycleManager {
        return this.lifecycleManager
    }

    /**
     * Get actor pool
     */
    getActorPool(): ActorPool {
        return this.actorPool
    }
}
