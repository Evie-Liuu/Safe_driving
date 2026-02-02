import {
    EventAction,
    ActionType,
    MovementAction,
    AnimationAction,
    LightAction,
    SoundAction,
    ScriptAction,
    SceneObjectAction,
    EventContext
} from './EventTypes'
import { SceneObjectRegistry } from '../registry/SceneObjectRegistry'

/**
 * Action runtime state
 */
interface ActionState {
    action: EventAction
    startTime: number
    endTime: number
    isActive: boolean
    isCompleted: boolean
}

/**
 * Event executor
 * Executes event actions with timeline coordination
 */
export class EventExecutor {
    private timeline: Map<string, ActionState[]> = new Map()
    private activeActions: Map<string, ActionState> = new Map()

    /**
     * Schedule actions for an event
     */
    scheduleActions(eventId: string, actions: EventAction[], startTime: number): void {
        const actionStates: ActionState[] = actions.map(action => ({
            action,
            startTime: startTime + action.time,
            endTime: startTime + action.time + (action.duration || 0),
            isActive: false,
            isCompleted: false
        }))

        this.timeline.set(eventId, actionStates)
    }

    /**
     * Update action timeline
     */
    updateTimeline(
        eventId: string,
        currentTime: number,
        actorRefs: Map<string, any>,
        context: EventContext,
        onActionCompleted?: (actionId: string) => void
    ): void {
        const actionStates = this.timeline.get(eventId)
        if (!actionStates) return

        // Debug: Log actorRefs contents
        // console.log(`[EventExecutor] 🔍 Event: ${eventId}, ActorRefs size: ${actorRefs.size}`)
        // console.log(`[EventExecutor] 📋 Available actors:`, Array.from(actorRefs.keys()))

        for (const actionState of actionStates) {
            if (actionState.isCompleted) continue

            const { action, startTime, endTime } = actionState

            // Debug: Log action state
            // console.log(`[EventExecutor] 🎬 Action: ${action.type} for ${action.actorId}`)
            // console.log(`[EventExecutor] ⏰ Time - Current: ${currentTime.toFixed(2)}, Start: ${startTime.toFixed(2)}, Active: ${actionState.isActive}`)

            // Check if action should start
            if (!actionState.isActive && currentTime >= startTime) {
                const actor = actorRefs.get(action.actorId)

                // console.log(`[EventExecutor] 🔎 Looking for actor '${action.actorId}': ${actor ? 'FOUND ✅' : 'NOT FOUND ❌'}`)

                // Only start if actor is available
                if (actor) {
                    actionState.isActive = true
                    // console.log(`[EventExecutor] ▶️ Executing ${action.type} action for ${action.actorId}`)
                    this.executeAction(action, actor, context)
                } else {
                    // Actor not ready yet, wait for next frame
                    // console.warn(`[EventExecutor] ⏳ Waiting for actor '${action.actorId}' to execute ${action.type}`)
                    // console.warn(`[EventExecutor] 📍 Available actors in map:`, Array.from(actorRefs.keys()).join(', ') || 'NONE')
                }
            }

            // Check if action should end
            if (actionState.isActive && action.duration && currentTime >= endTime) {
                actionState.isCompleted = true
                console.log(`[EventExecutor] ✅ Action completed: ${action.type} for ${action.actorId}`)
                if (onActionCompleted) {
                    onActionCompleted(`${eventId}_${action.actorId}_${action.type}_${action.time}`)
                }
            }
        }
    }

    /**
     * Execute a single action
     */
    private executeAction(action: EventAction, actor: any, context: EventContext): void {
        switch (action.type) {
            case ActionType.MOVEMENT:
                this.executeMovement(action as MovementAction, actor)
                break

            case ActionType.ANIMATION:
                this.executeAnimation(action as AnimationAction, actor)
                break

            case ActionType.LIGHT:
                this.executeLight(action as LightAction, actor)
                break

            case ActionType.SOUND:
                this.executeSound(action as SoundAction, actor)
                break

            case ActionType.SCRIPT:
                this.executeScript(action as ScriptAction, actor, context)
                break

            case ActionType.PREPARE_ANIMATION:
                this.executePrepareAnimation(action as any, actor)
                break

            case ActionType.SCENE_OBJECT:
                this.executeSceneObject(action as SceneObjectAction)
                break

            default:
                console.warn(`Unknown action type: ${(action as any).type}`)
        }
    }

