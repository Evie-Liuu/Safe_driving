/**
 * Game Optimization Systems
 * Export all optimization-related modules
 */

export {
    ResourceCleanupManager,
    type CleanupResources,
    type EventCleanupTask,
    type CleanupStats,
    type ResourceCleanupConfig
} from './ResourceCleanupManager'

export {
    ActorLifecycleManager,
    type ActorInfo,
    type RemovalTask,
    type ActorLifecycleConfig
} from './ActorLifecycleManager'

export { ChunkLoader } from './ChunkLoader'
export { LODSystem } from './LODSystem'
export { PerformanceMonitor } from './PerformanceMonitor'
