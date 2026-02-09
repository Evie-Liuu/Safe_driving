# 更新總結：采用 RiskEvents actors + actions 格式

## 📅 更新日期
2026-02-10

## 🎯 目標
將 behavior-patrol 遊戲的事件格式調整為與 `src/game/data/RiskEvents_1.ts` 一致的 actors + actions 結構。

---

## 📦 更新的文件

### 1. 類型定義 ✅
**文件**: `src/games/behavior-patrol/types.ts`

**變更**:
- 新增 `ActionType` 和 `ActorType` enums
- 重構 `DangerActor` 接口（移除 behaviors，改名 position → initialPosition）
- 新增 `MovementAction`, `AnimationAction`, `SoundAction`, `LightAction` 接口
- 更新 `DangerFactor` 使用 `actors` + `actions` 結構
- 更新 `SafeObject` 使用相同結構

**核心變更**:
```typescript
// 舊
interface DangerActor {
  position: [number, number, number];
  behaviors: DangerBehavior[];
}

// 新
interface DangerActor {
  initialPosition: [number, number, number];  // ← 改名
  type: ActorType;  // ← 使用 enum
}

interface DangerFactor {
  actors: DangerActor[];
  actions: DangerAction[];  // ← 分離的 actions
}
```

### 2. 輔助工具 ✅
**文件**: `src/games/behavior-patrol/utils/actorHelpers.ts`

**新增函數**:
- `getActionsForActor()` - 獲取某角色的所有 actions
- `getMovementActionsForActor()` - 獲取移動 actions
- `getAnimationActionsForActor()` - 獲取動畫 actions

**移除函數**:
- `normalizeDangerActors()` - 不再需要兼容舊格式

### 3. 新組件 ✅

#### DangerActorObject.tsx
**文件**: `src/games/behavior-patrol/components/DangerActorObject.tsx`

**功能**:
- 渲染單一角色（actor）
- 根據 actions 的 `time` 和 `duration` 執行動作
- 支援 MOVEMENT 和 ANIMATION actions
- 處理點擊事件
- 自動載入模型和動畫

**Props**:
```typescript
{
  actor: DangerActor;
  actions: DangerAction[];  // 該角色的 actions
  onClick?: () => void;
  disabled?: boolean;
  found?: boolean;
  enableDebug?: boolean;
}
```

#### DangerGroup.tsx
**文件**: `src/games/behavior-patrol/components/DangerGroup.tsx`

**功能**:
- 渲染整個 DangerFactor 的所有角色
- 自動為每個角色分配對應的 actions
- 統一處理點擊事件（點擊任一角色都觸發）

**Props**:
```typescript
{
  danger: DangerFactor;
  onClick: () => void;
  disabled?: boolean;
  enableDebug?: boolean;
}
```

**使用方式**:
```tsx
<DangerGroup
  danger={dangerFactor}
  onClick={handleDangerClick}
  enableDebug={true}
/>
```

### 4. 新場景數據 ✅
**文件**: `src/games/behavior-patrol/data/PatrolScenario_1_New.ts`

**內容**:
- 完整的新格式場景示例
- 包含 3 個 dangers：
  1. 行人邊走邊滑手機（單角色）
  2. 機車在公車後方搶快超車（雙角色）
  3. 自行車突然偏移（雙角色：自行車 + 騎士）

**範例結構**:
```typescript
{
  id: 'danger-4',
  name: '機車在公車後方搶快超車',
  actors: [
    { id: 'bus_1', type: ActorType.VEHICLE, ... },
    { id: 'scooter_1', type: ActorType.SCOOTER, ... }
  ],
  actions: [
    { actorId: 'bus_1', type: ActionType.MOVEMENT, ... },
    { actorId: 'scooter_1', type: ActionType.MOVEMENT, ... }
  ]
}
```

---

## 📚 文檔

### 1. MIGRATION_GUIDE.md ✅
**位置**: `src/games/behavior-patrol/docs/MIGRATION_GUIDE.md`

**內容**:
- 舊格式 vs 新格式對比
- 詳細的遷移步驟
- 完整範例對比
- 常見問題解答
- 遷移檢查清單

### 2. MULTI_ACTOR_GUIDE.md ⚠️ (需更新)
**位置**: `src/games/behavior-patrol/docs/MULTI_ACTOR_GUIDE.md`

**狀態**: 已過時，需要根據新格式更新

### 3. UPDATE_SUMMARY.md ✅
**位置**: `src/games/behavior-patrol/docs/UPDATE_SUMMARY.md`

**內容**: 本文件

---

## 🔄 格式對比

### 核心差異

| 項目 | 舊格式 | 新格式 | 原因 |
|------|--------|--------|------|
| 結構 | actors 內嵌 behaviors | actors + actions 分離 | 更清晰，與 RiskEvents 一致 |
| 位置屬性 | `position` | `initialPosition` | 更明確表達初始位置 |
| 類型 | `type: string` | `type: ActorType` | 類型安全 |
| 行為關聯 | 內嵌 | `actorId` 引用 | 解耦，更靈活 |
| 時間控制 | 無 | `time`, `duration` | 精確控制動作時機 |

