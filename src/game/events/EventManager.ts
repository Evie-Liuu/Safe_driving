import * as THREE from 'three'
import {
    GameEvent,
    EventState,
    EventContext,
    PlayerState,
    EventManagerConfig,
    EventCallbacks,
    TriggerType,
    PlayerResponseType
} from './EventTypes'

/**
 * Central event management system
 * Handles event registration, triggering, and lifecycle management
 */
export class EventManager {
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
        if (this.pendingEvents.has(event.id)) {
            console.warn(`Event ${event.id} already registered`)
            return
        }

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

        // Check if we've reached max concurrent events
        if (this.activeEvents.size >= this.config.maxConcurrentEvents!) {
            return
        }

        // Sort pending events by priority
        const sortedEvents = Array.from(this.pendingEvents.values())
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))

        for (const event of sortedEvents) {
            if (this.shouldTriggerEvent(event, playerState)) {
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
                if (!trigger.position || !trigger.radius) return false

                const eventPos = new THREE.Vector3(...trigger.position)
                const distance = playerState.position.distanceTo(eventPos)

                if (distance > trigger.radius) return false

                // Check speed requirements if specified
                if (trigger.requiredSpeed) {
                    const speedKmh = playerState.speed * 3.6
                    if (trigger.requiredSpeed.min && speedKmh < trigger.requiredSpeed.min) return false
                    if (trigger.requiredSpeed.max && speedKmh > trigger.requiredSpeed.max) return false
                }

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

        // Check if player has passed the event location
        if (criteria.playerPassed) {
            const eventPos = event.trigger.position
            if (!eventPos) return false

            const eventZ = eventPos[2]
            const playerZ = playerState.position.z

            // Assuming forward movement is negative Z direction
            if (playerZ < eventZ - (event.trigger.radius || 0)) {
                // Player has passed

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
        const pending = this.pendingEvents.get(eventId)
        if (pending) return pending

        // Would need to store original event definitions separately
        // For now, we'll just return undefined for active/completed events
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
        return activeEventIds
            .map(id => this.pendingEvents.get(id))
            .filter(Boolean) as GameEvent[]
    }

    /**
     * Get event context
     */
    getEventContext(eventId: string): EventContext | undefined {
        return this.activeEvents.get(eventId)
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
        this.pendingEvents.clear()
        this.activeEvents.clear()
        this.completedEvents.clear()
    }
}
