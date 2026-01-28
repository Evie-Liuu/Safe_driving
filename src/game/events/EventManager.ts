import * as THREE from 'three'
import {
    GameEvent,
    EventState,
    EventContext,
    PlayerState,
    EventManagerConfig,
    EventCallbacks,
    TriggerType,
    PlayerResponseType,
    PrepareInstruction,
    PrepareActionType,
    PrepareZoneStatus
} from './EventTypes'

/**
 * Central event management system
 * Handles event registration, triggering, and lifecycle management
 */
export class EventManager {
    private eventRegistry: Map<string, GameEvent> = new Map() // 儲存所有事件定義
    private pendingEvents: Map<string, GameEvent> = new Map()
    private activeEvents: Map<string, EventContext> = new Map()
    private completedEvents: Set<string> = new Set()
    private config: EventManagerConfig
    private callbacks: EventCallbacks
    private lastCheckTime: number = 0

    constructor(config: EventManagerConfig = {}) {
        this.config = {
            enableDebugVisualization: false,
            maxConcurrentEvents: 5,
            eventTriggerCheckInterval: 0.1, // Check every 100ms
            ...config
        }
        this.callbacks = config.callbacks || {}
    }

    /**
     * Register an event to the system
     */
    registerEvent(event: GameEvent): void {
        if (this.eventRegistry.has(event.id)) {
            console.warn(`Event ${event.id} already registered`)
            return
        }

        // Store in registry for permanent reference
        this.eventRegistry.set(event.id, event)

        // Add to pending events for trigger checking
        this.pendingEvents.set(event.id, event)

        console.log(`Event registered: ${event.id} - ${event.name}`)
    }

    /**
     * Register multiple events
     */
    registerEvents(events: GameEvent[]): void {
        events.forEach(event => this.registerEvent(event))
    }

