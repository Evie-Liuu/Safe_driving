

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
  } | null>(null)
  const dangerEnteredTimeRef = useRef<number>(0)
  const brakingStartTimeRef = useRef<number>(0)
  const dangerClickedRef = useRef(false)
  // Stop action tracking
  const stopStartTimeRef = useRef<number>(0)
  const stopCompletedEventsRef = useRef<Set<string>>(new Set())
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

  const handleStatsUpdate = useCallback((newStats: PerformanceStats) => {
    setStats(newStats)
  }, [])

  const handlePlayerMove = useCallback((position: THREE.Vector3) => {
    setPlayerPosition(position)
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
      if (!activeDanger || activeDanger.eventId !== instruction.eventId) {
        dangerEnteredTimeRef.current = performance.now()
        brakingStartTimeRef.current = 0
        stopStartTimeRef.current = 0
        dangerClickedRef.current = false
        setActiveDanger({
          eventId: instruction.eventId,
          eventName: instruction.eventName,
          triggerPosition: instruction.triggerPosition,
          clickDeadline: instruction.clickDeadline
        })
      }

      // Track when braking starts
      if (instruction.shouldBrake && brakingStartTimeRef.current === 0) {
        brakingStartTimeRef.current = performance.now()
      }

      // Player entered trigger radius — clear danger marker (event was triggered successfully)
      if (instruction.status === PrepareZoneStatus.INSIDE_TRIGGER && activeDanger && !dangerClickedRef.current) {
        // Event activated = player acknowledged the danger by approaching, not a miss
        setActiveDanger(null)
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

  // Handle screen click for danger identification
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

      const clickTime = performance.now()
      const brakingStart = brakingStartTimeRef.current

      // Determine judgment: clicked before braking = Fast, after = Slow
      let judgment: DangerClickJudgment
      if (brakingStart === 0 || clickTime < brakingStart) {
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
      setIsAssetsLoaded(true)
    }

    preloadAllAssets()
  }, [])

  // Callback for when an actor is ready (model + animations loaded)
  const handleActorReady = useCallback((actorId: string) => {
    readyActorsRef.current.add(actorId)
    console.log(`[GameScene] 🎭 Actor ready: ${actorId}, total ready: ${readyActorsRef.current.size}`)
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
            // Check if player missed clicking this danger event
            if (event.prepareConfig && !clickedEventIds.current.has(eventId)) {
              console.log(`[GameScene] ❌ Event ${eventId} completed without player click - MISS`)
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
    if (!isAssetsLoaded) return

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
  }, [playerPosition, isAssetsLoaded])

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
          enableCameraFollow={false}
          isCruising={isCruising && !gameEnded}
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
            enableDebug={true}
          />
        ))}

        {/* 場景紅綠燈 */}
        <TrafficLight
          id="traffic_light_intersection_01"
          position={[14, 0, -95]}
          rotation={[0, -Math.PI / 2, 0]}
          initialState="off"
        />

        {/* 一些裝飾物 */}
        {/* <DemoObjects /> */}

        {/* 行走的路人 */}
        <MaleCharacter position={[5, 0, 5]} rotation={[0, 0, 0]} />

        {/* 對向車輛 */}
        {oncomingVehicles.map(vehicle => (
          <OncomingVehicle
            key={vehicle.id}
            startPosition={vehicle.startPosition}
            endPosition={vehicle.endPosition}
            speed={20}
            onComplete={() => {
              setOncomingVehicles(prev => prev.filter(v => v.id !== vehicle.id))
            }}
          />
        ))}

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

        {/* 軌道控制器（開發用，實際遊戲中可能不需要） */}
        <OrbitControls enableDamping target={[playerPosition.x, playerPosition.y, playerPosition.z]} />
      </Canvas>

      {/* 全螢幕點擊區域 - 用於辨識危險 */}
      {/* <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isClickDisabled ? 'not-allowed' : 'pointer',
          zIndex: 10
        }}
        onClick={handleScreenClick}
      /> */}

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
  onBrakeEnd
}: {
  playerPosition: THREE.Vector3;
  currentClick: THREE.Vector3 | null;
  currentSpeed: number;
  isCruising: boolean;
  onToggleCruise: () => void;
  onBrakeStart?: () => void;
  onBrakeEnd?: () => void;
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
              userSelect: 'none'
            }}
          >
            減速 (按住)
          </button>
        )}
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
