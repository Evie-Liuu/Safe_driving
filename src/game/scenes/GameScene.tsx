

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Environment } from '../components/Environment'
import { PlayerController } from '../components/PlayerController'
import { OncomingVehicle } from '../components/OncomingVehicle'
import { PerformanceMonitor, PerformanceStats } from '../optimization/PerformanceMonitor'
import { ModelLoader } from '../models/ModelLoader'
import { MaleCharacter } from '../components/MaleCharacter'
import { cruisePoints, events as riskEvents } from '@/game/data/RiskEvents_1'
import { EventManager } from '../events/EventManager'
import { EventExecutor } from '../events/EventExecutor'
import { EventActor } from '../components/EventActor'
import { EventActorHandle } from '../components/EventActor'
import { EventSystemUpdater } from '../components/EventSystemUpdater'
import { PlayerState, ActionType, ScriptAction, PrepareInstruction, DangerClickJudgment, PrepareZoneStatus, GameEvent, ActorType, AnimationAction } from '../events/EventTypes'
import { AnimationManager } from '../animations/AnimationManager'
import { getSharedLoader } from '../utils/SharedLoader'
import { TrafficLight } from '../components/TrafficLight'
import { trafficLights } from '../data/TrafficLights'

/**
 * 主遊戲場景
 * 這是一個範例場景，展示如何使用各種系統
 */
