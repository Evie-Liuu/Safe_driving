

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
import { PlayerState, ActionType, ScriptAction, PrepareInstruction, DangerClickJudgment, PrepareZoneStatus } from '../events/EventTypes'
import { AnimationManager } from '../animations/AnimationManager'
import { getSharedLoader } from '../utils/SharedLoader'

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
  const [judgmentResult, setJudgmentResult] = useState<{
    judgment: DangerClickJudgment
    eventName: string
  } | null>(null)
  const judgmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track loading state for animations and models
  const [isAssetsLoaded, setIsAssetsLoaded] = useState(false)
  const readyActorsRef = useRef<Set<string>>(new Set())

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

  const handlePrepareInstruction = useCallback((instruction: PrepareInstruction | null) => {
    if (instruction) {
      // Track when we first enter prepare zone for this event
      if (!activeDanger || activeDanger.eventId !== instruction.eventId) {
        dangerEnteredTimeRef.current = performance.now()
        brakingStartTimeRef.current = 0
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

      // Player entered trigger radius — hide marker but don't judge as miss
      if (instruction.status === PrepareZoneStatus.INSIDE_TRIGGER && activeDanger && !dangerClickedRef.current) {
        setActiveDanger(null)
      }

      setAutoBraking(instruction.shouldBrake)
      setAutoLaneOffset(instruction.laneOffset)
      setAutoSpeedFactor(instruction.targetSpeedFactor)
    } else {
      // instruction is null → player is outside all prepare zones (too far / passed)
      if (activeDanger && !dangerClickedRef.current) {
        const name = activeDanger.eventName
        setJudgmentResult({ judgment: DangerClickJudgment.MISS, eventName: name })
        setActiveDanger(null)
        if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current)
        judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 2000)
      }

      setAutoBraking(false)
      setAutoLaneOffset(0)
      setAutoSpeedFactor(0)
    }
  }, [activeDanger])

  const handleDangerClick = useCallback(() => {
    if (!activeDanger || dangerClickedRef.current) return
    dangerClickedRef.current = true

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
    setActiveDanger(null)

    // Clear judgment display after 2s
    if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current)
    judgmentTimerRef.current = setTimeout(() => setJudgmentResult(null), 2000)
  }, [activeDanger])

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
            // Create actor refs
            const actorData = event.actors.map(actor => {
              const actorRef = React.createRef<EventActorHandle>()
              actorRefsMap.current.set(actor.id, actorRef)
              return { ...actor, ref: actorRef, eventId }
            })
            setActiveEventActors(prev => [...prev, ...actorData])

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
            // Remove actor refs and ready status
            event.actors.forEach(actor => {
              actorRefsMap.current.delete(actor.id)
              readyActorsRef.current.delete(actor.id)
            })
            // Remove actors from scene
            setActiveEventActors(prev =>
              prev.filter(a => !event.actors.find(ea => ea.id === a.id))
            )
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
          position={[0, 0, 0]}
          speed={16.67}
          rotationSpeed={3}
          onPositionChange={handlePlayerMove}
          onSpeedChange={handleSpeedChange}
          onTriggerOncomingVehicle={handleTriggerOncomingVehicle}
          enableCameraFollow={true}
          isCruising={isCruising}
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

        {/* 一些裝飾物 */}
        <DemoObjects />

        {/* 行走的路人 */}
        <MaleCharacter position={[5, 0, 5]} rotation={[0, Math.PI / 4, 0]} />

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
      {judgmentResult && (
        <JudgmentDisplay
          judgment={judgmentResult.judgment}
          eventName={judgmentResult.eventName}
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
    console.log(`${currentClick.x.toFixed(2)},${currentClick.y.toFixed(2)},${currentClick.z.toFixed(2)}`);
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
      gap: '10px'
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
    const target = scene.children.find(
      (child) => child.name === 'ground'
    )

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
    [DangerClickJudgment.MISS]: '#ff4444'
  }
  const labelMap = {
    [DangerClickJudgment.FAST]: 'FAST',
    [DangerClickJudgment.SLOW]: 'SLOW',
    [DangerClickJudgment.MISS]: 'MISS'
  }

  return (
    <div style={{
      position: 'absolute',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      pointerEvents: 'none'
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