### 示例對比

**舊格式**:
```typescript
actors: [{
  id: 'ped_1',
  position: [0, 0, 0],
  behaviors: [
    { type: 'movement', path: [...], speed: 2 }
  ]
}]
```

**新格式**:
```typescript
actors: [{
  id: 'ped_1',
  type: ActorType.PEDESTRIAN,
  initialPosition: [0, 0, 0]
}],
actions: [{
  actorId: 'ped_1',
  type: ActionType.MOVEMENT,
  path: [...],
  speed: 2,
  time: 0
}]
```

---

## 🎨 組件使用變更

### 舊方式（不再使用）
```tsx
import { ClickableObject } from './ClickableObject';

// 為每個 actor 單獨渲染
{danger.actors.map(actor => (
  <ClickableObject
    key={actor.id}
    model={actor.model}
    position={actor.position}
    behaviors={actor.behaviors}
    onClick={handleClick}
  />
))}
```

### 新方式（推薦）
```tsx
import { DangerGroup } from './DangerGroup';

// 渲染整個 danger
<DangerGroup
  danger={danger}
  onClick={handleDangerClick}
  enableDebug={true}
/>
```

---

## ✨ 優勢

### 1. 結構更清晰
- 角色定義（actors）：描述"是什麼"
- 行為定義（actions）：描述"做什麼"
- 關注點分離

### 2. 時間控制
```typescript
actions: [
  { actorId: 'car', type: ActionType.MOVEMENT, time: 0, duration: 5 },
  { actorId: 'car', type: ActionType.ANIMATION, time: 2 },  // 2秒後播放
  { actorId: 'car', type: ActionType.LIGHT, time: 3, duration: 2 }  // 3秒後開燈
]
```

### 3. 更好的複用
```typescript
// 多個 actions 可以操作同一個 actor
actions: [
  { actorId: 'car_1', type: ActionType.MOVEMENT, path: [...], time: 0 },
  { actorId: 'car_1', type: ActionType.ANIMATION, name: 'Idle', time: 0 },
  { actorId: 'car_1', type: ActionType.LIGHT, lightType: 'hazard', time: 5 }
]
```

### 4. 與 RiskEvents 一致
- 相同的數據結構
- 可能的代碼共享
- 統一的開發體驗

---

## 🚧 待辦事項

### 高優先級
- [ ] 更新遊戲主場景渲染邏輯使用 `DangerGroup`
- [ ] 測試新組件的點擊檢測
- [ ] 驗證多角色同步移動
- [ ] 遷移所有現有場景數據

### 中優先級
- [ ] 更新 `MULTI_ACTOR_GUIDE.md` 使用新格式
- [ ] 創建自動化遷移腳本
- [ ] 添加單元測試
- [ ] 性能優化

### 低優先級
- [ ] 添加更多 action types（SOUND, LIGHT）
- [ ] 支援 action 的條件觸發
- [ ] 添加動畫混合和過渡

---

## 🔧 技術細節

### Action 執行機制
1. 每幀更新 `elapsedTime`
2. 檢查是否有 action 的 `time` 已到達
3. 執行對應的 action（播放動畫、開始移動等）
4. 根據 `duration` 決定何時結束

### 同步移動
自行車和騎士保持同步的方式：
```typescript
const sharedPath = [[0,0,0], [10,0,10]];
const sharedSpeed = 5;

actions: [
  { actorId: 'bicycle_1', type: ActionType.MOVEMENT, path: sharedPath, speed: sharedSpeed, time: 0 },
  { actorId: 'rider_1', type: ActionType.MOVEMENT, path: sharedPath, speed: sharedSpeed, time: 0 }
]
```

### 點擊檢測
- 每個 `DangerActorObject` 都有獨立的點擊處理
- `DangerGroup` 統一管理，點擊任一角色都觸發相同回調
- 使用 invisible hitbox 提升點擊範圍

---

## 📖 相關文檔

1. **MIGRATION_GUIDE.md** - 詳細遷移指南
2. **PatrolScenario_1_New.ts** - 完整範例
3. **types.ts** - 類型定義
4. **RiskEvents_1.ts** - 參考格式（Safe_driving 遊戲）

---

## 🤝 貢獻

如需添加新功能或修復問題：
1. 查閱 `types.ts` 了解類型定義
2. 參考 `PatrolScenario_1_New.ts` 範例
3. 遵循 actors + actions 分離原則
4. 更新文檔

---

## 📝 備註

- 舊的 `ClickableObject.tsx` 保留但不再使用
- 舊的場景數據需要手動遷移
- 新格式不向後兼容
- 建議使用 TypeScript strict mode 確保類型安全

---

**更新完成** ✅

所有核心功能已實現，組件和工具已就緒。下一步是整合到實際遊戲中並遷移場景數據。
