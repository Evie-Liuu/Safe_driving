# React Three Fiber 遊戲架構 - 快速開始

## 安裝與啟動

### 1. 安裝依賴（已完成）
```bash
npm install
```

已安裝的套件：
- `three` - Three.js 核心庫
- `@react-three/fiber` - React Three Fiber
- `@react-three/drei` - 輔助工具集
- `@types/three` - TypeScript 類型定義

### 2. 啟動開發伺服器
```bash
npm run dev
```

訪問 `http://localhost:5173` 即可查看遊戲場景。

## 架構概覽

專案提供了完整的 3D 遊戲開發架構，包含以下核心系統：

### 📦 模型加載系統
- 支援 GLTF/GLB 格式
- 智能快取管理
- 實例化支援

### 🎬 動畫系統
- **支援骨架與動畫分離**
- 動畫混合
- 動畫重定向
- 完整的動畫控制

### ⚡ 性能優化系統
- **LOD（細節層級）系統**
- **分塊加載系統**
- 性能監控
- 自動品質調整

### 🎮 遊戲組件
- 玩家控制器
- 環境系統
- 光照系統

### 🛠️ 工具函數
- 數學工具
- 碰撞檢測
- 計時器
- 事件系統

## 場景說明

### 遊戲場景（預設）
- 展示基本的玩家控制
- WASD/方向鍵移動
- 滑鼠操作相機
- 包含環境和裝飾物件

### 範例場景
- LOD 系統演示
- 分塊加載演示
- 性能優化展示

## 快速使用範例

### 1. 載入簡單模型
```tsx
import { ModelLoader } from './game/models/ModelLoader'

<ModelLoader
  url="/models/your-model.glb"
  position={[0, 0, 0]}
  scale={[1, 1, 1]}
/>
```

### 2. 載入帶動畫的模型
```tsx
import { AnimatedModel } from './game/animations/AnimatedModel'

<AnimatedModel
  modelUrl="/models/character.glb"
  position={[0, 0, 0]}
  autoPlay="idle"
  onLoad={(controller) => {
    console.log('可用動畫:', controller.getAnimationNames())
  }}
/>
```

### 3. 載入骨架與動畫分離的模型
```tsx
<AnimatedModel
  modelUrl="/models/character.glb"
  animationUrls={[
    "/models/animations/walk.glb",
    "/models/animations/run.glb",
    "/models/animations/jump.glb"
  ]}
  position={[0, 0, 0]}
  autoPlay="idle"
  onLoad={(controller) => {
    // 切換動畫
    controller.play('walk')

    // 混合動畫（50% walk + 50% run）
    controller.blend('walk', 'run', 0.5)
  }}
/>
```

### 4. 使用 LOD 優化性能
```tsx
import { LODSystem } from './game/optimization/LODSystem'

<LODSystem
  position={[10, 0, 0]}
  levels={[
    { distance: 10, model: <HighDetailModel /> },
    { distance: 30, model: <MediumDetailModel /> },
    { distance: 100, model: <LowDetailModel /> }
  ]}
/>
```

### 5. 大場域分塊加載
```tsx
import { ChunkLoader, useGridChunks } from './game/optimization/ChunkLoader'

function MyWorld() {
  // 生成 20x20 的網格地形
  const chunks = useGridChunks(20, 50, (x, z) => (
    <TerrainChunk gridX={x} gridZ={z} />
  ))

  return (
    <ChunkLoader
      chunkSize={50}
      viewDistance={150}
      chunks={chunks}
      centerPosition={[0, 0, 0]}
    />
  )
}
```

## 專案結構

```
src/game/
├── components/       # 遊戲組件（玩家、環境等）
├── models/          # 模型加載和管理
├── animations/      # 動畫系統
├── optimization/    # 性能優化（LOD、分塊加載、監控）
├── utils/           # 工具函數
├── scenes/          # 場景
└── index.ts         # 模組匯出
```

## 模型準備建議

### 推薦格式
- GLTF 2.0 / GLB
- 材質使用 PBR（Physically Based Rendering）
- 貼圖大小：512x512 或 1024x1024

### 骨架動畫分離工作流程

1. **準備模型檔案** (`character.glb`)
   - 包含網格（Mesh）
   - 包含骨架（Skeleton/Armature）
   - 可包含預設姿勢

2. **準備動畫檔案** (`walk.glb`, `run.glb`)
   - 每個檔案包含一個或多個動畫剪輯
   - **重要：骨骼名稱必須與模型骨架一致**
   - 可以從不同軟體或來源導出

3. **在程式中使用**
   ```tsx
   <AnimatedModel
     modelUrl="/character.glb"
     animationUrls={[
       "/walk.glb",
       "/run.glb"
     ]}
   />
   ```

### Blender 匯出建議
1. 選擇 GLTF 2.0 (.glb) 格式
2. 勾選以下選項：
   - ✅ Include: Selected Objects（如果只匯出部分）
   - ✅ Transform: +Y Up
   - ✅ Geometry: Apply Modifiers
   - ✅ Geometry: UVs
   - ✅ Geometry: Normals
   - ✅ Animation: Use Current Frame（模型檔案）
   - ✅ Animation: Export Animations（動畫檔案）
   - ✅ Skinning: Include（如果有骨架）

## 性能優化建議

### 大場域（> 1000 物件）
1. ✅ 使用分塊加載系統
2. ✅ 啟用 LOD 系統
3. ✅ 限制視距範圍
4. ✅ 使用性能監控

### 模型優化
1. 減少三角形數量（LOD 或簡化）
2. 合併材質（使用材質圖集）
3. 壓縮貼圖
4. 使用 Instancing（重複物件）

### 陰影優化
1. 限制投射陰影的物件
2. 降低陰影貼圖分辨率
3. 調整陰影範圍

## 常用命令

```bash
# 開發模式
npm run dev

# 建置生產版本
npm run build

# 預覽生產版本
npm run preview

# 程式碼檢查
npm run lint
```

## 下一步

1. 📖 閱讀 [完整架構文檔](./GAME_ARCHITECTURE.md)
2. 🎮 修改 `src/game/scenes/GameScene.tsx` 建立你的遊戲
3. 📦 將你的 3D 模型放到 `public/models/` 目錄
4. 🎨 自定義環境、光照和場景設置

## 除錯技巧

### 查看性能統計
在場景中已包含性能監控器，右上角會顯示：
- FPS（每秒幀數）
- Frame Time（幀時間）
- Draw Calls（繪製調用）
- Triangles（三角形數量）

### Three.js 開發者工具
推薦安裝 Chrome 擴充功能：
- [Three.js DevTools](https://chrome.google.com/webstore/detail/threejs-developer-tools/)

### 常見問題

**Q: 模型顯示全黑？**
A: 檢查是否有光照，或材質是否正確。

**Q: 動畫不播放？**
A: 確認模型包含動畫，並且骨骼名稱匹配。

**Q: FPS 太低？**
A: 啟用 LOD 系統，減少物件數量，或降低模型複雜度。

**Q: 分塊加載不工作？**
A: 確認 `centerPosition` 參數正確更新（通常是玩家位置）。

## 支援與反饋

如有問題或建議，請查閱完整文檔或聯繫開發團隊。

---

Happy Coding! 🎮✨
