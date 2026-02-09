# 多角色事件系統更新日誌

## 🎉 新功能：多角色組合事件

### 更新日期
2026-02-09

### 概述
實現了在單一危險事件中組合多個不同模型和角色的功能，讓場景更加真實和複雜。

---

## 📦 更新內容

### 1. 類型定義擴展 (`types.ts`)

#### 新增類型
```typescript
export interface DangerActor {
  id: string;           // 角色唯一ID
  name: string;         // 角色名稱
  type: string;         // 類型：vehicle, scooter, pedestrian, bicycle
  model: string;        // 3D模型路徑
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  accessoryNames?: string[];
  animationUrls?: string[];
  behaviors: DangerBehavior[];  // 該角色的獨立行為
}
```

#### 擴展現有類型
`DangerFactor` 現在支援兩種格式：
- **舊格式**：單一模型（保持向後兼容）
- **新格式**：`actors` 陣列（多角色組合）

### 2. 輔助工具 (`utils/actorHelpers.ts`)

提供了完整的工具函數集：
- `normalizeDangerActors()` - 統一處理新舊格式
- `isMultiActorDanger()` - 判斷是否為多角色事件
- `getActorCount()` - 獲取角色數量
- `findActorById()` - 根據ID查找角色
- `calculateDangerCenter()` - 計算事件中心點
- `calculateDangerRadius()` - 計算事件範圍

### 3. 場景數據更新 (`data/PatrolScenario_1.ts`)

#### 更新的事件
- **danger-4**: 「機車在公車後方搶快超車」
  - 修正：從單一公車改為公車+機車組合
  - 公車正常速度（6 m/s）行駛
  - 機車從後方高速（12 m/s）超車

#### 新增的事件
- **danger-6**: 「自行車突然偏移（閃避障礙物）」
  - 自行車 + 騎士組合
  - 展示同步移動的實現方式
  - 包含完整的路徑和動畫配置

### 4. 文檔
- `MULTI_ACTOR_GUIDE.md` - 完整使用指南
- `CHANGELOG_MULTI_ACTOR.md` - 更新日誌（本文件）

---

## 🚀 使用示例

### 簡單的兩角色組合

```typescript
{
  id: 'danger-combo',
  name: '公車與機車',
  actors: [
    {
      id: 'bus_1',
      name: '公車',
      type: 'vehicle',
      model: '/path/to/bus.glb',
      position: [0, 0, 0],
      behaviors: [...]
    },
    {
      id: 'scooter_1',
      name: '機車',
      type: 'scooter',
      model: '/path/to/scooter.glb',
      position: [-5, 0, -3],
      behaviors: [...]
    }
  ],
  questions: {...},
  feedback: [...],
  found: false
}
```

### 在程式碼中使用

```typescript
import { normalizeDangerActors } from './utils/actorHelpers';

// 自動處理新舊格式
const actors = normalizeDangerActors(danger);

actors.forEach(actor => {
  // 載入模型
  loadModel(actor.model, actor.position);

  // 執行行為
  actor.behaviors.forEach(behavior => {
    if (behavior.type === 'movement') {
      applyMovement(actor.id, behavior.path, behavior.speed);
    }
  });
});
```

---

## ✅ 向後兼容性

所有現有的單一模型事件**完全兼容**，無需修改：

```typescript
// 舊格式依然有效
{
  id: 'danger-1',
  name: '行人邊走邊滑手機',
  type: 'pedestrian',
  position: [-92.17, 0.15, -15.64],
  model: '/src/assets/models/Male1_CnH_Rigged.glb',
  behaviors: [...],
  // ...
}
```

系統會自動轉換為統一格式處理。

---

## 🎯 常見應用場景

### 1. 車輛相關
- ✅ 公車 + 機車（超車場景）
- ✅ 汽車 + 汽車（並行/追撞）
- ✅ 車輛 + 開門駕駛

### 2. 自行車相關
- ✅ 自行車 + 騎士（必須組合）
- ✅ 多輛自行車 + 各自騎士

### 3. 行人相關
- ✅ 多個行人（人群穿越）
- ✅ 行人 + 車輛（互動場景）

### 4. 複雜場景
- ✅ 公車 + 機車 + 行人
- ✅ 多車道多車輛
- ✅ 路口多方向車輛

---

## ⚠️ 已知限制

1. **無物理碰撞**
   - 角色之間無實際碰撞檢測
   - 需要通過路徑設計來模擬互動

2. **性能限制**
   - 建議單一事件不超過 5 個角色
   - 過多角色會影響渲染性能

3. **同步限制**
   - 同步移動的角色需要手動保證路徑一致
   - 無自動同步機制

---

## 🔮 未來計劃

### 短期
- [ ] 渲染系統整合（自動載入多個角色）
- [ ] 點擊檢測範圍調整
- [ ] 更多組合場景範例

### 長期
- [ ] 角色間互動觸發系統
- [ ] 自動同步機制（主從關係）
- [ ] 物理碰撞檢測（可選）
- [ ] 動態隨機生成組合

---

## 📚 相關文件

- `types.ts` - 類型定義
- `utils/actorHelpers.ts` - 輔助工具
- `data/PatrolScenario_1.ts` - 場景數據範例
- `docs/MULTI_ACTOR_GUIDE.md` - 詳細使用指南

---

## 🤝 貢獻

如需新增更多組合場景或改進功能，歡迎參考現有範例並提交更新。

主要修改位置：
1. `types.ts` - 擴展類型（如需新欄位）
2. `data/PatrolScenario_*.ts` - 新增場景數據
3. `utils/actorHelpers.ts` - 新增輔助函數

---

## 📝 備註

這次更新主要關注**數據結構和配置層面**，渲染系統需要相應調整以支援多角色載入和管理。建議整合時使用 `normalizeDangerActors()` 函數來統一處理。