    /**
     * Execute movement action
     */
    private executeMovement(action: MovementAction, actor: any): void {
        // console.log(`[EventExecutor] 🚗 executeMovement called for actor ${action.actorId}`)
        // console.log(`[EventExecutor] 📍 Movement path:`, action.path)
        // console.log(`[EventExecutor] ⚡ Speed: ${action.speed}, Loop: ${action.loop}`)

        if (!actor.startMovement) {
            // console.error(`[EventExecutor] ❌ Actor ${action.actorId} does not support movement!`)
            // console.error(`[EventExecutor] 🔍 Actor object:`, actor)
            // console.error(`[EventExecutor] 🔍 Available methods:`, Object.keys(actor))
            return
        }

        // console.log(`[EventExecutor] ✅ Actor has startMovement method, calling it now...`)

        actor.startMovement({
            path: action.path,
            speed: action.speed,
            loop: action.loop || false
        })

        console.log(`[EventExecutor] 🏁 Movement started for actor ${action.actorId}`)
    }

    /**
     * Execute animation action
     */
    private executeAnimation(action: AnimationAction, actor: any): void {
        // 檢查是否為預載的 time:0 動畫（已暫停在第一幀）
        if (action.time === 0 && actor.resumeAnimation) {
            // 恢復播放，不重新載入
            actor.resumeAnimation()
            console.log(`Animation ${action.name} resumed for actor ${action.actorId}`)
            return
        }

        if (!actor.playAnimation) {
            console.warn('Actor does not support animations')
            return
        }

        actor.playAnimation({
            name: action.name,
            loop: action.loop || false,
            fadeIn: action.fadeIn || 0.5,
            fadeOut: action.fadeOut || 0.5
        })

        console.log(`Animation ${action.name} started for actor ${action.actorId}`)
    }

    /**
     * Execute light action
     */
    private executeLight(action: LightAction, actor: any): void {
        if (!actor.setLight) {
            console.warn('Actor does not support lights')
            return
        }

        actor.setLight({
            type: action.lightType,
            enabled: action.enabled,
            blinkRate: action.blinkRate
        })

        console.log(`Light ${action.lightType} ${action.enabled ? 'enabled' : 'disabled'} for actor ${action.actorId}`)
    }

    /**
     * Execute sound action
     */
    private executeSound(action: SoundAction, actor: any): void {
        if (!actor.playSound) {
            console.warn('Actor does not support sound')
            return
        }

        actor.playSound({
            url: action.soundUrl,
            volume: action.volume || 1.0,
            loop: action.loop || false
        })

        console.log(`Sound ${action.soundUrl} playing for actor ${action.actorId}`)
    }

    /**
     * Execute custom script action
     */
    private executeScript(action: ScriptAction, actor: any, context: EventContext): void {
        try {
            action.script(actor, context)
            console.log(`Script executed for actor ${action.actorId}`)
        } catch (error) {
            console.error(`Script execution failed for actor ${action.actorId}:`, error)
        }
    }

    /**
     * Execute prepare animation action
     */
    private executePrepareAnimation(action: any, actor: any): void {
        if (!actor.loadAnimations) {
            console.warn('Actor does not support loading animations')
            return
        }

        actor.loadAnimations(action.animationUrls)
            .then(() => {
                console.log(`Animations prepared for actor ${action.actorId}`)
            })
            .catch((err: any) => {
                console.error(`Failed to prepare animations for actor ${action.actorId}:`, err)
            })

        // This action is considered "started" immediately, completion is handled by duration if specified,
        // or effectively immediate if we don't block.
        // For now, we fire and forget the loading, but in a real scenario we might want to wait.
        // However, the action system is time-based.
        console.log(`Prepare animation started for actor ${action.actorId}`)
    }

    /**
     * Execute scene object action (control traffic lights, signs, etc.)
     */
    private executeSceneObject(action: SceneObjectAction): void {
        const sceneObject = SceneObjectRegistry.getObject(action.objectId)

        if (!sceneObject) {
            console.warn(`[EventExecutor] Scene object not found: ${action.objectId}`)
            return
        }

        sceneObject.executeCommand(action.command, action.params)
        console.log(`[EventExecutor] 🚦 Scene object ${action.objectId} executed command: ${action.command}`, action.params)
    }

    /**
     * Check if all actions are completed for an event
     */
    isEventCompleted(eventId: string): boolean {
        const actionStates = this.timeline.get(eventId)
        if (!actionStates) return true

        return actionStates.every(state => state.isCompleted)
    }

    /**
     * Get completion progress for an event (0-1)
     */
    getProgress(eventId: string): number {
        const actionStates = this.timeline.get(eventId)
        if (!actionStates || actionStates.length === 0) return 1

        const completedCount = actionStates.filter(state => state.isCompleted).length
        return completedCount / actionStates.length
    }

    /**
     * Cancel all actions for an event
     */
    cancelActions(eventId: string): void {
        this.timeline.delete(eventId)

        // Remove any active actions for this event
        for (const [key, state] of this.activeActions.entries()) {
            if (key.startsWith(eventId)) {
                this.activeActions.delete(key)
            }
        }

        console.log(`Actions canceled for event ${eventId}`)
    }

    /**
     * Clear all timelines
     */
    clear(): void {
        this.timeline.clear()
        this.activeActions.clear()
    }
}
