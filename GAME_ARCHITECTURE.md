# React Three Fiber 遊戲架構文檔

## 目錄結構

```
src/game/
├── components/          # 遊戲組件
│   ├── PlayerController.tsx   # 玩家控制器
│   └── Environment.tsx        # 環境設置（光照、天空、地面）
├── models/              # 模型系統
│   ├── ModelLoader.tsx        # 模型加載器
│   └── ModelManager.ts        # 模型管理器（快取、實例化）
├── animations/          # 動畫系統
│   ├── AnimationController.ts # 動畫控制器
│   └── AnimatedModel.tsx      # 帶動畫的模型組件
├── optimization/        # 性能優化
│   ├── LODSystem.tsx          # LOD（細節層級）系統
│   ├── ChunkLoader.tsx        # 分塊加載系統
│   └── PerformanceMonitor.tsx # 性能監控
├── utils/               # 工具函數
│   └── GameUtils.ts           # 遊戲工具函數
├── scenes/              # 場景
│   ├── GameScene.tsx          # 主遊戲場景
│   └── ExampleScene.tsx       # 範例場景
└── index.ts             # 模組匯出入口
```

## 核心系統說明

### 1. 模型加載系統

#### ModelLoader
基礎模型加載組件，支援 GLTF/GLB 格式。

```tsx
import { ModelLoader } from '@/game/models/ModelLoader'

<ModelLoader
  url="/models/car.glb"
  position={[0, 0, 0]}
  rotation={[0, Math.PI / 2, 0]}
  scale={[1, 1, 1]}
  onLoad={(gltf) => console.log('模型已加載', gltf)}
/>
```

#### ModelManager
模型管理器，負責模型的快取和實例化。

```ts
import { modelManager } from '@/game/models/ModelManager'

// 創建模型實例
const instance = await modelManager.createInstance('/models/tree.glb')
scene.add(instance)

// 獲取統計信息
const stats = modelManager.getStats()
console.log(`快取大小: ${stats.cacheSize}, 實例數: ${stats.totalInstances}`)
```

### 2. 動畫系統（支援骨架與動畫分離）

#### AnimationController
核心動畫控制器，支援：
- 從模型加載動畫
- 從外部檔案加載動畫（動畫分離）
- 動畫混合
- 動畫重定向

```ts
import { AnimationController } from '@/game/animations/AnimationController'

const controller = new AnimationController(model)

// 加載模型自帶的動畫
controller.loadAnimationsFromGLTF(gltf)

// 加載外部動畫檔案（動畫分離）
controller.loadSeparateAnimations(animationGltf, targetModel)

// 播放動畫
controller.play('walk', {
  loop: THREE.LoopRepeat,
  timeScale: 1.0
})

// 混合動畫
controller.blend('walk', 'run', 0.5) // 50% walk + 50% run
```

#### AnimatedModel
帶動畫的模型組件。

```tsx
import { AnimatedModel } from '@/game/animations/AnimatedModel'

<AnimatedModel
  modelUrl="/models/character.glb"
  animationUrls={[
    "/models/animations/walk.glb",
    "/models/animations/run.glb"
  ]}
  position={[0, 0, 0]}
  autoPlay="idle"
  onLoad={(controller) => {
    // 獲取所有可用動畫
    const animations = controller.getAnimationNames()
    console.log('可用動畫:', animations)
  }}
/>
```

### 3. 場域優化系統

#### LOD System（細節層級）
根據相機距離自動切換不同細節級別的模型。

```tsx
import { LODSystem } from '@/game/optimization/LODSystem'

<LODSystem
  position={[10, 0, 0]}
  levels={[
    { distance: 10, model: <HighDetailModel /> },
    { distance: 30, model: <MediumDetailModel /> },
    { distance: 100, model: <LowDetailModel /> }
  ]}
  hysteresis={0.1}
/>
```

#### ChunkLoader（分塊加載）
只加載視距範圍內的場景分塊，優化大場域性能。

```tsx
import { ChunkLoader, useGridChunks } from '@/game/optimization/ChunkLoader'

function MyScene() {
  const chunks = useGridChunks(20, 50, (x, z) => (
    <TerrainChunk x={x} z={z} />
  ))

  return (
    <ChunkLoader
      chunkSize={50}
      viewDistance={150}
      chunks={chunks}
      centerPosition={playerPosition}
    />
  )
}
```

#### PerformanceMonitor（性能監控）
實時監控 FPS、繪製調用、三角形數量等性能指標。

