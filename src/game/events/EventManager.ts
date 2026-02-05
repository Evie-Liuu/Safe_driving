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
    PrepareZoneStatus,
    ActionType
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
            startPosition: playerState.position.clone(),
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
     * Event completes when BOTH conditions are met:
     * 1. Actor paths have completed (if required)
     * 2. Player has moved away from the event (if required)
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
        let allCriteriaMet = true
        const checks: Record<string, boolean> = {}

        // Check 1: Actor path completion (if required)
        if (criteria.requireActorPathComplete) {
            // Initialize actor path completion tracking if not exists
            if (!context.actorPathsCompleted) {
                context.actorPathsCompleted = new Set<string>()
            }

            // Count how many movement actions exist in this event
            const movementActions = event.actions.filter(action => action.type === ActionType.MOVEMENT)

            // Check if all movement actions have been marked as completed
            const pathsComplete = movementActions.every(action =>
                context.actorPathsCompleted!.has(action.actorId)
            )

            checks.actorPathsComplete = pathsComplete
            if (!pathsComplete) {
                allCriteriaMet = false
            }
        }

        // Check 2: Player has passed the event (approach → moving away detection)
        if (criteria.playerPassed) {
            const eventPos = event.trigger.position
            if (!eventPos) {
                checks.playerPassed = false
                allCriteriaMet = false
            } else {
                const eventVec = new THREE.Vector3(eventPos[0], eventPos[1], eventPos[2])
                const currentDistance = playerState.position.distanceTo(eventVec)

                // Track previous distance (initialize to current if first frame)
                const prevDistance = context.previousDistance ?? currentDistance
                context.previousDistance = currentDistance

                // Track minimum distance reached
                const minDistance = context.minDistanceReached ?? Infinity
                if (currentDistance < minDistance) {
                    context.minDistanceReached = currentDistance
                }

                const triggerRadius = event.trigger.radius || 10

                // Completion criteria:
                // 1. Player must have been within trigger radius at some point (actually approached the event)
                // 2. Distance is now INCREASING (moving away from event)
                // 3. Player has moved past the closest point by a threshold (to ensure consistent trend)
                const wasInsideTrigger = minDistance <= triggerRadius
                const isMovingAway = currentDistance > prevDistance
                const distanceIncreaseThreshold = 0.5 // Meters - ensures we're definitively moving away
                const hasPassedClosestPoint = (currentDistance - minDistance) > distanceIncreaseThreshold

                const playerPassedCheck = wasInsideTrigger && isMovingAway && hasPassedClosestPoint
                checks.playerPassed = playerPassedCheck

                if (playerPassedCheck && !context.playerPassedNotified) {
                    context.playerPassedNotified = true
                    if (this.callbacks.onPlayerPassed) {
                        this.callbacks.onPlayerPassed(event.id)
                    }
                }

                if (!playerPassedCheck) {
                    allCriteriaMet = false
                } else {
                    // Check speed criteria if player has passed
                    const speedKmh = playerState.speed * 3.6
                    if (criteria.minSpeed && speedKmh < criteria.minSpeed) {
                        checks.speedTooLow = true
                        allCriteriaMet = false
                    }
                    if (criteria.maxSpeed && speedKmh > criteria.maxSpeed) {
                        checks.speedTooHigh = true
                        allCriteriaMet = false
                    }
                }

                // Debug logging
                if (wasInsideTrigger || Object.keys(checks).some(k => checks[k])) {
                    console.log(`[Completion] ${event.id}:`, {
                        currentDist: currentDistance.toFixed(2),
                        prevDist: prevDistance.toFixed(2),
                        minDist: minDistance.toFixed(2),
                        wasInsideTrigger,
                        isMovingAway,
                        hasPassedClosestPoint,
                        checks,
                        allCriteriaMet
                    })
                }
            }
        }

        // Check custom condition
        if (criteria.customCondition) {
            const customPassed = criteria.customCondition(context)
            checks.customCondition = customPassed
            if (!customPassed) {
                allCriteriaMet = false
            }
        }

        // Final check: all required criteria must be met
        if (allCriteriaMet) {
            console.log(`✅ Event ${event.id} completion triggered:`, checks)
            return true
        }

        return false
    }

    /**
     * Mark an actor's movement path as completed
     * Called by EventActor when movement action finishes
     */
    markActorPathCompleted(eventId: string, actorId: string): void {
        const context = this.activeEvents.get(eventId)
        if (context) {
            if (!context.actorPathsCompleted) {
                context.actorPathsCompleted = new Set()
            }
            context.actorPathsCompleted.add(actorId)
            console.log(`[EventManager] 🎬 Actor path completed: ${actorId} in event ${eventId}`)
        }
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
     * Also checks active events for offset hold distance
     */
    checkPrepareZone(playerState: PlayerState): PrepareInstruction | null {
        if (!playerState.isCruising) return null

        let bestInstruction: PrepareInstruction | null = null
        let bestPriority = -1

        // Check pending events (approaching)
        for (const [, event] of this.pendingEvents) {
            if (!event.prepareConfig || !event.trigger.position) continue

            const eventPos = new THREE.Vector3(...event.trigger.position)
            const distance = playerState.position.distanceTo(eventPos)
            const config = event.prepareConfig
            const triggerRadius = event.trigger.radius || 0
            const priority = event.priority || 0

            if (priority <= bestPriority) continue

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
                shouldStop: config.actions.includes(PrepareActionType.STOP),
                stopDuration: config.stopDuration ?? 3,
                targetSpeedFactor: config.targetSpeedFactor ?? 0.5,
                laneOffset: config.actions.includes(PrepareActionType.LANE_SWITCH)
                    ? (config.laneOffset ?? -1.5)
                    : 0,
                clickDeadline: config.clickDeadline ?? 5,
                status
            }
        }

        // Check active events for offset hold distance (player has passed but should maintain offset)
        for (const [eventId, context] of this.activeEvents) {
            const event = this.eventRegistry.get(eventId)
            if (!event?.prepareConfig || !event.trigger.position) continue

            const config = event.prepareConfig
            const priority = event.priority || 0
            if (priority <= bestPriority) continue

            // Determine if we should send instruction for this active event
            let instruction: PrepareInstruction | null = null

            // Check for Active Hazard (Stop/Decel)
            // If the event requires stopping or decelerating, we continue to enforce this 
            // while within the active range (trigger radius + buffer)
            const isStopOrDecel = config.actions.includes(PrepareActionType.STOP) || config.actions.includes(PrepareActionType.DECELERATE)
            const isLaneSwitch = config.actions.includes(PrepareActionType.LANE_SWITCH)

            const eventPos = new THREE.Vector3(...event.trigger.position)
            const distToTrigger = playerState.position.distanceTo(eventPos)
            const activeRadius = (event.trigger.radius || 0) + 5 // 5m buffer to prevent state flickering

            if (isStopOrDecel && distToTrigger <= activeRadius) {
                instruction = {
                    eventId: event.id,
                    eventName: event.name,
                    triggerPosition: event.trigger.position!,
                    shouldBrake: config.actions.includes(PrepareActionType.DECELERATE),
                    shouldStop: config.actions.includes(PrepareActionType.STOP),
                    stopDuration: config.stopDuration ?? 3,
                    targetSpeedFactor: config.targetSpeedFactor ?? 0.5,
                    laneOffset: isLaneSwitch ? (config.laneOffset ?? -1.5) : 0,
                    clickDeadline: config.clickDeadline ?? 5,
                    status: PrepareZoneStatus.INSIDE_TRIGGER
                }
            }
            // Check for Offset Hold (Recovery Phase)
            // Only applies if we aren't in the critical Stop/Decel phase (or if not applicable)
            else if (isLaneSwitch) {
                const offsetHoldDistance = config.offsetHoldDistance ?? 0
                if (offsetHoldDistance > 0) {
                    // Calculate traveled distance since activation
                    const distanceTraveled = playerState.position.distanceTo(context.startPosition)

                    if (distanceTraveled <= offsetHoldDistance) {
                        // Recovery Mode: Maintain lane offset but resume speed
                        instruction = {
                            eventId: event.id,
                            eventName: event.name,
                            triggerPosition: event.trigger.position!,
                            shouldBrake: false,
                            shouldStop: false,
                            stopDuration: 0,
                            targetSpeedFactor: 1, // Resume normal speed
                            laneOffset: config.laneOffset ?? -1.5,
                            clickDeadline: config.clickDeadline ?? 5,
                            status: PrepareZoneStatus.INSIDE_TRIGGER
                        }
                    }
                }
            }

            if (instruction) {
                bestPriority = priority
                bestInstruction = instruction
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
