import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EventManager } from '../events/EventManager'
import { EventExecutor } from '../events/EventExecutor'
import { EventActorHandle } from '../components/EventActor'
import type { PlayerState, PrepareInstruction } from '../events/EventTypes'
import { useRef } from 'react'

interface EventSystemUpdaterProps {
    eventManager: EventManager | null
    eventExecutor: EventExecutor
    playerPosition: THREE.Vector3
    playerSpeed: number
    playerRotation: number
    isCruising: boolean
    actorRefsMap: Map<string, React.RefObject<EventActorHandle>>
    onPrepareInstruction?: (instruction: PrepareInstruction | null) => void
    enablePerformanceMonitoring?: boolean
    performanceLogInterval?: number // Log performance stats every N seconds (default: 30)
}

/**
 * Event system updater component
 * Runs in the render loop to update event triggers and actions
 */
export function EventSystemUpdater({
    eventManager,
    eventExecutor,
    playerPosition,
    playerSpeed,
    playerRotation,
    isCruising,
    actorRefsMap,
    onPrepareInstruction,
    enablePerformanceMonitoring = true,
    performanceLogInterval = 30
}: EventSystemUpdaterProps) {
    const { gl } = useThree()
    const lastUpdateTime = useRef(0)
    const eventToActorsMap = useRef<Map<string, string[]>>(new Map())
    const lastPerformanceLogTime = useRef(0)
    const frameCountRef = useRef(0)
    const fpsAccumulatorRef = useRef(0)

    useFrame((state) => {
        if (!eventManager) return

        const currentTime = state.clock.getElapsedTime()

        // Create player state
        const playerState: PlayerState = {
            position: playerPosition,
            speed: playerSpeed,
            rotation: playerRotation,
            isCruising
        }

        // Debug: Log player state periodically (every ~2 seconds)
        if (Math.floor(currentTime) % 2 === 0 && currentTime - lastUpdateTime.current > 1.9) {
            console.log(`[EventSystemUpdater] 🏃 Player State:`)
            console.log(`  Position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`)
            console.log(`  Speed: ${(playerSpeed * 3.6).toFixed(1)} km/h`)
            console.log(`  Cruising: ${isCruising}`)
        }

        // Check prepare zones for auto cruise response
        if (onPrepareInstruction) {
            const instruction = eventManager.checkPrepareZone(playerState)
            onPrepareInstruction(instruction)
        }

        // Check for new event triggers
        eventManager.checkTriggers(playerState, currentTime)

        // Update active events
        eventManager.updateActiveEvents(
            state.clock.getDelta(),
            currentTime,
            playerState
        )

        // Update resource cleanup manager
        const cleanupManager = eventManager.getResourceCleanupManager()
        cleanupManager.update(currentTime)

        // Performance monitoring
        if (enablePerformanceMonitoring) {
            frameCountRef.current++
            fpsAccumulatorRef.current += state.clock.getDelta()

            // Log performance stats periodically
            if (currentTime - lastPerformanceLogTime.current >= performanceLogInterval) {
                const fps = Math.round(frameCountRef.current / fpsAccumulatorRef.current)
                const info = gl.info

                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                console.log('📊 Performance Stats')
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                console.log(`🎮 FPS: ${fps}`)
                console.log(`🎨 Draw Calls: ${info.render.calls}`)
                console.log(`📐 Triangles: ${info.render.triangles.toLocaleString()}`)
                console.log(`📦 Geometries: ${info.memory.geometries}`)
                console.log(`🖼️ Textures: ${info.memory.textures}`)

                // Memory (if available)
                if ((performance as any).memory) {
                    const memoryMB = Math.round((performance as any).memory.usedJSHeapSize / 1048576)
                    console.log(`💾 Memory: ${memoryMB} MB`)
                }

                // Event system stats
                const activeEventsCount = eventManager.getActiveEvents().length
                console.log(`🎯 Active Events: ${activeEventsCount}`)

                // Cleanup stats
                const cleanupStats = cleanupManager.getStats()
                console.log(`🧹 Cleanup Stats:`)
                console.log(`   - Total Events Cleaned: ${cleanupStats.totalEvents}`)
                console.log(`   - Pending Cleanup: ${cleanupManager.getPendingCount()}`)
                console.log(`   - Geometries: ${cleanupStats.totalGeometries}`)
                console.log(`   - Materials: ${cleanupStats.totalMaterials}`)
                console.log(`   - Textures: ${cleanupStats.totalTextures}`)

                // Auto-optimization triggers
                if (fps < 30) {
                    console.log('⚠️ Low FPS detected - enabling aggressive cleanup')
                    cleanupManager.setAggressiveMode(true)
                } else if (fps > 50) {
                    cleanupManager.setAggressiveMode(false)
                }

                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

                // Reset counters
                lastPerformanceLogTime.current = currentTime
                frameCountRef.current = 0
                fpsAccumulatorRef.current = 0
            }
        }

        // Update event executor timelines for each active event
        const activeEvents = eventManager.getActiveEvents()
        const activeEventIds = Array.from(activeEvents.map(e => e.id))

        // Debug: Log active events status
        // console.log(`[EventSystemUpdater] 📊 Active Events: ${activeEventIds.length}`, activeEventIds)

        for (const eventId of activeEventIds) {
            const context = eventManager.getEventContext(eventId)
            if (!context) continue

            // Collect actor refs for this event
            const actorRefs = new Map<string, any>()
            for (const [actorId, ref] of actorRefsMap.entries()) {
                if (ref.current) {
                    actorRefs.set(actorId, ref.current)
                }
            }

            // Update executor timeline
            eventExecutor.updateTimeline(
                eventId,
                currentTime,
                actorRefs,
                context,
                (actionId) => {
                    eventManager.markActionCompleted(eventId, actionId)
                }
            )
        }

        lastUpdateTime.current = currentTime
    })

    return null // This is a logic-only component
}
