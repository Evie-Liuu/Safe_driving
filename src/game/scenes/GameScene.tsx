
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Environment } from '../components/Environment'
import { PlayerController } from '../components/PlayerController'
import { PerformanceMonitor, PerformanceStats } from '../optimization/PerformanceMonitor'
import { ModelLoader } from '../models/ModelLoader'
import { points as cruisePoints } from '@/game/data/cruisePoints'

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

        {/* 玩家控制器 */}
        <PlayerController
          position={[0, 0, 0]}
          speed={16.67}
          rotationSpeed={3}
          onPositionChange={handlePlayerMove}
          onSpeedChange={handleSpeedChange}
          enableCameraFollow={true}
          isCruising={isCruising}
          isBraking={isBraking}
          cruisePoints={cruisePoints}
        >
          {/* 玩家模型 */}
          <ModelLoader url="/src/assets/models/ferrari.glb" rotation={[0, Math.PI, 0]} />
        </PlayerController>

        {/* 一些裝飾物 */}
        <DemoObjects />

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

        {/* 性能監控 */}
        {/* <PerformanceMonitor enabled={true} onStats={handleStatsUpdate} /> */}
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
