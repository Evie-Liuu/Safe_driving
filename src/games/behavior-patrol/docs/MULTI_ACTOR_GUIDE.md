# 多角色事件組合指南

## 概述

這個系統支援在單一危險事件中組合多個不同模型和角色，實現更真實的交通情境。

## 功能特點

✅ **多角色組合** - 在一個事件中組合多個模型（公車+機車、自行車+騎士）
✅ **獨立行為** - 每個角色有獨立的移動路徑和動畫
✅ **向後兼容** - 支援舊的單一模型格式
✅ **靈活配置** - 可隨意組合不同類型的角色

---

## 使用方式

### 方式 1：新格式（多角色）

使用 `actors` 陣列定義多個角色：

```typescript
{
  id: 'danger-combo-1',
  name: '機車在公車後方搶快超車',
  description: '公車正常行駛，機車危險超車',
  actors: [
    {
      id: 'bus_1',
      name: '公車',
      type: 'vehicle',
      model: '/src/assets/models/Bus_Rigged.glb',
      position: [37.6, 0, 9.35],
      rotation: [0, Math.PI / 2, 0],
      animationUrls: ['/src/assets/animations/car/Bus_Moving_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Bus_Moving_Animation', animationLoop: true },
        { type: 'movement', path: [...], speed: 6, loop: true }
      ]
    },
    {
      id: 'scooter_1',
      name: '機車',
      type: 'scooter',
      model: '/src/assets/models/Scooter2_Rigged.glb',
      position: [28, 0, 9.35],
      rotation: [0, Math.PI / 2, 0],
      behaviors: [
        { type: 'movement', path: [...], speed: 12, loop: true }
      ]
    }
  ],
  questions: { ... },
  feedback: [...],
  found: false
}
```

### 方式 2：舊格式（單一模型）

繼續使用原有的單一模型格式（自動兼容）：

```typescript
{
  id: 'danger-1',
  name: '行人邊走邊滑手機',
  type: 'pedestrian',
  position: [-92.17, 0.15, -15.64],
  rotation: [0, Math.PI / 2, 0],
  model: '/src/assets/models/Male1_CnH_Rigged.glb',
  animationUrls: [...],
  behaviors: [...],
  questions: { ... },
  feedback: [...],
  found: false
}
```

---

## 常見組合範例

### 1. 自行車 + 騎士

```typescript
actors: [
  {
    id: 'bicycle_1',
    name: '自行車',
    type: 'bicycle',
    model: '/src/assets/models/Bicycle1_Rigged.glb',
    position: [5, 0, 30],
    rotation: [0, 0, 0],
    animationUrls: ['/src/assets/animations/car/Bicycle_Moving_Animation.glb'],
    behaviors: [
      { type: 'animation', animation: 'Bicycle_Moving_Animation', animationLoop: true },
      { type: 'movement', path: [[5, 0, 30], [7, 0, 45], [8.5, 0, 50]], speed: 4, loop: true }
    ]
  },
  {
    id: 'rider_1',
    name: '騎士',
    type: 'pedestrian',
    model: '/src/assets/models/Male1_Rigged.glb',
    position: [5, 0, 30],
    rotation: [0, 0, 0],
    animationUrls: ['/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb'],
    behaviors: [
      { type: 'animation', animation: 'Male_Riding_Bicycle_Animation', animationLoop: true },
      { type: 'movement', path: [[5, 0, 30], [7, 0, 45], [8.5, 0, 50]], speed: 4, loop: true }
    ]
  }
]
```

**注意**：自行車和騎士需要保持相同的位置和路徑！

### 2. 公車 + 多台機車

```typescript
actors: [
  {
    id: 'bus_1',
    name: '公車',
    type: 'vehicle',
    model: '/src/assets/models/Bus_Rigged.glb',
    position: [0, 0, 0],
    behaviors: [{ type: 'movement', path: [...], speed: 8 }]
  },
  {
    id: 'scooter_1',
    name: '機車1',
    type: 'scooter',
    model: '/src/assets/models/Scooter1_Rigged.glb',
    position: [-3, 0, -5],
    behaviors: [{ type: 'movement', path: [...], speed: 12 }]
  },
  {
    id: 'scooter_2',
    name: '機車2',
    type: 'scooter',
    model: '/src/assets/models/Scooter2_Rigged.glb',
    position: [3, 0, -8],
    behaviors: [{ type: 'movement', path: [...], speed: 14 }]
  }
]
```

