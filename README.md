# Safe Driving - React Three Fiber 遊戲架構

這是一個完整的 React Three Fiber 3D 遊戲開發架構，專為大場域遊戲設計，支援進階功能如骨架動畫分離、LOD 系統、分塊加載等。

## ✨ 特色功能

### 🎮 核心系統
- ✅ **模型加載系統** - 支援 GLTF/GLB，智能快取管理
- ✅ **骨架動畫系統** - 支援骨架與動畫檔案分離
- ✅ **LOD 系統** - 根據距離自動切換模型細節
- ✅ **分塊加載** - 大場域優化，只加載視距範圍內的內容
- ✅ **性能監控** - 即時 FPS、繪製統計、記憶體監控
- ✅ **玩家控制** - WASD/方向鍵移動控制
- ✅ **完整環境系統** - 光照、霧效果、天空盒

### 🛠️ 開發工具
- 碰撞檢測
- 數學工具函數
- 事件系統
- 計時器
- 射線檢測

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 啟動開發伺服器
```bash
npm run dev
```

訪問 http://localhost:5173

### 3. 建置生產版本
```bash
npm run build
```

## 📁 專案結構

```
src/game/
├── animations/          # 動畫系統
│   ├── AnimationController.ts    # 動畫控制器
│   └── AnimatedModel.tsx          # 帶動畫的模型組件
├── components/          # 遊戲組件
│   ├── PlayerController.tsx      # 玩家控制器
│   └── Environment.tsx            # 環境系統
├── models/              # 模型系統
│   ├── ModelLoader.tsx            # 模型加載器
│   └── ModelManager.ts            # 模型管理器
├── optimization/        # 性能優化
│   ├── LODSystem.tsx              # LOD 系統
│   ├── ChunkLoader.tsx            # 分塊加載
│   └── PerformanceMonitor.tsx    # 性能監控
├── scenes/              # 場景
│   ├── GameScene.tsx              # 主遊戲場景
│   └── ExampleScene.tsx           # 範例場景
├── utils/               # 工具函數
│   └── GameUtils.ts
└── index.ts             # 模組匯出
```

## 📖 文檔

- [快速開始指南](./QUICKSTART.md) - 詳細的入門教學
- [架構文檔](./GAME_ARCHITECTURE.md) - 完整的系統說明

## 🎯 使用範例

### 載入帶動畫的模型（骨架與動畫分離）

```tsx
import { AnimatedModel } from './game/animations/AnimatedModel'

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

    // 動畫混合
    controller.blend('walk', 'run', 0.5)
  }}
/>
```

### 使用 LOD 優化性能

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

### 大場域分塊加載

```tsx
import { ChunkLoader, useGridChunks } from './game/optimization/ChunkLoader'

function MyWorld() {
  const chunks = useGridChunks(20, 50, (x, z) => (
    <TerrainChunk gridX={x} gridZ={z} />
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

## 🎨 場景說明

專案包含兩個範例場景：

1. **遊戲場景** - 展示基本的玩家控制和環境設置
2. **範例場景** - 展示 LOD 系統、分塊加載等進階功能

在瀏覽器中可通過上方按鈕切換場景。

## 💡 效能優化建議

### 大場域（> 1000 物件）
- ✅ 使用分塊加載系統
- ✅ 啟用 LOD 系統
- ✅ 限制視距範圍
- ✅ 使用性能監控

### 模型優化
- 減少三角形數量
- 合併材質（材質圖集）
- 壓縮貼圖大小
- 使用 Instancing（重複物件）

### 陰影優化
- 限制投射陰影的物件數量
- 降低陰影貼圖分辨率
- 調整陰影範圍

## 🔧 技術棧

- **React 19** - UI 框架
- **TypeScript 5.9** - 類型安全
- **Vite 7** - 建置工具
- **Three.js** - 3D 渲染引擎
- **React Three Fiber** - React 的 Three.js 封裝
- **@react-three/drei** - 輔助工具集

## 📦 已安裝套件

```json
{
  "three": "^0.171.0",
  "@react-three/fiber": "^8.18.10",
  "@react-three/drei": "^9.121.8",
  "@types/three": "^0.171.0",
  "three-stdlib": "^2.37.4"
}
```

## 🎮 控制說明

### 遊戲場景
- **WASD** 或 **方向鍵** - 移動
- **滑鼠拖曳** - 旋轉視角
- **滾輪** - 縮放

## 📝 模型準備

### 推薦格式
- GLTF 2.0 / GLB
- 使用 PBR 材質
- 貼圖大小：512x512 或 1024x1024

### 骨架動畫分離工作流程

1. **模型檔案** (`character.glb`) - 包含網格和骨架
2. **動畫檔案** (`walk.glb`, `run.glb`) - 只包含動畫數據
3. **重要**：骨骼名稱必須一致

詳見 [快速開始指南](./QUICKSTART.md#模型準備建議)

## 🐛 常見問題

**Q: 模型顯示全黑？**
A: 檢查是否有光照，或材質是否正確。

**Q: 動畫不播放？**
A: 確認模型包含動畫，並且骨骼名稱匹配。

**Q: FPS 太低？**
A: 啟用 LOD 系統，減少物件數量，或降低模型複雜度。

**Q: 分塊加載不工作？**
A: 確認 `centerPosition` 參數正確更新（通常是玩家位置）。

## 📄 授權

MIT License

## 🙏 致謝

- [Three.js](https://threejs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [@react-three/drei](https://github.com/pmndrs/drei)

---

Happy Coding! 🎮✨

如需更多資訊，請查閱：
- [快速開始指南](./QUICKSTART.md)
- [完整架構文檔](./GAME_ARCHITECTURE.md)