export function GameScene() {
  const [playerPosition, setPlayerPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0)
  )
  const [clickPoints, setClickPoints] = useState<THREE.Vector3[]>([])
  const [currentClick, setCurrentClick] = useState<THREE.Vector3 | null>(null)
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [isCruising, setIsCruising] = useState(false)
  const [isBraking, setIsBraking] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [oncomingVehicles, setOncomingVehicles] = useState<Array<{
    id: number
    startPosition: [number, number, number]
    endPosition: [number, number, number]
    color?: string
  }>>([])
  const vehicleIdCounter = useRef(0)

  const debugflag = useRef(true)

  // Event system
  const eventManagerRef = useRef<EventManager | null>(null)
  const eventExecutorRef = useRef<EventExecutor>(new EventExecutor())
  const [activeEventActors, setActiveEventActors] = useState<Array<any>>([])
  const actorRefsMap = useRef<Map<string, React.RefObject<EventActorHandle>>>(new Map())
  const [playerRotation, setPlayerRotation] = useState(0)
  const [autoBraking, setAutoBraking] = useState(false)
  const [autoLaneOffset, setAutoLaneOffset] = useState(0)
  const [autoSpeedFactor, setAutoSpeedFactor] = useState(0)

  // Danger click judgment system
  const [activeDanger, setActiveDanger] = useState<{
    eventId: string
    eventName: string
    triggerPosition: [number, number, number]
    clickDeadline: number
    prepareRadius: number // Store prepare radius for FAST range calculation
    triggerRadius: number // Store trigger radius for FAST range calculation
  } | null>(null)
  const dangerEnteredTimeRef = useRef<number>(0)
  const brakingStartTimeRef = useRef<number>(0)
  const dangerClickedRef = useRef(false)
  const fastRangeEnteredRef = useRef(false) // Track if player entered FAST range (prepareRadius + 5m)
  // Stop action tracking
  const stopStartTimeRef = useRef<number>(0)
  const stopCompletedEventsRef = useRef<Set<string>>(new Set())
  // Track current processing event to prevent timer resets when activeDanger is cleared
  const currentProcessingEventIdRef = useRef<string | null>(null)
  const [judgmentResult, setJudgmentResult] = useState<{
    judgment: DangerClickJudgment
    eventName: string
  } | null>(null)
  const judgmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track loading state for animations and models
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false)
  const readyActorsRef = useRef<Set<string>>(new Set())

  // Track pre-spawned events (actors visible but actions not yet triggered)
  const preSpawnedEventIds = useRef<Set<string>>(new Set())

  // Track which events player has clicked/acknowledged (for MISS judgment on completion)
  const clickedEventIds = useRef<Set<string>>(new Set())

  // Click error tolerance system (3 wrong clicks allowed)
  const MAX_WRONG_CLICKS = 3
  const [wrongClickCount, setWrongClickCount] = useState(0)
  const [isClickDisabled, setIsClickDisabled] = useState(false)
  const clickCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scoring system
  const SCORE_FAST = 12.5
  const SCORE_SLOW = 6.25
  const SCORE_MISS = 0
  const MAX_MISS_TOLERANCE = 3
  const [scoreHistory, setScoreHistory] = useState<Array<{
    eventName: string
    judgment: DangerClickJudgment
    score: number
  }>>([])
  const [missCount, setMissCount] = useState(0)
  const [showScorePanel, setShowScorePanel] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)

  // Debug visualization toggle
  const [showDebugRadius, setShowDebugRadius] = useState(true) // Set to true by default for development
  const [showDebugEvent, setShowDebugEvent] = useState(false) // Set to true by default for development

  // Start screen and instructions
  const [showStartScreen, setShowStartScreen] = useState(true)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const handleStatsUpdate = useCallback((newStats: PerformanceStats) => {
    setStats(newStats)
  }, [])

  const handlePlayerMove = useCallback((position: THREE.Vector3) => {
    // Create a new Vector3 to trigger useEffect dependencies
    setPlayerPosition(new THREE.Vector3(position.x, position.y, position.z))
  }, [])

  const handleSpeedChange = useCallback((speed: number) => {
    setCurrentSpeed(speed)
  }, [])

  const toggleCruise = useCallback(() => {
    setIsCruising(prev => !prev)
  }, [])

  // Record score for a judgment
  const recordScore = useCallback((eventName: string, judgment: DangerClickJudgment) => {
    let score = SCORE_MISS
    if (judgment === DangerClickJudgment.FAST) {
      score = SCORE_FAST
    } else if (judgment === DangerClickJudgment.SLOW) {
      score = SCORE_SLOW
    } else if (judgment === DangerClickJudgment.MISS) {
      setMissCount(prev => prev + 1)
    }
    // WRONG clicks don't affect score history

    if (judgment !== DangerClickJudgment.WRONG) {
      setScoreHistory(prev => [...prev, { eventName, judgment, score }])
    }
  }, [])

  // Handle cruise complete - show score panel
  const handleCruiseComplete = useCallback(() => {
    console.log('[GameScene] 🏁 Cruise completed!')
    setIsCruising(false)
    setGameEnded(true)
    setShowScorePanel(true)
  }, [])

  // Restart game
  const handleRestart = useCallback(() => {
    // Reset all game state
    setScoreHistory([])
    setMissCount(0)
    setWrongClickCount(0)
    setIsClickDisabled(false)
    setShowScorePanel(false)
    setGameEnded(false)
    setActiveDanger(null)
    setJudgmentResult(null)
    clickedEventIds.current.clear()
    dangerClickedRef.current = false

    // Reset event manager
    if (eventManagerRef.current) {
      eventManagerRef.current.reset()
      // Re-register events
      eventManagerRef.current.registerEvents(riskEvents)
    }

    // Reload the page to fully reset (simplest approach)
    window.location.reload()
  }, [])

  const handlePrepareInstruction = useCallback((instruction: PrepareInstruction | null) => {
    if (instruction) {
      // Track when we first enter prepare zone for this event
      if (currentProcessingEventIdRef.current !== instruction.eventId) {
        // Find the event to get prepareRadius and triggerRadius
        const event = riskEvents.find(e => e.id === instruction.eventId)
        const prepareRadius = event?.prepareConfig?.radius || 25
        const triggerRadius = event?.trigger.radius || 10

        currentProcessingEventIdRef.current = instruction.eventId
        dangerEnteredTimeRef.current = performance.now()
        brakingStartTimeRef.current = 0
        stopStartTimeRef.current = 0
        dangerClickedRef.current = false
        fastRangeEnteredRef.current = false
        setActiveDanger({
          eventId: instruction.eventId,
          eventName: instruction.eventName,
          triggerPosition: instruction.triggerPosition,
          clickDeadline: instruction.clickDeadline,
          prepareRadius: prepareRadius,
          triggerRadius: triggerRadius
        })
      }

      // Track when braking starts
      if (instruction.shouldBrake && brakingStartTimeRef.current === 0) {
        brakingStartTimeRef.current = performance.now()
      }

      // Player entered trigger radius — only clear danger marker if event was actually triggered
      if (instruction.status === PrepareZoneStatus.INSIDE_TRIGGER && activeDanger && !dangerClickedRef.current) {
        // Check if event was actually triggered (has active context)
        const eventContext = eventManagerRef.current?.getEventContext(activeDanger.eventId)
        if (eventContext) {
          // Event is active - MISS will be handled in onEventCompleted if player didn't click
          console.log(`[GameScene] ✅ Event ${activeDanger.eventId} was triggered, clearing danger marker (MISS handled by onEventCompleted)`)
          setActiveDanger(null)
        }
        // If event not triggered yet (e.g., speed requirement not met), keep activeDanger for MISS judgment
      }

      // Handle STOP action - only activate when inside trigger radius
      let effectiveSpeedFactor = instruction.targetSpeedFactor

      // Debug: log STOP conditions
      if (instruction.shouldStop) {
        console.log(`[GameScene] 🔍 STOP check - shouldStop: ${instruction.shouldStop}, status: ${instruction.status}, completed: ${stopCompletedEventsRef.current.has(instruction.eventId)}`)
      }

      const shouldActivateStop = instruction.shouldStop &&
        instruction.status === PrepareZoneStatus.INSIDE_TRIGGER &&
        !stopCompletedEventsRef.current.has(instruction.eventId)

      if (shouldActivateStop) {
        // Force speed to 0 for stop action
        effectiveSpeedFactor = 0

        // Track stop start time when speed is near zero
        if (currentSpeed < 1 && stopStartTimeRef.current === 0) {
          stopStartTimeRef.current = performance.now()
          console.log(`[GameScene] 🛑 Stop started for event: ${instruction.eventId}`)
        }

        // Check if stop duration has elapsed
        if (stopStartTimeRef.current > 0) {
          const stopElapsed = (performance.now() - stopStartTimeRef.current) / 1000
          if (stopElapsed >= instruction.stopDuration) {
            console.log(`[GameScene] ✅ Stop completed for event: ${instruction.eventId} (${stopElapsed.toFixed(1)}s)`)
            stopCompletedEventsRef.current.add(instruction.eventId)
            stopStartTimeRef.current = 0
            // Resume with original speed factor
            effectiveSpeedFactor = instruction.targetSpeedFactor > 0 ? instruction.targetSpeedFactor : 1
          }
        }
      }

      setAutoBraking(instruction.shouldBrake || shouldActivateStop)
      setAutoLaneOffset(instruction.laneOffset)
      setAutoSpeedFactor(effectiveSpeedFactor)
    } else {
      currentProcessingEventIdRef.current = null
      // instruction is null → player is outside all prepare zones
      if (activeDanger && !dangerClickedRef.current) {
        // Check if the event was activated (player entered trigger radius)
        // If event is now active, it's NOT a miss - player triggered the event
        const eventContext = eventManagerRef.current?.getEventContext(activeDanger.eventId)
        if (eventContext) {
          // Event is active - player successfully triggered it, clear without MISS
          // MISS judgment will be handled in onEventCompleted if player didn't click
          console.log(`[GameScene] ✅ Event ${activeDanger.eventId} was triggered, clearing danger marker`)
          setActiveDanger(null)
        } else {
          // Event was NOT activated - check if player has moved far enough to be considered a miss
          // This handles the "passing by from the side" scenario
          const triggerPos = activeDanger.triggerPosition
          const distanceFromEvent = Math.sqrt(
            Math.pow(playerPosition.x - triggerPos[0], 2) +
            Math.pow(playerPosition.z - triggerPos[2], 2)
          )

          // Find the event's prepare radius to determine miss threshold
          const event = riskEvents.find(e => e.id === activeDanger.eventId)
          const prepareRadius = event?.prepareConfig?.radius || 25
          const missThreshold = prepareRadius + 15 // Player must be well beyond prepare zone

          if (distanceFromEvent > missThreshold) {
            const name = activeDanger.eventName
            console.log(`[GameScene] ❌ Player passed event ${activeDanger.eventId} without triggering (distance: ${distanceFromEvent.toFixed(1)}m) - MISS`)
            setJudgmentResult({ judgment: DangerClickJudgment.MISS, eventName: name })
            recordScore(name, DangerClickJudgment.MISS)
            setActiveDanger(null)
            if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current)
            judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 2000)
          }
          // If not far enough yet, keep activeDanger active (player might still approach)
        }
      }

      setAutoBraking(false)
      setAutoLaneOffset(0)
      setAutoSpeedFactor(0)
    }
  }, [activeDanger, playerPosition.x, playerPosition.z])

  // TODO: Handle screen click for danger identification
  const handleScreenClick = useCallback(() => {
    // Ignore clicks if disabled (exceeded wrong click limit)
    if (isClickDisabled) return

    // Ignore if already clicked for current danger
    if (activeDanger && dangerClickedRef.current) return

    // Clear any existing judgment timer
    if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current)

    if (activeDanger) {
      // CORRECT CLICK - There's an active danger
      dangerClickedRef.current = true

      // Track that player clicked this event (for MISS judgment on completion)
      clickedEventIds.current.add(activeDanger.eventId)

      // Reset wrong click count on successful identification
      setWrongClickCount(0)

      // Calculate distance from player to event trigger position
      const triggerPos = activeDanger.triggerPosition
      const distance = Math.sqrt(
        Math.pow(playerPosition.x - triggerPos[0], 2) +
        Math.pow(playerPosition.z - triggerPos[2], 2)
      )

      // FAST range: based on the larger of trigger or prepare radius
      // This handles cases where trigger radius > prepare radius
      const FAST_OUTER_BUFFER = 5 // meters
      const prepareRadius = activeDanger.prepareRadius
      const triggerRadius = activeDanger.triggerRadius
      const baseRadius = Math.max(prepareRadius, triggerRadius) // Use the larger radius
      const fastRangeOuter = prepareRadius + FAST_OUTER_BUFFER
      const fastRangeInner = baseRadius

      // Determine judgment based on distance:
      // - FAST: clicked while in range (fastRangeOuter ~ fastRangeInner)
      // - SLOW: clicked inside baseRadius
      let judgment: DangerClickJudgment
      if (distance >= fastRangeInner && distance <= fastRangeOuter) {
        judgment = DangerClickJudgment.FAST
      } else {
        judgment = DangerClickJudgment.SLOW
      }

      const eventName = activeDanger.eventName
      setJudgmentResult({ judgment, eventName })
      recordScore(eventName, judgment)
      setActiveDanger(null)

      // Clear judgment display after 2s
      judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 2000)
    } else {
      // WRONG CLICK - No danger present
      const newWrongCount = wrongClickCount + 1
      setWrongClickCount(newWrongCount)

      // Show wrong click feedback
      setJudgmentResult({ judgment: DangerClickJudgment.WRONG, eventName: `剩餘 ${MAX_WRONG_CLICKS - newWrongCount} 次` })

      // TODO: 遊戲結束
      if (newWrongCount >= MAX_WRONG_CLICKS) {
        // Exceeded limit - disable clicks temporarily
        setIsClickDisabled(true)
        console.log(`[GameScene] ❌ Exceeded wrong click limit (${MAX_WRONG_CLICKS})`)

        // Re-enable after cooldown (3 seconds)
        if (clickCooldownRef.current) clearTimeout(clickCooldownRef.current)
        clickCooldownRef.current = setTimeout(() => {
          setIsClickDisabled(false)
          setWrongClickCount(0)
          setJudgmentResult(null)
          console.log(`[GameScene] ✅ Click re-enabled after cooldown`)
        }, 3000)
      } else {
        // Clear wrong click feedback after 1s
        judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 1000)
      }
    }
  }, [activeDanger, wrongClickCount, isClickDisabled])

  // Keep old function name for compatibility
  const handleDangerClick = handleScreenClick

  // Preload all assets (animations + models)
  useEffect(() => {
    const preloadAllAssets = async () => {
      const animationUrls = new Set<string>()
      const modelUrls = new Set<string>()

      // Collect all unique URLs from events
      riskEvents.forEach(event => {
        // 1. Actor models
        event.actors.forEach(actor => {
          modelUrls.add(actor.model)
          // 2. Actor animations
          if (actor.animationUrls) {
            actor.animationUrls.forEach(url => animationUrls.add(url))
          }
        })

        // 3. Action animations (prepare)
        event.actions.forEach(action => {
          if (action.type === ActionType.PREPARE_ANIMATION && (action as any).animationUrls) {
            ((action as any).animationUrls as string[]).forEach(url => animationUrls.add(url))
          }
        })
      })

      console.log(`[GameScene] 📥 Pre-loading ${modelUrls.size} models and ${animationUrls.size} animations...`)

      // Use shared loader to prevent WASM memory exhaustion
      const loader = getSharedLoader()

      // Preload models
      const modelPromises = Array.from(modelUrls).map(url =>
        new Promise<void>((resolve) => {
          loader.load(
            url,
            () => {
              console.log(`[GameScene] ✅ Model cached: ${url}`)
              resolve()
            },
            undefined,
            (error) => {
              console.error(`[GameScene] ❌ Failed to load model: ${url}`, error)
              resolve() // Don't block on failure
            }
          )
        })
      )

      // Preload animations
      const animationPromise = animationUrls.size > 0
        ? AnimationManager.getInstance().loadAnimations(Array.from(animationUrls))
        : Promise.resolve()

      // Wait for all assets
      await Promise.all([...modelPromises, animationPromise])

      console.log(`[GameScene] ✅ All assets preloaded!`)
      console.log(`[GameScene] 📋 Events registered: ${riskEvents.length}`)
      console.log(`[GameScene] 🎭 Events with spawnRadius:`, riskEvents.filter(e => e.spawnRadius).map(e => `${e.id}(${e.spawnRadius}m)`))
      setIsAssetsLoaded(true)
    }

    preloadAllAssets()
  }, [])

  // Callback for when an actor is ready (model + animations loaded)
  const handleActorReady = useCallback((actorId: string) => {
    readyActorsRef.current.add(actorId)
    console.log(`[GameScene] 🎭 Actor ready: ${actorId}, total ready: ${readyActorsRef.current.size}`)
  }, [])

  // Callback for when an actor completes its movement path
  const handleActorPathComplete = useCallback((eventId: string, actorId: string) => {
    console.log(`[GameScene] 🏁 Actor path completed: ${actorId} in event ${eventId}`)
    if (eventManagerRef.current) {
      eventManagerRef.current.markActorPathCompleted(eventId, actorId)
    }
  }, [])

  // Initialize event manager (only after assets are loaded)
  useEffect(() => {
    if (!isAssetsLoaded) {
      console.log(`[GameScene] ⏳ Waiting for assets to load before initializing event manager...`)
      return
    }

    console.log(`[GameScene] 🚀 Assets loaded, initializing event manager...`)

    const eventManager = new EventManager({
      enableDebugVisualization: true,
      maxConcurrentEvents: 3,
      callbacks: {
        onEventActivated: (eventId) => {
          console.log(`🎯 Event activated: ${eventId}`)
          const event = riskEvents.find(e => e.id === eventId)
          if (event) {
            // Only spawn actors if not already pre-spawned
            if (!preSpawnedEventIds.current.has(eventId)) {
              // Create actor refs
              const actorData = event.actors.map(actor => {
                const actorRef = React.createRef<EventActorHandle>()
                actorRefsMap.current.set(actor.id, actorRef)
                return { ...actor, ref: actorRef, eventId }
              })
              setActiveEventActors(prev => [...prev, ...actorData])
            } else {
              console.log(`[GameScene] ✅ Actors already pre-spawned for event: ${eventId}`)
            }

            // Schedule actions using the authoritative start time from context
            // This ensures sync with the EventSystemUpdater's clock
            const context = eventManager.getEventContext(eventId)
            if (context) {
              eventExecutorRef.current.scheduleActions(
                eventId,
                event.actions,
                context.startTime
              )
            } else {
              // Fallback (should normally not happen inside onEventActivated)
              console.warn(`Could not find context for activated event ${eventId}`)
              eventExecutorRef.current.scheduleActions(
                eventId,
                event.actions,
                0 // Schedule immediately if context missing
              )
            }
          }
        },
        onEventCompleted: (eventId, success) => {
          console.log(`✅ Event ${success ? 'completed' : 'failed'}: ${eventId}`)
          const event = riskEvents.find(e => e.id === eventId)
          if (event) {
            // Check if player missed clicking this danger event (fallback if onPlayerPassed missed it)
            // But usually onPlayerPassed handles it now
            if (event.prepareConfig && !clickedEventIds.current.has(eventId)) {
              console.log(`[GameScene] ❌ Event ${eventId} completed without player click - MISS (Fallback)`)
              setJudgmentResult({ judgment: DangerClickJudgment.MISS, eventName: event.name })
              recordScore(event.name, DangerClickJudgment.MISS)
              if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current)
              judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 2000)
            }

            // Clear tracking for this event
            clickedEventIds.current.delete(eventId)
            setActiveDanger(prev => prev?.eventId === eventId ? null : prev)

            // Remove actor refs and ready status
            event.actors.forEach(actor => {
              actorRefsMap.current.delete(actor.id)
              readyActorsRef.current.delete(actor.id)
            })
            // Remove actors from scene
            setActiveEventActors(prev =>
              prev.filter(a => !event.actors.find(ea => ea.id === a.id))
            )
            // Clear pre-spawned tracking
            preSpawnedEventIds.current.delete(eventId)
          }
          eventExecutorRef.current.cancelActions(eventId)
        },
        onPlayerPassed: (eventId) => {
          console.log(`[GameScene] 📍 Player passed event: ${eventId}`)
          const event = riskEvents.find(e => e.id === eventId)
          if (event && event.prepareConfig && !clickedEventIds.current.has(eventId)) {
            console.log(`[GameScene] ❌ Player passed event ${eventId} without clicking - MISS`)
            setJudgmentResult({ judgment: DangerClickJudgment.MISS, eventName: event.name })
            recordScore(event.name, DangerClickJudgment.MISS)
            if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current)
            judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 2000)

            // Mark as clicked so fallback in onEventCompleted doesn't trigger
            clickedEventIds.current.add(eventId)
          }
        },
        onPlayerResponseRequired: (eventId, response) => {
          console.log(`⚠️ Player response required for ${eventId}:`, response.type)
        }
      }
    })

    // Register all events from the route
    eventManager.registerEvents(riskEvents)
    eventManagerRef.current = eventManager

    return () => {
      eventManager.dispose()
      eventExecutorRef.current.clear()
    }
  }, [isAssetsLoaded])

  // Pre-spawn actors when player enters spawnRadius (before trigger)
  useEffect(() => {
    if (!isAssetsLoaded) {
      console.log(`[GameScene] ⏳ Assets not loaded yet, skipping pre-spawn check`)
      return
    }

    riskEvents.forEach(event => {
      // Skip if no spawnRadius defined or already pre-spawned
      if (!event.spawnRadius || preSpawnedEventIds.current.has(event.id)) return

      // Skip if event is already active (triggered)
      if (eventManagerRef.current?.getEventContext(event.id)) return

      // Check if player is within spawn radius
      const triggerPos = event.trigger.position
      if (!triggerPos) return

      const distance = Math.sqrt(
        Math.pow(playerPosition.x - triggerPos[0], 2) +
        Math.pow(playerPosition.z - triggerPos[2], 2)
      )

      if (distance <= event.spawnRadius) {
        console.log(`[GameScene] 🎭 Pre-spawning actors for event: ${event.id} (distance: ${distance.toFixed(1)}m, spawnRadius: ${event.spawnRadius}m)`)

        // Create actor refs and spawn actors
        const actorData = event.actors.map(actor => {
          const actorRef = React.createRef<EventActorHandle>()
          actorRefsMap.current.set(actor.id, actorRef)

          // 檢查是否有初始燈光動作 (ActionType.LIGHT)
          const lightAction = event.actions.find(a =>
            a.type === ActionType.LIGHT &&
            a.actorId === actor.id &&
            a.time === 0
          )

          let initialLightAction = null
          if (lightAction) {
            const la = lightAction as any
            initialLightAction = {
              type: la.lightType,
              enabled: la.enabled,
              blinkRate: la.blinkRate
            }
            // console.log(`[GameScene] 💡 Found initial light action for ${actor.id}:`, initialLightAction)
          }

          // 檢查 PEDESTRIAN 是否有初始動畫動作 (ActionType.ANIMATION at time: 0)
          let initialAnimationAction = null
          if (actor.type === ActorType.PEDESTRIAN) {
            const animAction = event.actions.find(a =>
              a.type === ActionType.ANIMATION &&
              a.actorId === actor.id &&
              a.time === 0
            )

            if (animAction) {
              const aa = animAction as AnimationAction
              initialAnimationAction = {
                name: aa.name,
                loop: aa.loop ?? true,
                fadeIn: aa.fadeIn ?? 0.3,
                fadeOut: aa.fadeOut ?? 0.3
              }
              console.log(`[GameScene] 🎭 Found initial animation action for ${actor.id}:`, initialAnimationAction)
            }
          }

          return {
            ...actor,
            ref: actorRef,
            eventId: event.id,
            isPreSpawned: true,
            initialLightAction,
            initialAnimationAction
          }
        })

        setActiveEventActors(prev => [...prev, ...actorData])
        preSpawnedEventIds.current.add(event.id)
      }
    })
  }, [playerPosition.x, playerPosition.z, isAssetsLoaded]) // Use x, z coordinates for better dependency tracking

  const handleTriggerOncomingVehicle = useCallback((playerPosition: THREE.Vector3, playerRotation: number) => {
    // 計算對向車道位置（左側3.5米）
    const leftOffset = new THREE.Vector3(3.5, 0, 0)
    leftOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation)

    // 對向車輛從前方50米開始，到後方50米結束
    const forwardDirection = new THREE.Vector3(0, 0, 50)
    forwardDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation)

    const backwardDirection = new THREE.Vector3(0, 0, -50)
    backwardDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation)

    const startPosition = playerPosition.clone().add(leftOffset).add(forwardDirection)
    const endPosition = playerPosition.clone().add(leftOffset).add(backwardDirection)

    const newVehicle = {
      id: vehicleIdCounter.current++,
      startPosition: [startPosition.x, startPosition.y, startPosition.z] as [number, number, number],
      endPosition: [endPosition.x, endPosition.y, endPosition.z] as [number, number, number],
      // color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }

    setOncomingVehicles(prev => [...prev, newVehicle])
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* 性能顯示 */}
      {/* <PerformanceDisplay stats={stats} /> */}

      {/* 3D 畫布 */}
      <Canvas shadows>
        {/* 相機 */}
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />

        {/* 環境設置 */}
        <Environment
          skyColor="#87CEEB"
          groundColor="#228B22"
          fogColor="#87CEEB"
          fogNear={50}
          fogFar={200}
        />

        {/* Event system updater */}
        <EventSystemUpdater
          eventManager={eventManagerRef.current}
          eventExecutor={eventExecutorRef.current}
          playerPosition={playerPosition}
          playerSpeed={currentSpeed}
          playerRotation={playerRotation}
          isCruising={isCruising}
          actorRefsMap={actorRefsMap.current}
          onPrepareInstruction={handlePrepareInstruction}
        />

        {/* 玩家控制器 */}
        <PlayerController
          position={[...cruisePoints[0]]}
          speed={16.67}
          rotationSpeed={3}
          onPositionChange={handlePlayerMove}
          onSpeedChange={handleSpeedChange}
          onTriggerOncomingVehicle={handleTriggerOncomingVehicle}
          onCruiseComplete={handleCruiseComplete}
          enableCameraFollow={!debugflag.current}
          isCruising={isCruising && !gameEnded && !isPaused}
          isBraking={isBraking || autoBraking}
          cruisePoints={cruisePoints}
          laneOffset={autoLaneOffset}
          targetSpeedFactor={autoSpeedFactor}
          onRotationChange={setPlayerRotation}
        >
          {/* 玩家模型 */}
          <ModelLoader url="/src/assets/models/Scooter1_Rigged.glb" rotation={[0, 0, 0]} />
        </PlayerController>

        {/* Event actors */}
        {activeEventActors.map((actor) => (
          <EventActor
            key={actor.id}
            ref={actor.ref}
            {...actor}
            onReady={handleActorReady}
            onComplete={handleActorPathComplete}
            enableDebug={true}
          />
        ))}

        {/* 場景紅綠燈 */}
        {/* {trafficLights.map((light) => (
          <TrafficLight
            key={light.id}
            {...light}
          />
        ))} */}

        {/* 一些裝飾物 */}
        {/* <DemoObjects /> */}

        {/* 行走的路人 */}
        {/* <MaleCharacter position={[5, 0, 5]} rotation={[0, 0, 0]} /> */}

        {/* 對向車輛 */}
        {/* {oncomingVehicles.map(vehicle => (
          <OncomingVehicle
            key={vehicle.id}
            startPosition={vehicle.startPosition}
            endPosition={vehicle.endPosition}
            speed={20}
            onComplete={() => {
              setOncomingVehicles(prev => prev.filter(v => v.id !== vehicle.id))
            }}
          />
        ))} */}

        {/* 危險因子點擊標記 */}
        {activeDanger && (
          <DangerMarker
            position={activeDanger.triggerPosition}
            onClick={handleDangerClick}
          />
        )}

        {/* 點擊處理器 */}
        <ClickHandler
          onClick={(point) => {
            setCurrentClick(point)
            setClickPoints(prev => [...prev, point])
          }}
        />

        {/* 點可視化 */}
        <PointVisualization currentClick={currentClick} clickPoints={clickPoints} cruisePoints={cruisePoints} />

        {/* Debug radius visualization (development only) */}
        <DebugRadiusVisualizer events={riskEvents} visible={showDebugRadius} />

        {/* 軌道控制器（開發用，實際遊戲中可能不需要） */}
        <OrbitControls enableDamping target={[playerPosition.x, playerPosition.y, playerPosition.z]} />
      </Canvas>

      {/* 全螢幕點擊區域 - 用於辨識危險 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isClickDisabled ? 'not-allowed' : 'pointer',
          zIndex: 10,
          display: debugflag.current ? 'none' : 'block'
        }}
        onClick={handleScreenClick}
      />

      {/* 剩餘點擊次數顯示 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '5px',
        zIndex: 20,
        pointerEvents: 'none'
      }}>
        {Array.from({ length: MAX_WRONG_CLICKS }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid #fff',
              background: i < (MAX_WRONG_CLICKS - wrongClickCount) ? '#44ff44' : '#ff4444',
              boxShadow: '0 0 5px rgba(0,0,0,0.5)'
            }}
          />
        ))}
      </div>

      {/* 點擊禁用提示 */}
      {isClickDisabled && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#ff4444',
          padding: '20px 40px',
          borderRadius: '10px',
          fontFamily: 'monospace',
          fontSize: '24px',
          fontWeight: 'bold',
          zIndex: 30,
          pointerEvents: 'none'
        }}>
          冷卻中...
        </div>
      )}

      {/* UI 疊加層 */}
      <UIOverlay
        playerPosition={playerPosition}
        currentClick={currentClick}
        currentSpeed={currentSpeed}
        isCruising={isCruising}
        onToggleCruise={toggleCruise}
        onBrakeStart={() => setIsBraking(true)}
        onBrakeEnd={() => setIsBraking(false)}
        showDebugRadius={showDebugRadius}
        onToggleDebugRadius={() => setShowDebugRadius(prev => !prev)}
      />

      {/* 判定結果顯示 */}
      {judgmentResult && !showScorePanel && (
        <JudgmentDisplay
          judgment={judgmentResult.judgment}
          eventName={judgmentResult.eventName}
        />
      )}

      {/* 結算面板 */}
      {showScorePanel && (
        <ScorePanel
          scoreHistory={scoreHistory}
          missCount={missCount}
          maxMissTolerance={MAX_MISS_TOLERANCE}
          onRestart={handleRestart}
        />
      )}

      {/* 危險因子提示 */}
      {activeDanger && !dangerClickedRef.current && (
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#ff4444',
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 'bold',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '10px 20px',
          borderRadius: '8px',
          border: '2px solid #ff4444',
          pointerEvents: 'none',
          animation: 'pulse 1s infinite'
        }}>
          點擊畫面中的危險因子!
        </div>
      )}

      {/* 行人事件調試面板 (開發用) */}
      {showDebugEvent && (() => {
        const event = riskEvents.find(e => e.id === 'pedestrian_crossing')
        if (!event || !event.trigger.position) return null

        const distance = Math.sqrt(
          Math.pow(playerPosition.x - event.trigger.position[0], 2) +
          Math.pow(playerPosition.z - event.trigger.position[2], 2)
        )
        const isPreSpawned = preSpawnedEventIds.current.has(event.id)
        const isActive = !!eventManagerRef.current?.getEventContext(event.id)
        const withinRange = distance <= (event.spawnRadius || 0)

        // Determine why not pre-spawned
        let reason = ''
        if (isPreSpawned) {
          reason = '已生成'
        } else if (isActive) {
          reason = '已觸發（不需pre-spawn）'
        } else if (!event.spawnRadius) {
          reason = '❌ 無 spawnRadius'
        } else if (!withinRange) {
          reason = `❌ 太遠 (需 <${event.spawnRadius}m)`
        } else if (!isAssetsLoaded) {
          reason = '⏳ 等待資源載入'
        } else {
          reason = '⚠️ 未知原因（查看Console）'
        }

        return (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '11px',
            padding: '12px',
            borderRadius: '8px',
            border: isPreSpawned ? '2px solid #44ff44' : '2px solid #ff6600',
            zIndex: 100,
            pointerEvents: 'none',
            minWidth: '280px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#ff6600' }}>
              🔍 行人穿越事件診斷
            </div>
            <div style={{ marginBottom: '3px' }}>
              玩家: [{playerPosition.x.toFixed(1)}, {playerPosition.z.toFixed(1)}]
            </div>
            <div style={{ marginBottom: '3px' }}>
              Trigger: [{event.trigger.position.map(v => v.toFixed(0)).join(', ')}]
            </div>
            <div style={{ marginBottom: '8px', color: withinRange ? '#44ff44' : '#ff6600', fontWeight: 'bold' }}>
              距離: {distance.toFixed(1)}m / {event.spawnRadius}m {withinRange ? '✅' : '❌'}
            </div>
            <div style={{ borderTop: '1px solid #444', paddingTop: '8px' }}>
              <div>Pre-spawn: {isPreSpawned ? '✅ 是' : '❌ 否'}</div>
              <div>已觸發: {isActive ? '✅ 是' : '❌ 否'}</div>
              <div>資源載入: {isAssetsLoaded ? '✅ 是' : '⏳ 否'}</div>
              <div style={{ marginTop: '8px', padding: '5px', background: 'rgba(255,102,0,0.2)', borderRadius: '4px', fontSize: '10px' }}>
                {reason}
              </div>
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
              💡 打開 Console (F12) 查看詳細日誌
            </div>
          </div>
        )
      })()}

      {/* 遊戲開始畫面 */}
      {/* {showStartScreen && (
        <StartScreen
          onStart={() => {
            setShowStartScreen(false)
          }}
        />
      )} */}

      {/* 遊戲中的說明按鈕（右下角，不在開始畫面或結算時顯示） */}
      {!showStartScreen && !showScorePanel && (
        <button
          onClick={() => {
            setShowInstructions(true)
            setIsPaused(true)
          }}
          style={{
            position: 'absolute',
            bottom: '100px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 15px rgba(74, 144, 217, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            zIndex: 100,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 144, 217, 0.7)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 144, 217, 0.5)'
          }}
          title="查看遊戲說明"
        >
          ❓
        </button>
      )}

      {/* 暫停提示 */}
      {isPaused && !showInstructions && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.9)',
          color: '#ffa500',
          padding: '30px 50px',
          borderRadius: '15px',
          fontFamily: 'monospace',
          fontSize: '28px',
          fontWeight: 'bold',
          zIndex: 500,
          boxShadow: '0 0 30px rgba(255, 165, 0, 0.5)',
          border: '2px solid #ffa500',
          pointerEvents: 'none',
          textAlign: 'center'
        }}>
          ⏸️ 遊戲已暫停
          <div style={{ fontSize: '16px', marginTop: '10px', color: '#fff' }}>
            查看說明或關閉暫停繼續遊戲
          </div>
        </div>
      )}

      {/* 遊戲中的說明面板 */}
      {showInstructions && (
        <InstructionsPanel
          onClose={() => {
            setShowInstructions(false)
            setIsPaused(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * 演示物件
 */
function DemoObjects() {
  // 使用 useMemo 緩存物件數據，避免每次重新渲染時重新生成
  const boxes = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      position: [
        Math.random() * 40 - 20,
        0.5,
        Math.random() * 40 - 20
      ] as [number, number, number],
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }))
  }, [])

  const trees = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      position: [
        Math.random() * 60 - 30,
        0,
        Math.random() * 60 - 30
      ] as [number, number, number]
    }))
  }, [])

  return (
    <group>
      {/* 創建一些隨機的立方體作為場景物件 */}
      {boxes.map((box) => (
        <mesh
          key={box.id}
          position={box.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={box.color} />
        </mesh>
      ))}

      {/* 一些樹木（用圓柱和球體模擬） */}
      {trees.map((tree) => (
        <group
          key={`tree-${tree.id}`}
          position={tree.position}
        >
          {/* 樹幹 */}
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 2]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          {/* 樹葉 */}
          <mesh position={[0, 3, 0]} castShadow>
            <sphereGeometry args={[1.5, 8, 8]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * UI 疊加層
 */
function UIOverlay({
  playerPosition,
  currentClick,
  currentSpeed,
  isCruising,
  onToggleCruise,
  onBrakeStart,
  onBrakeEnd,
  showDebugRadius,
  onToggleDebugRadius
}: {
  playerPosition: THREE.Vector3;
  currentClick: THREE.Vector3 | null;
  currentSpeed: number;
  isCruising: boolean;
  onToggleCruise: () => void;
  onBrakeStart?: () => void;
  onBrakeEnd?: () => void;
  showDebugRadius?: boolean;
  onToggleDebugRadius?: () => void;
}) {
  if (currentClick) {
    // console.log(`${currentClick.x.toFixed(2)},${currentClick.y.toFixed(2)},${currentClick.z.toFixed(2)}`);
  }

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '14px',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '15px',
      borderRadius: '5px',
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 50
    }}>
      <div>
        <h3 style={{ margin: '0 0 10px 0' }}>遊戲控制</h3>
        <p style={{ margin: '5px 0' }}>WASD / 方向鍵 - 移動</p>
        <p style={{ margin: '5px 0' }}>滑鼠拖曳 - 旋轉視角</p>
        <p style={{ margin: '5px 0' }}>滾輪 - 縮放</p>
        <p style={{ margin: '5px 0' }}>滑鼠右鍵 - 3D 點擊檢測</p>
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <button
          onClick={onToggleCruise}
          style={{
            background: isCruising ? '#ff4444' : '#44ff44',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            width: '100%'
          }}
        >
          {isCruising ? '停止巡航' : '開始巡航'}
        </button>

        {isCruising && (
          <button
            onMouseDown={onBrakeStart}
            onMouseUp={onBrakeEnd}
            onMouseLeave={onBrakeEnd}
            onTouchStart={onBrakeStart}
            onTouchEnd={onBrakeEnd}
            style={{
              background: '#ffa500',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%',
              marginTop: '8px',
              userSelect: 'none'
            }}
          >
            減速 (按住)
          </button>
        )}

        {onToggleDebugRadius && (
          <button
            onClick={onToggleDebugRadius}
            style={{
              background: showDebugRadius ? '#6666ff' : '#666666',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%',
              marginTop: '8px'
            }}
          >
            {showDebugRadius ? '隱藏範圍圈' : '顯示範圍圈'}
          </button>
        )}

        {/* <button
          onClick={() => {
            // Log pedestrian_crossing event distance
            const event = riskEvents.find(e => e.id === 'pedestrian_crossing')
            if (event && event.trigger.position) {
              const distance = Math.sqrt(
                Math.pow(playerPosition.x - event.trigger.position[0], 2) +
                Math.pow(playerPosition.z - event.trigger.position[2], 2)
              )
              console.log(`[DEBUG] 行人穿越事件診斷:`)
              console.log(`  - 玩家位置: [${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)}]`)
              console.log(`  - Trigger 位置: [${event.trigger.position.join(', ')}]`)
              console.log(`  - 距離: ${distance.toFixed(1)}m / ${event.spawnRadius}m`)
              console.log(`  - 已 pre-spawn: ${preSpawnedEventIds.current.has(event.id)}`)
              console.log(`  - 已觸發: ${!!eventManagerRef.current?.getEventContext(event.id)}`)
              console.log(`  - 資源已載入: ${isAssetsLoaded}`)
              alert(`行人事件距離: ${distance.toFixed(1)}m\nspawnRadius: ${event.spawnRadius}m\n已pre-spawn: ${preSpawnedEventIds.current.has(event.id)}\n詳見 Console`)
            }
          }}
          style={{
            background: '#ff6600',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            width: '100%',
            marginTop: '8px',
            fontSize: '12px'
          }}
        >
          診斷行人事件
        </button> */}
      </div>

      <div style={{ marginTop: '5px', paddingTop: '10px', borderTop: '1px solid #666' }}>
        <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold', color: '#44ff44' }}>
          速度: {(currentSpeed * 3.6).toFixed(1)} km/h
        </p>
        <p style={{ margin: '5px 0' }}>
          位置: X: {playerPosition.x.toFixed(2)}, Y: {playerPosition.y.toFixed(2)}, Z: {playerPosition.z.toFixed(2)}
        </p>
        {currentClick && (
          <p style={{ margin: '5px 0' }}>
            當前點擊: X: {currentClick.x.toFixed(2)}, Y: {currentClick.y.toFixed(2)}, Z: {currentClick.z.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 點擊處理器
 */
function ClickHandler({ onClick }: { onClick: (point: THREE.Vector3) => void }) {
  const { camera, gl, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const handleClick = useCallback((event: MouseEvent) => {
    event.preventDefault() // 阻止右鍵菜單

    const canvas = gl.domElement
    const rect = canvas.getBoundingClientRect()

    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouse.current, camera)

    // 創建一個地面平面來檢測點擊
    // const planeGeometry = new THREE.PlaneGeometry(1000, 1000)
    // const planeMaterial = new THREE.MeshBasicMaterial({ visible: false })
    // const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    // plane.rotation.x = -Math.PI / 2 // 水平放置
    // scene.add(plane)
    const target = scene.getObjectByName('Base')

    if (!target) return

    const intersects = raycaster.current.intersectObject(target)

    if (intersects.length > 0) {
      const point = intersects[0].point
      onClick(point)
    }

    // scene.remove(plane)
  }, [camera, gl, scene, onClick])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('contextmenu', handleClick)
    return () => canvas.removeEventListener('contextmenu', handleClick)
  }, [gl, handleClick])

  return null
}

/**
 * 點可視化
 */
function PointVisualization({
  currentClick,
  clickPoints,
  cruisePoints
}: {
  currentClick: THREE.Vector3 | null
  clickPoints: THREE.Vector3[]
  cruisePoints: [number, number, number][]
}) {
  return (
    <group>
      {/* 當前點擊點 - 紅色 */}
      {currentClick && (
        <mesh position={[currentClick.x, currentClick.y, currentClick.z]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {/* 歷史點擊點 - 黃色 */}
      {clickPoints.map((point, index) => (
        <mesh key={`click - ${index} `} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="yellow" />
        </mesh>
      ))}

      {/* 巡航點 - 藍色 */}
      {cruisePoints.map((point, index) => (
        <mesh key={`cruise - ${index} `} position={[point[0], point[1], point[2]]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="blue" />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 3D 危險因子標記（可點擊）
 */
function DangerMarker({
  position,
  onClick
}: {
  position: [number, number, number]
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (!meshRef.current) return
    // Floating animation
    meshRef.current.position.y = position[1] + 3 + Math.sin(state.clock.getElapsedTime() * 3) * 0.3
    meshRef.current.rotation.y += 0.02
  })

  return (
    <mesh
      ref={meshRef}
      position={[position[0], position[1] + 3, position[2]]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial
        color={hovered ? '#ffff00' : '#ff4444'}
        emissive={hovered ? '#ffff00' : '#ff0000'}
        emissiveIntensity={hovered ? 1.5 : 0.8}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

/**
 * 判定結果顯示
 */
function JudgmentDisplay({
  judgment,
  eventName
}: {
  judgment: DangerClickJudgment
  eventName: string
}) {
  const colorMap = {
    [DangerClickJudgment.FAST]: '#44ff44',
    [DangerClickJudgment.SLOW]: '#ffa500',
    [DangerClickJudgment.MISS]: '#ff4444',
    [DangerClickJudgment.WRONG]: '#888888'
  }
  const labelMap = {
    [DangerClickJudgment.FAST]: 'FAST',
    [DangerClickJudgment.SLOW]: 'SLOW',
    [DangerClickJudgment.MISS]: 'MISS',
    [DangerClickJudgment.WRONG]: '誤點'
  }

  return (
    <div style={{
      position: 'absolute',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 100
    }}>
      <div style={{
        fontSize: '64px',
        fontWeight: 'bold',
        fontFamily: 'monospace',
        color: colorMap[judgment],
        textShadow: `0 0 20px ${colorMap[judgment]}, 0 0 40px ${colorMap[judgment]}`,
      }}>
        {labelMap[judgment]}
      </div>
      <div style={{
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
        marginTop: '8px'
      }}>
        {eventName}
      </div>
    </div>
  )
}

/**
 * 結算面板
 */
function ScorePanel({
  scoreHistory,
  missCount,
  maxMissTolerance,
  onRestart
}: {
  scoreHistory: Array<{ eventName: string; judgment: DangerClickJudgment; score: number }>
  missCount: number
  maxMissTolerance: number
  onRestart: () => void
}) {
  const totalScore = scoreHistory.reduce((sum, item) => sum + item.score, 0)
  const maxPossibleScore = scoreHistory.length * 12.5
  const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0

  const fastCount = scoreHistory.filter(s => s.judgment === DangerClickJudgment.FAST).length
  const slowCount = scoreHistory.filter(s => s.judgment === DangerClickJudgment.SLOW).length
  const missCountInHistory = scoreHistory.filter(s => s.judgment === DangerClickJudgment.MISS).length

  // Determine grade based on percentage
  let grade = 'F'
  let gradeColor = '#ff4444'
  if (percentage >= 90) { grade = 'S'; gradeColor = '#ffd700' }
  else if (percentage >= 80) { grade = 'A'; gradeColor = '#44ff44' }
  else if (percentage >= 70) { grade = 'B'; gradeColor = '#88ff88' }
  else if (percentage >= 60) { grade = 'C'; gradeColor = '#ffa500' }
  else if (percentage >= 50) { grade = 'D'; gradeColor = '#ff8844' }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 200
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '40px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 0 40px rgba(0, 100, 255, 0.3)',
        border: '2px solid rgba(100, 150, 255, 0.3)'
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '32px',
          fontFamily: 'monospace',
          color: '#fff',
          marginBottom: '30px',
          textShadow: '0 0 10px rgba(100, 150, 255, 0.5)'
        }}>
          🏁 行程結束
        </h1>

        {/* Grade */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            fontSize: '80px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            color: gradeColor,
            textShadow: `0 0 30px ${gradeColor}`
          }}>
            {grade}
          </div>
          <div style={{
            fontSize: '24px',
            color: '#aaa',
            fontFamily: 'monospace'
          }}>
            {percentage}%
          </div>
        </div>

        {/* Score breakdown */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '18px',
            fontFamily: 'monospace',
            color: '#fff',
            marginBottom: '15px'
          }}>
            <span>總分</span>
            <span style={{ color: '#ffd700' }}>{totalScore.toFixed(1)} 分</span>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#44ff44',
              marginBottom: '8px'
            }}>
              <span>⚡ FAST ({fastCount})</span>
              <span>+{(fastCount * 12.5).toFixed(1)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#ffa500',
              marginBottom: '8px'
            }}>
              <span>🐢 SLOW ({slowCount})</span>
              <span>+{(slowCount * 6.25).toFixed(1)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontFamily: 'monospace',
              color: '#ff4444'
            }}>
              <span>❌ MISS ({missCountInHistory})</span>
              <span>+0</span>
            </div>
          </div>
        </div>

        {/* Miss tolerance warning */}
        {missCount > 0 && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '10px 15px',
            marginBottom: '20px',
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#ff6666',
            textAlign: 'center'
          }}>
            ⚠️ MISS 次數: {missCount} / {maxMissTolerance}
          </div>
        )}

        {/* Restart button */}
        <button
          onClick={onRestart}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#fff',
            background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(74, 144, 217, 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 144, 217, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 144, 217, 0.4)'
          }}
        >
          🔄 重新開始
        </button>
      </div>
    </div>
  )
}

/**
 * 性能顯示
 */
function PerformanceDisplay({ stats }: { stats: PerformanceStats | null }) {
  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 1000,
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '10px',
      borderRadius: '5px',
      pointerEvents: 'none',
      minWidth: '150px'
    }}>
      {stats && (
        <>
          <div>FPS: {stats.fps}</div>
          <div>Frame Time: {stats.frameTime}ms</div>
          <div>Draw Calls: {stats.drawCalls}</div>
          <div>Triangles: {stats.triangles.toLocaleString()}</div>
        </>
      )}
    </div>
  )
}