### 3. 車輛 + 開門駕駛

```typescript
actors: [
  {
    id: 'parked_car',
    name: '停放車輛',
    type: 'vehicle',
    model: '/src/assets/models/Car_Main2_Rigged.glb',
    position: [11, 0, 43.5],
    animationUrls: ['/src/assets/animations/car/Car_Main2_LeftDoor_Opening_Animation.glb'],
    behaviors: [
      { type: 'animation', animation: 'Car_Main2_LeftDoor_Opening_Animation', animationLoop: false }
    ]
  },
  {
    id: 'driver',
    name: '駕駛',
    type: 'pedestrian',
    model: '/src/assets/models/Male1_Rigged.glb',
    position: [11, 0, 43.5],
    animationUrls: ['/src/assets/animations/character/Male_OpenCarLeftDoor_Inside_Animation.glb'],
    behaviors: [
      { type: 'animation', animation: 'Male_OpenCarLeftDoor_Inside_Animation', animationLoop: false }
    ]
  }
]
```

---

## 輔助工具函數

使用 `actorHelpers.ts` 中的工具函數處理多角色事件：

```typescript
import {
  normalizeDangerActors,
  isMultiActorDanger,
  getActorCount,
  findActorById,
  calculateDangerCenter,
  calculateDangerRadius
} from '../utils/actorHelpers';

// 獲取所有角色（自動處理新舊格式）
const actors = normalizeDangerActors(danger);

// 判斷是否為多角色事件
if (isMultiActorDanger(danger)) {
  console.log('這是多角色組合事件');
}

// 獲取角色數量
const count = getActorCount(danger);

// 查找特定角色
const bus = findActorById(danger, 'bus_1');

// 計算事件中心點（用於相機聚焦）
const center = calculateDangerCenter(danger);

// 計算事件範圍（用於點擊檢測）
const radius = calculateDangerRadius(danger);
```

---

## 注意事項

### 1. 同步移動的角色

如果角色需要一起移動（例如自行車+騎士），確保它們的 `path` 和 `speed` 完全相同：

```typescript
// ✅ 正確：相同路徑和速度
const sharedPath = [[0, 0, 0], [10, 0, 10]];
const sharedSpeed = 4;

bicycle.behaviors = [{ type: 'movement', path: sharedPath, speed: sharedSpeed }];
rider.behaviors = [{ type: 'movement', path: sharedPath, speed: sharedSpeed }];

// ❌ 錯誤：不同步會導致分離
bicycle.behaviors = [{ type: 'movement', path: [[0, 0, 0]], speed: 4 }];
rider.behaviors = [{ type: 'movement', path: [[0, 0, 0]], speed: 5 }];
```

### 2. 動畫時機

確保相關動畫在正確的時間開始：

```typescript
{
  id: 'car_door',
  behaviors: [
    { type: 'animation', animation: 'Door_Opening', animationLoop: false }
  ]
},
{
  id: 'driver',
  behaviors: [
    { type: 'animation', animation: 'Exit_Car', animationLoop: false }
  ]
}
```

### 3. 性能考量

- 單一事件建議不超過 **5 個角色**
- 過多角色會影響渲染性能
- 優先使用動畫而非過多移動路徑點

### 4. 碰撞和互動

目前系統主要用於視覺展示，角色之間沒有物理碰撞。如果需要模擬互動，請通過路徑設計來實現。

---

## 測試建議

創建新的多角色事件後，請檢查：

1. ✅ 所有角色都正確載入和顯示
2. ✅ 動畫正常播放
3. ✅ 移動路徑符合預期
4. ✅ 同步移動的角色保持一致
5. ✅ 點擊檢測範圍合理
6. ✅ 問題和反饋文字正確

---

## 示例場景

完整的示例可以參考 `PatrolScenario_1.ts` 中的：

- **danger-4**: 公車 + 機車組合
- **danger-6**: 自行車 + 騎士組合

---

## 未來擴展

可以考慮添加的功能：

- 🔮 角色之間的觸發關聯（例如：公車停下後，行人才開始穿越）
- 🔮 動態生成的隨機組合
- 🔮 更複雜的互動行為（追逐、避讓等）
- 🔮 聲音效果同步

---

如有問題或建議，請查閱類型定義 `types.ts` 或聯繫開發團隊。
