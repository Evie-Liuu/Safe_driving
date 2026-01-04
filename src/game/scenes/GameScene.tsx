import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Environment } from '../components/Environment'
import { PlayerController } from '../components/PlayerController'
import { PerformanceMonitor } from '../optimization/PerformanceMonitor'

/**
 * 主遊戲場景
 * 這是一個範例場景，展示如何使用各種系統
 */
export function GameScene() {
  const [playerPosition, setPlayerPosition] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0)
  )

  const handlePlayerMove = useCallback((position: THREE.Vector3) => {
    setPlayerPosition(position)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* 性能顯示 */}
      <PerformanceDisplay />

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
          speed={10}
          rotationSpeed={3}
          onPositionChange={handlePlayerMove}
        >
          {/* 玩家模型（暫時用簡單的立方體代替） */}
          <mesh castShadow>
            <boxGeometry args={[1, 1, 2]} />
            <meshStandardMaterial color="#ff6347" />
          </mesh>
        </PlayerController>

        {/* 一些裝飾物 */}
        <DemoObjects />

        {/* 軌道控制器（開發用，實際遊戲中可能不需要） */}
        <OrbitControls enableDamping />

        {/* 性能監控 */}
        <PerformanceMonitor enabled={true} />
      </Canvas>

      {/* UI 疊加層 */}
      <UIOverlay playerPosition={playerPosition} />
    </div>
  )
}

/**
 * 演示物件
 */
function DemoObjects() {
  return (
    <group>
      {/* 創建一些隨機的立方體作為場景物件 */}
      {Array.from({ length: 20 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.random() * 40 - 20,
            0.5,
            Math.random() * 40 - 20
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={`hsl(${Math.random() * 360}, 70%, 50%)`} />
        </mesh>
      ))}

      {/* 一些樹木（用圓柱和球體模擬） */}
      {Array.from({ length: 10 }, (_, i) => (
        <group
          key={`tree-${i}`}
          position={[
            Math.random() * 60 - 30,
            0,
            Math.random() * 60 - 30
          ]}
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
function UIOverlay({ playerPosition }: { playerPosition: THREE.Vector3 }) {
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
      pointerEvents: 'none'
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>遊戲控制</h3>
      <p style={{ margin: '5px 0' }}>WASD / 方向鍵 - 移動</p>
      <p style={{ margin: '5px 0' }}>滑鼠拖曳 - 旋轉視角</p>
      <p style={{ margin: '5px 0' }}>滾輪 - 縮放</p>
      <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #666' }}>
        <p style={{ margin: '5px 0' }}>
          位置: X: {playerPosition.x.toFixed(2)}, Y: {playerPosition.y.toFixed(2)}, Z: {playerPosition.z.toFixed(2)}
        </p>
      </div>
    </div>
  )
}

/**
 * 性能顯示
 */
function PerformanceDisplay() {
  const [stats, setStats] = useState<any>(null)

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      right: 20,
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
