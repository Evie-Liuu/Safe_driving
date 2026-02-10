# 汽車不禮讓斑馬線行人事件 - 實現指南

## 概述

本文檔說明如何模擬真實的「汽車不禮讓斑馬線行人」危險事件,關鍵在於時序協調和路徑設計,讓玩家能清楚看到危險的交會時刻。

## 核心設計原則

### 1. 時序差異(Time Offset)

**❌ 錯誤做法**: 汽車和行人同時啟動
```typescript
// 兩者同時開始,無法呈現"不禮讓"的危險時刻
{actorId: 'car', time: 0, ...}
{actorId: 'pedestrian', time: 0, ...}
```

**✅ 正確做法**: 行人先開始,汽車延遲啟動
```typescript
// 行人先開始穿越
{actorId: 'pedestrian', time: 0, ...}

// 汽車延遲啟動,當行人已在斑馬線上時接近
{actorId: 'car', time: 1.0, ...}
```

**原理**:
- 行人在 0 秒開始穿越,約 1.5-2 秒走到斑馬線中間
- 汽車在 1 秒啟動,約 0.8-1.2 秒到達斑馬線
- 兩者在 1.8-2.2 秒時在斑馬線交會 ⚠️

### 2. 速度對比

| 角色 | 速度 | 意義 |
|------|------|------|
| 行人 | 3-4 單位/秒 | 正常步行速度 |
| 汽車(禮讓) | 5-7 單位/秒 | 減速慢行 |
| 汽車(不禮讓) | 10-12 單位/秒 | 未減速,危險速度 ⚠️ |

**關鍵**: 汽車速度明顯快於行人,製造壓迫感和危險性。

### 3. 路徑交叉設計

#### 行人路徑(垂直穿越)
```typescript
path: [
  [-13.22, 0, 123.71],  // 起點:路邊人行道
  [-13.47, 0, 114.5],   // 中點:斑馬線中間 ⚠️ 危險點
  [-13.72, 0, 105.12],  // 終點:對面人行道
]
```

#### 汽車路徑(水平通過)
```typescript
path: [
  [-7.84, 0, 110.9],    // 起點:遠處
  [-12, 0, 111.5],      // 接近斑馬線
  [-13.5, 0, 113.5],    // 交會點 ⚠️ 與行人路徑交叉
  [-15, 0, 115.5],      // 穿過斑馬線
  ...                   // 繼續行駛
]
```

**交會點**: `x ≈ -13.5, z ≈ 113-115` 是兩條路徑的交叉區域

## 完整實現示例

### danger-5: 汽車不禮讓斑馬線行人

```typescript
{
  id: 'danger-5',
  name: '汽車不禮讓斑馬線行人',
  description: '行人正在穿越斑馬線,汽車未減速、不禮讓直接通過',

  actors: [
    {
      id: 'car_not_yield_1',
      name: '不禮讓汽車',
      type: ActorType.VEHICLE,
      model: '/src/assets/models/Car2_Rigged.glb',
      initialPosition: [-7.84, 0, 110.9],
      initialRotation: [0, -Math.PI / 2, 0],
      animationUrls: ['/src/assets/animations/car/Car_Moving_Animation.glb'],
      replayInterval: 12, // 每12秒重播一次
    },
    {
      id: 'pedestrian_crossing_1',
      name: '穿越斑馬線行人',
      type: ActorType.PEDESTRIAN,
      model: '/src/assets/models/Male3_Rigged.glb',
      initialPosition: [-13.22, 0, 123.71],
      initialRotation: [0, 0, 0],
      animationUrls: ['/src/assets/animations/character/Male_Walking_Animation.glb'],
      replayInterval: 12, // 與汽車同步重播
    },
  ],

  actions: [
    // 📍 步驟1: 行人先開始穿越(time: 0)
    {
      actorId: 'pedestrian_crossing_1',
      type: ActionType.ANIMATION,
      name: 'Male_Walking_Animation',
      time: 0,
      duration: 5,
      loop: true,
    },
    {
      actorId: 'pedestrian_crossing_1',
      type: ActionType.MOVEMENT,
      path: [
        [-13.22, 0, 123.71],  // 起點
        [-13.47, 0, 114.5],   // 斑馬線中間 ⚠️
        [-13.72, 0, 105.12],  // 終點
      ],
      speed: 3.5,
      time: 0,
      duration: 5.3,
    },

    // 📍 步驟2: 汽車延遲啟動(time: 1.0)
    {
      actorId: 'car_not_yield_1',
      type: ActionType.ANIMATION,
      name: 'Car_Moving_Animation',
      time: 1.0, // ⚠️ 關鍵延遲
      duration: 12,
      loop: true,
    },
    {
      actorId: 'car_not_yield_1',
      type: ActionType.MOVEMENT,
      path: [
        [-7.84, 0, 110.9],
        [-12, 0, 111.5],
        [-13.5, 0, 113.5],    // ⚠️ 危險交會點
        [-15, 0, 115.5],
        [-20, 0, 117],
        [-96.34, 0, 110.77],
        [-109.13, 0, 111.58],
      ],
      speed: 11, // ⚠️ 快速不減速
      time: 1.0,
      duration: 11,
    },
  ],
}
```

