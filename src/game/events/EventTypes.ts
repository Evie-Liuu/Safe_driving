import * as THREE from 'three'

/**
 * Event lifecycle states
 */
export enum EventState {
    PENDING = 'pending',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

/**
 * Event trigger types
 */
export enum TriggerType {
    PROXIMITY = 'proximity',
    TIME = 'time',
    CONDITION = 'condition'
}

/**
 * Event action types
 */
export enum ActionType {
    MOVEMENT = 'movement',
    ANIMATION = 'animation',
    SOUND = 'sound',
    SCRIPT = 'script',
    LIGHT = 'light',
    PREPARE_ANIMATION = 'prepare_animation'
}

/**
 * Actor types
 */
export enum ActorType {
    VEHICLE = 'vehicle',
    PEDESTRIAN = 'pedestrian',
    OBJECT = 'object'
}

/**
 * Player response types
 */
export enum PlayerResponseType {
    DECELERATE = 'decelerate',
    STOP = 'stop',
    AVOID = 'avoid',
    NONE = 'none'
}

/**
 * Base event trigger interface
 */
export interface EventTrigger {
    type: TriggerType
    position?: [number, number, number]
    radius?: number
    time?: number
    condition?: (playerState: PlayerState) => boolean
    requiredSpeed?: {
        min?: number
        max?: number
    }
}

/**
 * Player state for event evaluations
 */
export interface PlayerState {
    position: THREE.Vector3
    speed: number
    rotation: number
    isCruising: boolean
}

/**
 * Event actor definition
 */
export interface EventActor {
    id: string
    type: ActorType
    model: string
    animationUrls?: string[] // External animation files (supports separate animations)
    initialPosition: [number, number, number]
    initialRotation?: [number, number, number]
    scale?: [number, number, number]
    color?: string
}

/**
 * Base event action interface
 */
export interface BaseEventAction {
    actorId: string
    type: ActionType
    time: number // Time in seconds when this action should start
    duration?: number
}

/**
 * Movement action
 */
export interface MovementAction extends BaseEventAction {
    type: ActionType.MOVEMENT
    path: [number, number, number][]
    speed: number
    loop?: boolean
}

/**
 * Animation action
 */
export interface AnimationAction extends BaseEventAction {
    type: ActionType.ANIMATION
    name: string
    loop?: boolean
    fadeIn?: number
    fadeOut?: number
}

/**
 * Sound action
 */
export interface SoundAction extends BaseEventAction {
    type: ActionType.SOUND
    soundUrl: string
    volume?: number
    loop?: boolean
}

/**
 * Light action (for hazard lights, turn signals, etc.)
 */
export interface LightAction extends BaseEventAction {
    type: ActionType.LIGHT
    lightType: 'hazard' | 'turnLeft' | 'turnRight' | 'brake'
    enabled: boolean
    blinkRate?: number
}

/**
 * Script action (custom scripted behavior)
 */
export interface ScriptAction extends BaseEventAction {
    type: ActionType.SCRIPT
    script: (actor: any, context: EventContext) => void
}

/**
 * Prepare animation action (load animations dynamically)
 */
export interface PrepareAnimationAction extends BaseEventAction {
    type: ActionType.PREPARE_ANIMATION
    animationUrls: string[]
}

/**
 * Union type for all event actions
 */
export type EventAction =
    | MovementAction
    | AnimationAction
    | SoundAction
    | LightAction
    | ScriptAction
    | PrepareAnimationAction

/**
 * Required player response
 */
export interface RequiredPlayerResponse {
    type: PlayerResponseType
    targetSpeed?: {
        min?: number
        max?: number
    }
    validationRadius?: number
    timeLimit?: number
}

/**
 * Event completion criteria
 */
export interface CompletionCriteria {
    playerPassed?: boolean
    minSpeed?: number
    maxSpeed?: number
    allActionsCompleted?: boolean
    customCondition?: (context: EventContext) => boolean
}

/**
 * Event context (runtime state)
 */
export interface EventContext {
    eventId: string
    state: EventState
    startTime: number
    activeActors: Map<string, any>
    completedActions: Set<string>
    playerState: PlayerState
}

/**
 * Auto-prepare action type for cruise mode
 */
export enum PrepareActionType {
    DECELERATE = 'decelerate',
    LANE_SWITCH = 'lane_switch'
}

/**
 * Auto-prepare configuration when approaching danger events in cruise mode
 */
export interface PrepareConfig {
    radius: number // Detection radius (larger than trigger radius)
    actions: PrepareActionType[]
    targetSpeedFactor?: number // Speed multiplier (0-1), e.g. 0.5 = half speed
    laneOffset?: number // Lateral offset in meters (positive = left, negative = right)
    clickDeadline?: number // Max seconds allowed to click the danger factor (default: 5)
}

/**
 * Danger click judgment result
 */
export enum DangerClickJudgment {
    FAST = 'fast',
    SLOW = 'slow',
    MISS = 'miss'
}

/**
 * Prepare zone detection result
 */
export interface PrepareInstruction {
    eventId: string
    eventName: string
    triggerPosition: [number, number, number]
    shouldBrake: boolean
    targetSpeedFactor: number
    laneOffset: number
    clickDeadline: number
}

/**
 * Main game event interface
 */
export interface GameEvent {
    id: string
    name: string
    description?: string
    trigger: EventTrigger
    actors: EventActor[]
    actions: EventAction[]
    requiredPlayerResponse?: RequiredPlayerResponse
    completionCriteria?: CompletionCriteria
    priority?: number // Higher priority events trigger first
    repeatable?: boolean
    prepareConfig?: PrepareConfig // Auto-prepare when approaching in cruise mode
}

/**
 * Event callback types
 */
export interface EventCallbacks {
    onEventTriggered?: (eventId: string) => void
    onEventActivated?: (eventId: string) => void
    onEventCompleted?: (eventId: string, success: boolean) => void
    onEventFailed?: (eventId: string, reason: string) => void
    onPlayerResponseRequired?: (eventId: string, response: RequiredPlayerResponse) => void
    onPlayerResponseValidated?: (eventId: string, correct: boolean) => void
}

/**
 * Event manager configuration
 */
export interface EventManagerConfig {
    enableDebugVisualization?: boolean
    maxConcurrentEvents?: number
    eventTriggerCheckInterval?: number
    callbacks?: EventCallbacks
}