    /**
     * Check trigger conditions and activate events
     */
    checkTriggers(playerState: PlayerState, currentTime: number): void {
        // Throttle checks based on config
        if (currentTime - this.lastCheckTime < this.config.eventTriggerCheckInterval!) {
            return
        }
        this.lastCheckTime = currentTime

        // Debug: Log pending events
        // console.log(`[EventManager] 🔍 Checking triggers... Pending: ${this.pendingEvents.size}, Active: ${this.activeEvents.size}`)

        // Check if we've reached max concurrent events
        if (this.activeEvents.size >= this.config.maxConcurrentEvents!) {
            console.warn(`[EventManager] ⚠️ Max concurrent events reached: ${this.activeEvents.size}/${this.config.maxConcurrentEvents}`)
            return
        }

        // Sort pending events by priority
        const sortedEvents = Array.from(this.pendingEvents.values())
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))

        // console.log(`[EventManager] 📋 Sorted events to check:`, sortedEvents.map(e => `${e.id} (priority: ${e.priority || 0})`))

        for (const event of sortedEvents) {
            const shouldTrigger = this.shouldTriggerEvent(event, playerState)
            // console.log(`[EventManager] 🎯 Event '${event.id}' should trigger? ${shouldTrigger ? 'YES ✅' : 'NO ❌'}`)

            if (shouldTrigger) {
                this.activateEvent(event, playerState, currentTime)
                break // Only activate one event per check cycle
            }
        }
    }

    /**
     * Check if an event should be triggered
     */
    private shouldTriggerEvent(event: GameEvent, playerState: PlayerState): boolean {
        const trigger = event.trigger

        switch (trigger.type) {
            case TriggerType.PROXIMITY:
                if (!trigger.position || !trigger.radius) {
                    console.warn(`[EventManager] ❌ Event '${event.id}' missing position or radius`)
                    return false
                }

                const eventPos = new THREE.Vector3(...trigger.position)
                const distance = playerState.position.distanceTo(eventPos)
                const speedKmh = playerState.speed * 3.6

                // Debug log for proximity checks
                // console.log(`[EventManager] 📏 Event '${event.id}': Distance=${distance.toFixed(1)}/${trigger.radius}, Speed=${speedKmh.toFixed(1)} km/h`)

                if (distance > trigger.radius) {
                    // console.log(`[EventManager] ❌ Too far: ${distance.toFixed(1)} > ${trigger.radius}`)
                    return false
                }

                // Check speed requirements if specified
                if (trigger.requiredSpeed) {
                    if (trigger.requiredSpeed.min && speedKmh < trigger.requiredSpeed.min) {
                        console.log(`[EventManager] ❌ Speed too low: ${speedKmh.toFixed(1)} < ${trigger.requiredSpeed.min}`)
                        return false
                    }
                    if (trigger.requiredSpeed.max && speedKmh > trigger.requiredSpeed.max) {
                        console.log(`[EventManager] ❌ Speed too high: ${speedKmh.toFixed(1)} > ${trigger.requiredSpeed.max}`)
                        return false
                    }
                }

                console.log(`[EventManager] ✅ All proximity checks passed for '${event.id}'!`)
                return true

            case TriggerType.TIME:
                // Time-based triggers would need a game time system
                return false

            case TriggerType.CONDITION:
                if (!trigger.condition) return false
                return trigger.condition(playerState)

            default:
                return false
        }
    }

    /**
     * Activate an event
     */
    activateEvent(event: GameEvent, playerState: PlayerState, currentTime: number): void {
        const context: EventContext = {
            eventId: event.id,
            state: EventState.ACTIVE,
            startTime: currentTime,
            activeActors: new Map(),
            completedActions: new Set(),
            playerState: { ...playerState }
        }

        this.activeEvents.set(event.id, context)
        this.pendingEvents.delete(event.id)

        console.log(`Event activated: ${event.id} - ${event.name}`)

        // Trigger callbacks
        if (this.callbacks.onEventTriggered) {
            this.callbacks.onEventTriggered(event.id)
        }
        if (this.callbacks.onEventActivated) {
            this.callbacks.onEventActivated(event.id)
        }

        // Check if player response is required
        if (event.requiredPlayerResponse && this.callbacks.onPlayerResponseRequired) {
            this.callbacks.onPlayerResponseRequired(event.id, event.requiredPlayerResponse)
        }
    }

    /**
     * Update all active events
     */
    updateActiveEvents(delta: number, currentTime: number, playerState: PlayerState): void {
        const eventsToComplete: string[] = []

        for (const [eventId, context] of this.activeEvents.entries()) {
            const event = this.getEventById(eventId)
            if (!event) continue

            // Update context with current player state
            context.playerState = { ...playerState }

            // Check completion criteria
            if (this.checkCompletionCriteria(event, context, playerState)) {
                eventsToComplete.push(eventId)
            }

            // Check if event has timed out or failed
            if (event.requiredPlayerResponse?.timeLimit) {
                const elapsed = currentTime - context.startTime
                if (elapsed > event.requiredPlayerResponse.timeLimit) {
                    this.failEvent(eventId, 'Time limit exceeded')
                }
            }
        }

        // Complete events that met their criteria
        eventsToComplete.forEach(eventId => this.completeEvent(eventId, true))
    }

    /**
     * Check if event completion criteria are met
     */
    private checkCompletionCriteria(
        event: GameEvent,
        context: EventContext,
        playerState: PlayerState
    ): boolean {
        if (!event.completionCriteria) {
            // Default: complete when all actions are done
            return context.completedActions.size === event.actions.length
        }

        const criteria = event.completionCriteria

        // Check if player has passed the event location (using distance calculation)
        if (criteria.playerPassed) {
            const eventPos = event.trigger.position
            if (!eventPos) return false

            // Calculate distance from event position
            const eventVec = new THREE.Vector3(eventPos[0], eventPos[1], eventPos[2])
            const distance = playerState.position.distanceTo(eventVec)

            // Player must be beyond trigger radius + buffer to be considered "passed"
            const triggerRadius = event.trigger.radius || 0
            // TODO
            const passedThreshold = triggerRadius + 10 // 10m buffer beyond trigger radius

            if (distance > passedThreshold) {
                // Player has passed (moved far enough from event)

                // Check speed criteria if specified
                const speedKmh = playerState.speed * 3.6
                if (criteria.minSpeed && speedKmh < criteria.minSpeed) return false
                if (criteria.maxSpeed && speedKmh > criteria.maxSpeed) return false

                return true
            }
        }

        // Check custom condition
        if (criteria.customCondition) {
            return criteria.customCondition(context)
        }

        return false
    }

    /**
     * Mark an action as completed
     */
    markActionCompleted(eventId: string, actionId: string): void {
        const context = this.activeEvents.get(eventId)
        if (context) {
            context.completedActions.add(actionId)
        }
    }

    /**
     * Complete an event
     */
    completeEvent(eventId: string, success: boolean): void {
        const context = this.activeEvents.get(eventId)
        if (!context) return

        context.state = success ? EventState.COMPLETED : EventState.FAILED

        this.activeEvents.delete(eventId)
        this.completedEvents.add(eventId)

        console.log(`Event ${success ? 'completed' : 'failed'}: ${eventId}`)

        // Trigger callback
        if (this.callbacks.onEventCompleted) {
            this.callbacks.onEventCompleted(eventId, success)
        }

        // Re-register if repeatable
        const event = this.getEventById(eventId)
        if (event && event.repeatable) {
            this.pendingEvents.set(eventId, event)
            this.completedEvents.delete(eventId)
        }
    }

    /**
     * Fail an event
     */
    failEvent(eventId: string, reason: string): void {
        console.warn(`Event failed: ${eventId} - Reason: ${reason}`)

        if (this.callbacks.onEventFailed) {
            this.callbacks.onEventFailed(eventId, reason)
        }

        this.completeEvent(eventId, false)
    }

    /**
     * Validate player response
     */
    validatePlayerResponse(eventId: string, playerState: PlayerState): boolean {
        const event = this.getEventById(eventId)
        const context = this.activeEvents.get(eventId)

        if (!event || !context || !event.requiredPlayerResponse) {
            return true
        }

        const required = event.requiredPlayerResponse
        const speedKmh = playerState.speed * 3.6

        let isValid = true

        switch (required.type) {
            case PlayerResponseType.DECELERATE:
                if (required.targetSpeed) {
                    if (required.targetSpeed.min && speedKmh < required.targetSpeed.min) {
                        isValid = false
                    }
                    if (required.targetSpeed.max && speedKmh > required.targetSpeed.max) {
                        isValid = false
                    }
                }
                break

            case PlayerResponseType.STOP:
                if (speedKmh > 5) { // Consider stopped if under 5 km/h
                    isValid = false
                }
                break

            case PlayerResponseType.AVOID:
                // Would need collision detection logic
                break

            case PlayerResponseType.NONE:
                isValid = true
                break
        }

        if (this.callbacks.onPlayerResponseValidated) {
            this.callbacks.onPlayerResponseValidated(eventId, isValid)
        }

        return isValid
    }

    /**
     * Get event by ID (searches all states)
     */
    private getEventById(eventId: string): GameEvent | undefined {
        // First check registry (contains all registered events)
        const event = this.eventRegistry.get(eventId)
        if (event) return event

        // Fallback to pending events
        const pending = this.pendingEvents.get(eventId)
        if (pending) return pending

        return undefined
    }

    /**
     * Register an actor for an event
     */
    registerActor(eventId: string, actorId: string, actorRef: any): void {
        const context = this.activeEvents.get(eventId)
        if (context) {
            context.activeActors.set(actorId, actorRef)
        }
    }

    /**
     * Get active actors for an event
     */
    getActiveActors(eventId: string): Map<string, any> {
        const context = this.activeEvents.get(eventId)
        return context?.activeActors || new Map()
    }

    /**
     * Get all active events
     */
    getActiveEvents(): GameEvent[] {
        const activeEventIds = Array.from(this.activeEvents.keys())
        // console.log(`[EventManager] 🔍 getActiveEvents called, active IDs:`, activeEventIds)

        const events = activeEventIds
            .map(id => {
                const event = this.eventRegistry.get(id)
                if (!event) {
                    console.warn(`[EventManager] ⚠️ Event '${id}' not found in registry!`)
                }
                return event
            })
            .filter(Boolean) as GameEvent[]

        // console.log(`[EventManager] 📦 Returning ${events.length} active events`)
        return events
    }

    /**
     * Get event context
     */
    getEventContext(eventId: string): EventContext | undefined {
        return this.activeEvents.get(eventId)
    }

    /**
     * Check prepare zones for pending events (cruise auto-response)
     * Returns the highest-priority prepare instruction if player is in a prepare zone
     */
    checkPrepareZone(playerState: PlayerState): PrepareInstruction | null {
        if (!playerState.isCruising) return null

        let bestInstruction: PrepareInstruction | null = null
        let bestPriority = -1

        for (const [, event] of this.pendingEvents) {
            if (!event.prepareConfig || !event.trigger.position) continue

            const eventPos = new THREE.Vector3(...event.trigger.position)
            const distance = playerState.position.distanceTo(eventPos)
            const config = event.prepareConfig
            const triggerRadius = event.trigger.radius || 0
            const priority = event.priority || 0

            if (priority <= bestPriority) continue

            // TODO: Determine zone status
            let status: PrepareZoneStatus
            if (distance <= triggerRadius) {
                status = PrepareZoneStatus.INSIDE_TRIGGER
            } else if (distance <= config.radius) {
                status = PrepareZoneStatus.IN_PREPARE_ZONE
            } else {
                status = PrepareZoneStatus.OUTSIDE
            }

            // Only return instructions for events within prepare or trigger range
            if (status === PrepareZoneStatus.OUTSIDE) continue

            bestPriority = priority
            bestInstruction = {
                eventId: event.id,
                eventName: event.name,
                triggerPosition: event.trigger.position!,
                shouldBrake: config.actions.includes(PrepareActionType.DECELERATE),
                targetSpeedFactor: config.targetSpeedFactor ?? 0.5,
                laneOffset: config.actions.includes(PrepareActionType.LANE_SWITCH)
                    ? (config.laneOffset ?? -1.5)
                    : 0,
                clickDeadline: config.clickDeadline ?? 5,
                status
            }
        }

        return bestInstruction
    }

    /**
     * Reset all events
     */
    reset(): void {
        this.activeEvents.clear()
        this.completedEvents.clear()
        // Note: pendingEvents are preserved to allow replay
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.eventRegistry.clear()
        this.pendingEvents.clear()
        this.activeEvents.clear()
        this.completedEvents.clear()
    }
}
