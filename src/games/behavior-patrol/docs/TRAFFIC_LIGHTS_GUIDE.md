# 紅綠燈系統使用指南

## 概述

behavior-patrol 的紅綠燈系統支援：
- 場景數據中預設燈號時間表（自動模式）
- 開發者工具手動控制燈號（測試用）
- 靜態裝飾物件（長椅等）

## 定義紅綠燈

在場景數據中添加 `trafficLights` 字段：

```typescript
trafficLights: [
  {
    id: 'light_1',
    name: '北向紅綠燈',
    model: '/src/assets/models/TrafficLight.glb',
    position: [-8, 0, -15],
    rotation: [0, 0, 0],

    lightSchedule: [
      { time: 0, state: TrafficLightState.RED, duration: 15 },
      { time: 15, state: TrafficLightState.GREEN, duration: 12 },
      { time: 27, state: TrafficLightState.YELLOW, duration: 3 },
    ],
    loopSchedule: true,
  }
]
```

## 紅綠燈模型要求

模型必須包含三個獨立網格：
- `RedLight` - 紅燈網格
- `YellowLight` - 黃燈網格
- `GreenLight` - 綠燈網格

如果模型使用不同命名，可配置 `meshNames`：

```typescript
meshNames: {
  red: 'CustomRedName',
  yellow: 'CustomYellowName',
  green: 'CustomGreenName'
}
```

## 協調車輛行為

使用 `WAIT` action 讓車輛等紅燈：

```typescript
actions: [
  // 接近紅綠燈
  { actorId: 'car', type: ActionType.MOVEMENT, path: [...], time: 0 },

  // 等待紅燈
  { actorId: 'car', type: ActionType.WAIT, time: 3, duration: 12 },

  // 綠燈通過
  { actorId: 'car', type: ActionType.MOVEMENT, path: [...], time: 15 },
]
```

## 開發者工具

運行遊戲時，右上角會出現「🚦 紅綠燈控制」按鈕：
- 點擊展開控制面板
- 選擇紅/黃/綠燈立即切換
- 點擊「恢復自動時間表」返回預設模式
- 「全部恢復自動」重置所有紅綠燈

## 添加裝飾物件

使用現有的 `safeObjects` 系統：

```typescript
safeObjects: [
  {
    id: 'bench_1',
    name: '長椅',
    actors: [{
      id: 'bench_actor',
      name: '長椅',
      type: ActorType.OBJECT,
      model: '/src/assets/models/Bench.glb',
      initialPosition: [-25, 0, -20],
    }],
    actions: [],  // 靜態物件無動作
  }
]
```

## 範例場景

參考 `PatrolScenario_WithTrafficLights.ts` 查看完整範例。
