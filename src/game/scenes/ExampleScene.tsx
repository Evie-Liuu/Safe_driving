import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment as DreiEnvironment } from '@react-three/drei'
import { AnimatedModel } from '../animations/AnimatedModel'
import { LODSystem } from '../optimization/LODSystem'
import { ChunkLoader, useGridChunks } from '../optimization/ChunkLoader'
import { BasicLighting } from '../components/Environment'

/**
 * 進階範例場景
 * 展示 LOD、分塊加載、動畫等功能
 */
export function ExampleScene() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 10, 30]} />

        {/* 基礎光照 */}
        <BasicLighting />

        {/* 使用 Drei 的環境貼圖 */}
        <DreiEnvironment preset="sunset" />

        {/* Suspense 用於處理異步加載 */}
        <Suspense fallback={<LoadingPlaceholder />}>
          {/* LOD 範例 */}
          <LODExample />

          {/* 分塊加載範例 */}
          <ChunkLoadingExample />

          {/* 動畫模型範例（需要實際的模型檔案） */}
          {/* <AnimatedModelExample /> */}
        </Suspense>

        {/* 地面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#556B2F" />
        </mesh>

        <OrbitControls enableDamping />
        <gridHelper args={[200, 20]} />
      </Canvas>

      <InfoPanel />
    </div>
  )
}

/**
 * LOD 範例
 */
function LODExample() {
  // 定義不同細節級別的模型
  const highDetail = (
    <mesh castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#ff6347" wireframe={false} />
    </mesh>
  )

  const mediumDetail = (
    <mesh castShadow>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#ff7f50" wireframe={false} />
    </mesh>
  )

  const lowDetail = (
    <mesh castShadow>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#ffa07a" wireframe={false} />
    </mesh>
  )

  return (
    <LODSystem
      position={[10, 1, 0]}
      levels={[
        { distance: 15, model: highDetail },
        { distance: 30, model: mediumDetail },
        { distance: 100, model: lowDetail }
      ]}
    />
  )
}

/**
 * 分塊加載範例
 */
function ChunkLoadingExample() {
  // 生成 10x10 的分塊網格
  const chunks = useGridChunks(10, 10, (x, z) => (
    <group>
      {/* 每個分塊中的內容 */}
      <mesh position={[5, 0.25, 5]} castShadow>
        <boxGeometry args={[1, 0.5, 1]} />
        <meshStandardMaterial color={`hsl(${(x * 36 + z * 36) % 360}, 70%, 50%)`} />
      </mesh>
    </group>
  ))

  return (
    <ChunkLoader
      chunkSize={10}
      viewDistance={50}
      chunks={chunks}
      centerPosition={[0, 0, 0]}
    />
  )
}

/**
 * 動畫模型範例（需要實際的 GLTF 模型）
 */
function AnimatedModelExample() {
  return (
    <AnimatedModel
      modelUrl="/models/character.glb"  // 替換為實際模型路徑
      animationUrls={[
        "/models/walk.glb",    // 走路動畫
        "/models/run.glb"      // 跑步動畫
      ]}
      position={[0, 0, 0]}
      autoPlay="idle"
      onLoad={(controller) => {
        console.log('可用動畫:', controller.getAnimationNames())
      }}
    />
  )
}

/**
 * 加載中佔位符
 */
function LoadingPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#cccccc" wireframe />
    </mesh>
  )
}

/**
 * 信息面板
 */
function InfoPanel() {
  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '15px',
      borderRadius: '5px',
      maxWidth: '400px'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>範例場景說明</h3>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li>紅色球體展示 LOD 系統（靠近時細節增加）</li>
        <li>彩色方塊展示分塊加載系統</li>
        <li>滾動滾輪縮放，拖曳旋轉視角</li>
      </ul>
    </div>
  )
}