/**
 * 調試範圍視覺化組件（開發用）
 * 顯示 prepareRadius, triggerRadius, FAST 範圍外圈
 */
function DebugRadiusVisualizer({
  events,
  visible = true
}: {
  events: GameEvent[]
  visible?: boolean
}) {
  if (!visible) return null

  const FAST_OUTER_BUFFER = 5 // Same as in handleScreenClick

  return (
    <group>
      {events.map((event) => {
        if (!event.prepareConfig || !event.trigger.position) return null

        const position = event.trigger.position
        const prepareRadius = event.prepareConfig.radius
        const triggerRadius = event.trigger.radius || 0
        const baseRadius = Math.max(prepareRadius, triggerRadius) // Use the larger radius
        const fastOuterRadius = baseRadius + FAST_OUTER_BUFFER

        return (
          <group key={event.id} position={[position[0], 0.1, position[2]]}>
            {/* FAST range outer circle (yellow) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[fastOuterRadius - 0.2, fastOuterRadius, 64]} />
              <meshBasicMaterial color="#ffff00" transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>

            {/* Prepare radius circle (green) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[prepareRadius - 0.2, prepareRadius, 64]} />
              <meshBasicMaterial color="#00ff00" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>

            {/* Trigger radius circle (red) */}
            {triggerRadius > 0 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[triggerRadius - 0.2, triggerRadius, 64]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Center marker */}
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>

            {/* Event label */}
            {/* Note: For better labels, consider using @react-three/drei's Text component */}
          </group>
        )
      })}
    </group>
  )
}