## 時間軸分析

```
時間軸(秒):
0.0  │ 行人開始穿越 🚶
     │
0.5  │ 行人走向斑馬線
     │
1.0  │ 汽車啟動 🚗
     │ 行人接近斑馬線中間
     │
1.5  │ 行人走到斑馬線中間
     │ 汽車快速接近
     │
1.8  │ ⚠️⚠️⚠️ 危險時刻! ⚠️⚠️⚠️
2.0  │ 汽車與行人在斑馬線交會
2.2  │ 汽車穿過,行人驚險避開
     │
3.0  │ 汽車遠離
     │ 行人繼續穿越
     │
5.3  │ 行人到達對面
11.0 │ 汽車完成路徑
     │
12.0 │ [等待] 準備重播
     │
24.0 │ 重播開始 🔄
```

## 調試與優化

### 1. 啟用調試模式

```typescript
<DangerGroup
  danger={danger}
  onClick={handleClick}
  enableDebug={true}  // 顯示路徑點
/>
```

**觀察項目**:
- 黃色球體顯示路徑點
- 檢查交會點位置是否合理
- 確認時序是否產生危險時刻

### 2. 調整交會時機

**太早交會** (汽車還沒到,行人已過):
```typescript
// 減少汽車延遲時間
time: 0.5 // 從 1.0 改為 0.5
```

**太晚交會** (行人已過,汽車才到):
```typescript
// 增加汽車延遲時間
time: 1.5 // 從 1.0 改為 1.5
```

**計算公式**:
```
行人到達交會點時間 = 行人路徑前半段距離 / 行人速度
汽車到達交會點時間 = 汽車延遲時間 + (汽車到交會點距離 / 汽車速度)

理想交會: |行人到達時間 - 汽車到達時間| ≈ 0.5秒
```

### 3. 速度微調

```typescript
// 行人速度
speed: 3.5  // 標準:3-4,慢速:2-3,快速:4-5

// 汽車速度
speed: 11   // 慢速:8-9,標準:10-12,快速:13-15
```

### 4. 路徑精確度

**確認交會點坐標**:
1. 使用調試模式查看路徑點位置
2. 記錄行人和汽車的實際交會坐標
3. 調整路徑點使交會更明顯

```typescript
// 在路徑中明確添加交會點
行人: [-13.5, 0, 114.0]  // 斑馬線中心
汽車: [-13.5, 0, 114.0]  // 相同位置,製造衝突
```

## 變體設計

### 變體1: 行人緊急避讓

添加行人的反應動作:
```typescript
{
  actorId: 'pedestrian',
  type: ActionType.ANIMATION,
  name: 'Male_Idle_Animation', // 停下來避讓
  time: 1.8, // 汽車接近時
  duration: 1.0,
}
```

### 變體2: 多個行人

```typescript
actors: [
  {id: 'ped_1', initialPosition: [-13.22, 0, 123.71]},
  {id: 'ped_2', initialPosition: [-14.5, 0, 123.71]}, // 並排
  {id: 'car', ...},
]
```

### 變體3: 連續不禮讓

```typescript
actors: [
  {id: 'car_1', time: 1.0, replayInterval: 8},
  {id: 'car_2', time: 5.0, replayInterval: 8}, // 第二輛車
  {id: 'pedestrian', time: 0, replayInterval: 12},
]
```

## 測試檢查清單

- [ ] 行人和汽車在斑馬線明顯交會
- [ ] 危險時刻發生在 1.5-2.5 秒之間
- [ ] 汽車速度明顯快於行人
- [ ] 重播功能正常(12秒後重新開始)
- [ ] 物件在等待期間正確隱藏
- [ ] 被找到後停止重播
- [ ] 路徑點位置合理(使用調試模式驗證)
- [ ] 問答題與事件內容匹配

## 常見問題

### Q1: 汽車和行人沒有交會?
**A**: 檢查路徑是否真的交叉。使用 `enableDebug={true}` 查看路徑點,確保有共同的交會區域。

### Q2: 交會時機不對?
**A**: 調整汽車的 `time` 參數。增加延遲讓汽車晚點到,減少延遲讓汽車早點到。

### Q3: 看不出"不禮讓"的感覺?
**A**: 確保汽車速度夠快(11-13),並且沒有在斑馬線前減速。可以考慮增加第二個速度更慢的汽車作為對比。

### Q4: 重播後位置不對?
**A**: 確保 `initialPosition` 和路徑的第一個點完全一致,且設置了 `replayInterval`。

## 性能優化

1. **減少路徑點數量**: 只保留關鍵轉折點
2. **合理的重播間隔**: 12-15秒,避免過於頻繁
3. **適當的 duration**: 確保動作在重播前完成

## 相關文檔

- [REPLAY_FEATURE.md](./REPLAY_FEATURE.md) - 重播功能詳解
- [MOVEMENT_AND_REPEAT.md](./MOVEMENT_AND_REPEAT.md) - 移動和重複機制
- [ANIMATION_EXAMPLES.md](./ANIMATION_EXAMPLES.md) - 動畫配置示例
