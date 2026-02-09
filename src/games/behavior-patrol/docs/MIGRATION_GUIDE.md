# 遷移指南：從舊格式轉換到 actors + actions 格式

## 概述

新的格式與 `src/game/data/RiskEvents_1.ts` 一致，將角色定義（actors）和行為定義（actions）分離，提供更清晰的結構和更好的可維護性。

---

## 主要變更

### 1. 類型系統

#### 舊格式
```typescript
interface DangerActor {
  id: string;
  name: string;
  type: string;
  model: string;
  position: [number, number, number];  // ← 注意名稱
  behaviors: DangerBehavior[];  // ← 行為在角色內部
}

interface DangerBehavior {
  type: 'movement' | 'animation';
  path?: [number, number, number][];
  animation?: string;
}
```

#### 新格式
```typescript
interface DangerActor {
  id: string;
  name: string;
  type: ActorType;  // ← 使用 enum
  model: string;
  initialPosition: [number, number, number];  // ← 改名
  initialRotation?: [number, number, number];  // ← 改名
  animationUrls?: string[];
  // behaviors 移除
}

interface DangerFactor {
  actors: DangerActor[];  // ← 角色陣列
  actions: DangerAction[];  // ← 行為陣列（分離）
}

// Actions 通過 actorId 關聯角色
interface MovementAction {
  actorId: string;  // ← 關聯到角色
  type: ActionType.MOVEMENT;
  time: number;  // ← 新增：開始時間
  duration?: number;  // ← 新增：持續時間
  path: [number, number, number][];
  speed: number;
  loop?: boolean;
}
```

---

## 遷移步驟

### 步驟 1：更新 Actor 定義

**舊格式：**
```typescript
{
  id: 'pedestrian_1',
  name: '行人',
  type: 'pedestrian',
  model: '/models/Male1.glb',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  animationUrls: ['/animations/Walking.glb'],
  behaviors: [
    { type: 'animation', animation: 'Walking', animationLoop: true },
    { type: 'movement', path: [[0,0,0], [10,0,0]], speed: 2 }
  ]
}
```

**新格式：**
```typescript
{
  id: 'pedestrian_1',
  name: '行人',
  type: ActorType.PEDESTRIAN,  // ← 使用 enum
  model: '/models/Male1.glb',
  initialPosition: [0, 0, 0],  // ← position → initialPosition
  initialRotation: [0, 0, 0],  // ← rotation → initialRotation
  animationUrls: ['/animations/Walking.glb'],
  // behaviors 移除，改為在 actions 中定義
}
```

### 步驟 2：將 Behaviors 轉換為 Actions

**舊格式 behaviors：**
```typescript
behaviors: [
  {
    type: 'animation',
    animation: 'Walking',
    animationLoop: true
  },
  {
    type: 'movement',
    path: [[0,0,0], [10,0,0]],
    speed: 2,
    loop: true
  }
]
```

**新格式 actions：**
```typescript
actions: [
  {
    actorId: 'pedestrian_1',  // ← 關聯到角色
    type: ActionType.ANIMATION,
    name: 'Walking',  // ← animation → name
    time: 0,  // ← 新增：開始時間
    loop: true  // ← animationLoop → loop
  },
  {
    actorId: 'pedestrian_1',
    type: ActionType.MOVEMENT,
    path: [[0,0,0], [10,0,0]],
    speed: 2,
    time: 0,  // ← 新增：開始時間
    loop: true
  }
]
```

### 步驟 3：組合多角色事件

**舊格式（多 actors，每個有自己的 behaviors）：**
```typescript
actors: [
  {
    id: 'bicycle_1',
    behaviors: [
      { type: 'movement', path: [...], speed: 5 }
    ]
  },
  {
    id: 'rider_1',
    behaviors: [
      { type: 'movement', path: [...], speed: 5 }
    ]
  }
]
```

**新格式（actors 與 actions 分離）：**
```typescript
actors: [
  { id: 'bicycle_1', model: '/models/Bicycle.glb', initialPosition: [0,0,0] },
  { id: 'rider_1', model: '/models/Rider.glb', initialPosition: [0,0,0] }
],
actions: [
  {
    actorId: 'bicycle_1',
    type: ActionType.MOVEMENT,
    path: [...],
    speed: 5,
    time: 0
  },
  {
    actorId: 'rider_1',
    type: ActionType.MOVEMENT,
    path: [...],  // ← 相同路徑保持同步
    speed: 5,
    time: 0
  }
]
```

---

## 完整範例對比