/**
 * 遊戲說明面板（帶分頁）
 */
function InstructionsPanel({
  onClose,
  showStartButton = false,
  onStart
}: {
  onClose?: () => void
  showStartButton?: boolean
  onStart?: () => void
}) {
  const [activeTab, setActiveTab] = useState(0)

  const tabs = [
    { id: 0, label: '📋 基本說明', icon: '📋' },
    { id: 1, label: '⚠️ 危險因子', icon: '⚠️' },
    { id: 2, label: '💯 計分方式', icon: '💯' }
  ]

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,40,0.95) 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-in'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 60px rgba(74, 144, 217, 0.4)',
        border: '2px solid rgba(100, 150, 255, 0.3)'
      }}>
        {/* 標題 */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{
            textAlign: 'center',
            fontSize: '32px',
            fontFamily: 'monospace',
            color: '#fff',
            margin: '0 0 5px 0',
            textShadow: '0 0 20px rgba(74, 144, 217, 0.8)'
          }}>
            🏍️ 安全駕駛訓練
          </h1>
          <div style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#ffa500',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}>
            每回合 60 秒
          </div>
        </div>

        {/* 分頁標籤 */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: '2px solid rgba(100, 150, 255, 0.2)',
          paddingBottom: '10px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 20px',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: activeTab === tab.id ? '#fff' : '#888',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: activeTab === tab.id ? '2px solid #4a90d9' : '2px solid transparent',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === tab.id ? '0 4px 15px rgba(74, 144, 217, 0.4)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(74, 144, 217, 0.2)'
                  e.currentTarget.style.color = '#4a90d9'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                  e.currentTarget.style.color = '#888'
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 分頁內容（可滾動） */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          fontFamily: 'monospace',
          color: '#fff',
          fontSize: '14px',
          paddingRight: '10px'
        }}>
          {/* Tab 0: 基本說明 */}
          {activeTab === 0 && (
            <div>
              {/* 任務說明 */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                lineHeight: '1.8'
              }}>
                <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
                  📋 任務說明
                </h2>
                <p style={{ margin: '0 0 12px 0' }}>
                  你會在騎乘途中遇到多次<strong style={{ color: '#ff6666' }}>「危險因子」</strong>。
                </p>
                <p style={{ margin: '0' }}>
                  你的任務是：<strong style={{ color: '#44ff44' }}>越早發現、越快點擊。</strong>
                </p>
              </div>

              {/* 操作方式 */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px'
              }}>
                <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
                  🎮 操作方式
                </h2>
                <p style={{ margin: 0, background: 'rgba(68, 255, 68, 0.1)', padding: '10px', borderRadius: '5px', borderLeft: '3px solid #44ff44' }}>
                  看到畫面中的<strong>「潛在危險因子」</strong>，就用<strong>滑鼠點擊</strong>它。
                </p>
              </div>

              {/* 判定標準 */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px'
              }}>
                <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
                  🎯 判定標準
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: 'linear-gradient(90deg, rgba(68, 255, 68, 0.2), transparent)',
                    padding: '10px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #44ff44'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#44ff44', marginBottom: '4px' }}>
                      ⚡ 超強危險因子預判
                    </div>
                    <div style={{ fontSize: '12px', color: '#ddd' }}>
                      主角尚未減速／煞車前就點到 → <strong style={{ color: '#44ff44' }}>12.5 分</strong>
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(90deg, rgba(255, 165, 0, 0.2), transparent)',
                    padding: '10px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #ffa500'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffa500', marginBottom: '4px' }}>
                      🐢 適中危險預判
                    </div>
                    <div style={{ fontSize: '12px', color: '#ddd' }}>
                      畫面已減速／煞車後才點到 → <strong style={{ color: '#ffa500' }}>6.25 分</strong>
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(90deg, rgba(255, 68, 68, 0.2), transparent)',
                    padding: '10px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #ff4444'
                  }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#ff4444', marginBottom: '4px' }}>
                      ❌ 有待加強
                    </div>
                    <div style={{ fontSize: '12px', color: '#ddd' }}>
                      超過最晚點擊時間仍未點到 → <strong style={{ color: '#ff4444' }}>0 分</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 容錯機制 */}
              <div style={{
                background: 'rgba(255, 68, 68, 0.2)',
                borderRadius: '10px',
                padding: '20px',
                border: '2px solid rgba(255, 68, 68, 0.5)'
              }}>
                <h2 style={{ color: '#ff6666', marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
                  ⚠️ 容錯機制
                </h2>
                <p style={{ margin: '0 0 10px 0', lineHeight: '1.6' }}>
                  每回合有 <strong style={{ color: '#ffa500' }}>3 次容錯</strong>（把「不是危險因子」誤點成危險因子也算一次）
                </p>
                <p style={{
                  margin: 0,
                  background: 'rgba(255, 0, 0, 0.3)',
                  padding: '10px',
                  borderRadius: '5px',
                  fontWeight: 'bold',
                  color: '#ff6666',
                  fontSize: '13px'
                }}>
                  ⚠️ 若用完 3 次容錯，第 4 次點錯會<strong>直接結束遊戲</strong>，判定未能完成關卡。
                </p>
              </div>
            </div>
          )}

          {/* Tab 1: 危險因子 */}
          {activeTab === 1 && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              padding: '25px',
              lineHeight: '1.8'
            }}>
              <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
                ⚠️ 什麼算危險因子？
              </h2>

              <p style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#ffa500', fontWeight: 'bold' }}>
                只要接下來幾秒內可能讓你必須立即反應的狀況，都算危險因子：
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{
                  background: 'rgba(255, 165, 0, 0.1)',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #ffa500'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffa500', marginBottom: '8px' }}>
                    🚗 車輛行為
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>車輛突然<strong>逼車</strong>、<strong>切入</strong>你的路線</li>
                    <li>路邊停車突然<strong>開門</strong></li>
                    <li>對向車輛可能<strong>跨線</strong>行駛</li>
                    <li>前方車輛<strong>急煞</strong>或<strong>臨停</strong></li>
                  </ul>
                </div>

                <div style={{
                  background: 'rgba(255, 68, 68, 0.1)',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #ff4444'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4444', marginBottom: '8px' }}>
                    🚶 行人因素
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>行人突然<strong>穿越道路</strong></li>
                    <li>路邊行人可能<strong>闖入</strong>車道</li>
                    <li>人群聚集處的<strong>潛在風險</strong></li>
                  </ul>
                </div>

                <div style={{
                  background: 'rgba(68, 255, 68, 0.1)',
                  padding: '15px',
                  borderRadius: '8px',
                  borderLeft: '4px solid #44ff44'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#44ff44', marginBottom: '8px' }}>
                    ⚡ 需立即反應的狀況
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>必須<strong>急煞</strong>才能避免碰撞</li>
                    <li>必須<strong>急閃</strong>才能避開障礙</li>
                    <li>任何讓你必須<strong>緊急改變路線</strong>的情況</li>
                  </ul>
                </div>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(74, 144, 217, 0.1)',
                borderRadius: '8px',
                border: '2px solid rgba(74, 144, 217, 0.3)'
              }}>
                <div style={{ fontSize: '14px', color: '#4a90d9', fontWeight: 'bold', marginBottom: '8px' }}>
                  💡 判斷原則
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6' }}>
                  如果你看到某個狀況，心裡想「這可能需要我減速或閃避」，那就是危險因子！
                  <strong style={{ color: '#44ff44' }}>寧可提早發現，也不要錯過。</strong>
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: 計分方式 */}
          {activeTab === 2 && (
            <div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '25px',
                marginBottom: '15px'
              }}>
                <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
                  💯 計分方式
                </h2>

                <div style={{
                  background: 'rgba(255, 215, 0, 0.1)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #ffd700',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffd700' }}>
                    總分：100 分
                  </div>
                  <div style={{ fontSize: '12px', color: '#ddd', marginTop: '5px' }}>
                    依反應速度和準確度計算
                  </div>
                </div>

                <h3 style={{ color: '#4a90d9', fontSize: '16px', marginBottom: '12px' }}>
                  每個危險因子計分：
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    background: 'linear-gradient(90deg, rgba(68, 255, 68, 0.2), transparent)',
                    padding: '15px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #44ff44',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#44ff44' }}>
                        ⚡ 越早發現（減速前）
                      </div>
                      <div style={{ fontSize: '12px', color: '#ddd', marginTop: '4px' }}>
                        在主角減速／煞車前就點擊
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#44ff44' }}>
                      12.5
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(90deg, rgba(255, 165, 0, 0.2), transparent)',
                    padding: '15px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #ffa500',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffa500' }}>
                        🐢 適中反應（減速後）
                      </div>
                      <div style={{ fontSize: '12px', color: '#ddd', marginTop: '4px' }}>
                        在主角減速／煞車後才點擊
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffa500' }}>
                      6.25
                    </div>
                  </div>

                  <div style={{
                    background: 'linear-gradient(90deg, rgba(255, 68, 68, 0.2), transparent)',
                    padding: '15px',
                    borderRadius: '8px',
                    borderLeft: '4px solid #ff4444',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff4444' }}>
                        ❌ 完全沒發現
                      </div>
                      <div style={{ fontSize: '12px', color: '#ddd', marginTop: '4px' }}>
                        超過最晚時間仍未點擊
                      </div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4444' }}>
                      0
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(74, 144, 217, 0.1)',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '2px solid rgba(74, 144, 217, 0.3)'
                }}>
                  <div style={{ fontSize: '14px', color: '#4a90d9', fontWeight: 'bold', marginBottom: '8px' }}>
                    📊 評分標準
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                    <li><strong style={{ color: '#ffd700' }}>S 級</strong> (90-100 分)：超強危險預判能力</li>
                    <li><strong style={{ color: '#44ff44' }}>A 級</strong> (80-89 分)：優秀的反應速度</li>
                    <li><strong style={{ color: '#88ff88' }}>B 級</strong> (70-79 分)：良好的觀察力</li>
                    <li><strong style={{ color: '#ffa500' }}>C 級</strong> (60-69 分)：需要加強</li>
                    <li><strong style={{ color: '#ff4444' }}>D 級</strong> (50-59 分)：有待改進</li>
                    <li><strong style={{ color: '#ff4444' }}>F 級</strong> (&lt;50 分)：建議重新訓練</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '15px',
                fontSize: '16px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              關閉說明
            </button>
          )}

          {showStartButton && onStart && (
            <button
              onClick={onStart}
              style={{
                flex: 2,
                padding: '15px',
                fontSize: '20px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#fff',
                background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(74, 144, 217, 0.5)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(74, 144, 217, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 144, 217, 0.5)'
              }}
            >
              🚀 開始訓練
            </button>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  )
}

/**
 * 遊戲開始畫面（使用 InstructionsPanel）
 */
function StartScreen({ onStart }: { onStart: () => void }) {
  return <InstructionsPanel showStartButton onStart={onStart} />
}