```tsx
import { PerformanceMonitor } from '@/game/optimization/PerformanceMonitor'

<PerformanceMonitor
  enabled={true}
  updateInterval={1}
  onStats={(stats) => {
    console.log(`FPS: ${stats.fps}, Draw Calls: ${stats.drawCalls}`)
  }}
/>
```

### 4. 遊戲組件

#### PlayerController
玩家控制器，支援鍵盤操作（WASD/方向鍵）。

```tsx
import { PlayerController } from '@/game/components/PlayerController'

<PlayerController
  position={[0, 0, 0]}
  speed={10}
  rotationSpeed={3}
  onPositionChange={(pos) => console.log('玩家位置:', pos)}
>
  <YourPlayerModel />
</PlayerController>
```

#### Environment
環境設置組件，包含天空、地面、霧效果、光照等。

```tsx
import { Environment } from '@/game/components/Environment'

<Environment
  skyColor="#87CEEB"
  groundColor="#228B22"
  fogColor="#87CEEB"
  fogNear={50}
  fogFar={200}
/>
```

### 5. 工具函數

```ts
import {
  distance,
  lerp,
  clamp,
  randomRange,
  sphereCollision,
  Timer,
  EventEmitter
} from '@/game/utils/GameUtils'

// 距離計算
const dist = distance(posA, posB)

// 線性插值
const value = lerp(0, 100, 0.5) // 50

// 限制範圍
const clamped = clamp(150, 0, 100) // 100

// 碰撞檢測
if (sphereCollision(posA, radiusA, posB, radiusB)) {
  console.log('碰撞!')
}

// 計時器
const timer = new Timer()
timer.start()
console.log(timer.getElapsedTime())

// 事件系統
const events = new EventEmitter()
events.on('jump', () => console.log('跳躍!'))
events.emit('jump')
```

## 使用範例

### 完整場景範例

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  Environment,
  PlayerController,
  AnimatedModel,
  ChunkLoader,
  PerformanceMonitor
} from '@/game'

function MyGame() {
  return (
    <Canvas shadows>
      {/* 環境設置 */}
      <Environment />

      {/* 玩家 */}
      <PlayerController>
        <AnimatedModel
          modelUrl="/models/player.glb"
          animationUrls={["/models/animations.glb"]}
          autoPlay="idle"
        />
      </PlayerController>

      {/* 場景分塊加載 */}
      <ChunkLoader
        chunkSize={50}
        viewDistance={150}
        chunks={myChunks}
      />

      {/* 性能監控 */}
      <PerformanceMonitor />

      {/* 相機控制 */}
      <OrbitControls />
    </Canvas>
  )
}
```

## 性能優化建議

1. **使用 LOD 系統**：對於遠處的物體使用低細節模型
2. **啟用分塊加載**：大場域必須使用分塊系統
3. **模型優化**：
   - 減少三角形數量
   - 使用貼圖圖集
   - 壓縮貼圖大小
4. **陰影優化**：
   - 限制投射陰影的物體數量
   - 調整陰影貼圖分辨率
5. **使用 Instancing**：對於重複的物體（如樹木、石頭）
6. **監控性能**：使用 PerformanceMonitor 實時監控

## 模型準備建議

### 骨架動畫分離工作流程

1. **模型檔案** (`character.glb`)
   - 包含網格（Mesh）
   - 包含骨架（Skeleton）
   - 可包含基礎動畫（如 T-Pose）

2. **動畫檔案** (`walk.glb`, `run.glb`, ...)
   - 只包含動畫數據
   - 骨架名稱必須與模型一致
   - 可以來自不同的檔案

3. **使用方式**
```tsx
<AnimatedModel
  modelUrl="/character.glb"
  animationUrls={[
    "/animations/walk.glb",
    "/animations/run.glb",
    "/animations/jump.glb"
  ]}
/>
```

## 常見問題

### Q: 如何處理大量重複物件（如樹木）？
A: 使用 THREE.InstancedMesh 或 ModelManager 的實例化功能。

### Q: 動畫播放不流暢？
A: 檢查 FPS，可能需要降低模型複雜度或啟用 LOD。

### Q: 記憶體佔用過高？
A: 使用 ModelManager 清理未使用的模型，啟用分塊加載。

### Q: 如何調試性能問題？
A: 使用 PerformanceMonitor 查看即時統計，根據建議優化。

## 進階主題

### 自定義 LOD 策略
### 動畫狀態機
### 物理引擎整合
### 多人遊戲同步
### 存檔系統

詳見各模組的詳細文檔。