### 舊格式
```typescript
{
  id: 'danger-1',
  name: '行人邊走邊滑手機',
  actors: [
    {
      id: 'pedestrian_1',
      name: '行人',
      type: 'pedestrian',
      model: '/models/Male1_CnH_Rigged.glb',
      position: [-92.17, 0.15, -15.64],
      rotation: [0, Math.PI / 2, 0],
      accessoryNames: ['phone'],
      animationUrls: ['/animations/Walking_Phone.glb'],
      behaviors: [
        {
          type: 'animation',
          animation: 'Male_Walking_Phone_Animation',
          animationLoop: true
        },
        {
          type: 'movement',
          path: [[-92.17, 0.15, -15.64], [-71.69, 0.15, -15.25]],
          speed: 1.5,
          loop: true
        }
      ]
    }
  ],
  questions: { ... },
  feedback: [...],
  found: false
}
```

### 新格式
```typescript
{
  id: 'danger-1',
  name: '行人邊走邊滑手機',
  actors: [
    {
      id: 'pedestrian_1',
      name: '行人',
      type: ActorType.PEDESTRIAN,  // ← enum
      model: '/models/Male1_CnH_Rigged.glb',
      initialPosition: [-92.17, 0.15, -15.64],  // ← 改名
      initialRotation: [0, Math.PI / 2, 0],  // ← 改名
      accessoryNames: ['phone'],
      animationUrls: ['/animations/Walking_Phone.glb']
      // behaviors 移除
    }
  ],
  actions: [  // ← 新增 actions 陣列
    {
      actorId: 'pedestrian_1',
      type: ActionType.ANIMATION,
      name: 'Male_Walking_Phone_Animation',
      time: 0,
      loop: true
    },
    {
      actorId: 'pedestrian_1',
      type: ActionType.MOVEMENT,
      path: [[-92.17, 0.15, -15.64], [-71.69, 0.15, -15.25]],
      speed: 1.5,
      time: 0,
      loop: true
    }
  ],
  questions: { ... },
  feedback: [...],
  found: false
}
```

---

## 關鍵差異總結

| 項目 | 舊格式 | 新格式 |
|------|--------|--------|
| 角色類型 | `type: string` | `type: ActorType` (enum) |
| 位置屬性 | `position` | `initialPosition` |
| 旋轉屬性 | `rotation` | `initialRotation` |
| 行為存放 | `actor.behaviors[]` | `danger.actions[]` |
| 行為關聯 | 內嵌在角色內 | 通過 `actorId` 關聯 |
| 動畫屬性 | `animation` | `name` |
| 循環屬性 | `animationLoop` | `loop` |
| 時間控制 | 無 | `time`, `duration` |

---

## 遷移檢查清單

- [ ] 將 `position` 改為 `initialPosition`
- [ ] 將 `rotation` 改為 `initialRotation`
- [ ] 將 `type` 改為使用 `ActorType` enum
- [ ] 從 actor 中移除 `behaviors` 陣列
- [ ] 創建 `actions` 陣列在 `DangerFactor` 層級
- [ ] 為每個 action 添加 `actorId`
- [ ] 為每個 action 添加 `time` 屬性（通常為 0）
- [ ] 將 `animation` 改為 `name`
- [ ] 將 `animationLoop` 改為 `loop`
- [ ] 更新 `type` 使用 `ActionType` enum

---

## 使用新組件

### 舊方式（ClickableObject）
```tsx
<ClickableObject
  id={danger.id}
  model={actor.model}
  position={actor.position}
  behaviors={actor.behaviors}
  onClick={handleClick}
/>
```

### 新方式（DangerGroup）
```tsx
<DangerGroup
  danger={danger}  // ← 傳入整個 danger 物件
  onClick={handleClick}
  enableDebug={true}
/>
```

DangerGroup 會自動：
- 渲染所有 actors
- 為每個 actor 分配對應的 actions
- 處理點擊事件（點擊任一角色都觸發）
- 根據 time 和 duration 執行 actions

---

## 完整範例檔案

參考 `PatrolScenario_1_New.ts` 查看完整的新格式範例。

---

## 常見問題

### Q: 為什麼要分離 actors 和 actions？
A:
- 更清晰的結構（角色是什麼 vs 角色做什麼）
- 更容易複用角色（多個 actions 可以操作同一個 actor）
- 與 RiskEvents 格式一致
- 更好的時間控制（可以設定 action 開始時間）

### Q: 如何確保自行車和騎士同步移動？
A: 給它們相同的 path 和 speed：

```typescript
actions: [
  {
    actorId: 'bicycle_1',
    type: ActionType.MOVEMENT,
    path: sharedPath,
    speed: 5,
    time: 0
  },
  {
    actorId: 'rider_1',
    type: ActionType.MOVEMENT,
    path: sharedPath,  // ← 相同路徑
    speed: 5,  // ← 相同速度
    time: 0
  }
]
```

### Q: 舊的場景數據還能用嗎？
A: 不能。需要遷移到新格式。但可以使用自動化腳本輔助（待開發）。

---

## 需要幫助？

- 查看 `types.ts` 了解完整的類型定義
- 參考 `PatrolScenario_1_New.ts` 查看範例
- 閱讀 `MULTI_ACTOR_GUIDE.md` 了解多角色組合
