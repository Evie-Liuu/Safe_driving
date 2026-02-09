# 動畫使用範例

## 🎯 概述

本文檔提供各種動畫使用場景的實際範例，展示如何配置不同類型的動畫效果。

---

## 📚 基本範例

### 1. 循環動畫（持續播放）

適用於：走路、跑步、待機、騎車等持續性動作

```typescript
{
  id: 'walking_pedestrian',
  actors: [{
    id: 'ped_1',
    name: '行人',
    type: ActorType.PEDESTRIAN,
    model: '/models/Male1.glb',
    animationUrls: ['/animations/Male_Walking.glb'],
    initialPosition: [0, 0, 0]
  }],
  actions: [
    {
      actorId: 'ped_1',
      type: ActionType.ANIMATION,
      name: 'Male_Walking_Animation',
      time: 0,
      loop: true  // ✅ 循環播放
    }
  ]
}
```

**特點**：
- ✅ 動畫會一直循環
- ✅ 不會停止，直到組件卸載或切換到其他動畫
- ✅ 適合配合 MOVEMENT action 使用

---

### 2. 播放一次（自動回到初始姿勢）

適用於：揮手、跳躍、短暫動作

```typescript
{
  actorId: 'char_1',
  type: ActionType.ANIMATION,
  name: 'Wave',
  time: 2,        // 2秒後播放
  loop: false,    // ❌ 不循環
  clampWhenFinished: false  // ❌ 播放完畢回到初始姿勢
}
```

**特點**：
- ✅ 播放一次後停止
- ✅ 自動回到初始姿勢
- ✅ 可以配合其他動畫序列使用

---

### 3. 播放一次並保持（定時播放一次）⭐

**最常用**：開門、舉手、停止姿勢等需要保持的動作

```typescript
{
  actorId: 'car_1',
  type: ActionType.ANIMATION,
  name: 'Car_Door_Opening',
  time: 1,        // 1秒後開始
  loop: false,    // ❌ 不循環
  clampWhenFinished: true  // ✅ 保持最後姿勢（門保持開啟）
}
```

**特點**：
- ✅ 播放一次後停止
- ✅ **保持最後一幀姿勢**（例如門保持開啟狀態）
- ✅ 非常適合「狀態改變」類型的動畫

**完整範例（車門開啟）**：
```typescript
{
  id: 'parked_car_door',
  actors: [
    {
      id: 'car_1',
      name: '停放車輛',
      type: ActorType.VEHICLE,
      model: '/models/Car_Main2_Rigged.glb',
      initialPosition: [11, 0, 43.5],
      initialRotation: [0, Math.PI, 0],
      animationUrls: ['/animations/Car_Main2_LeftDoor_Opening.glb']
    }
  ],
  actions: [
    {
      actorId: 'car_1',
      type: ActionType.ANIMATION,
      name: 'Car_Main2_LeftDoor_Opening_Animation',
      time: 0.5,    // 0.5秒後開門
      loop: false,
      clampWhenFinished: true  // ✅ 門保持開啟
    }
  ]
}
```

---

## 🎬 進階範例

### 4. 動畫序列（多個動畫按時間順序播放）

```typescript
{
  id: 'character_sequence',
  actors: [{
    id: 'char_1',
    model: '/models/Character.glb',
    animationUrls: [
      '/animations/Idle.glb',
      '/animations/Wave.glb',
      '/animations/Walk.glb'
    ],
    initialPosition: [0, 0, 0]
  }],
  actions: [
    // 0-3秒：待機
    {
      actorId: 'char_1',
      type: ActionType.ANIMATION,
      name: 'Idle',
      time: 0,
      loop: true
    },

    // 3秒：揮手（約2秒）
    {
      actorId: 'char_1',
      type: ActionType.ANIMATION,
      name: 'Wave',
      time: 3,
      loop: false,
      duration: 2  // 2秒後停止
    },

    // 5秒後：開始走路
    {
      actorId: 'char_1',
      type: ActionType.ANIMATION,
      name: 'Walk',
      time: 5,
      loop: true
    },
    {
      actorId: 'char_1',
      type: ActionType.MOVEMENT,
      path: [[0,0,0], [20,0,0]],
      speed: 2,
      time: 5
    }
  ]
}
```

**時間軸**：
```
0s ──────→ 3s ──→ 5s ────────→
[  Idle  ] [Wave] [  Walk   ]
           (2秒)
```

---

### 5. 淡入淡出效果

實現平滑的動畫過渡：

```typescript
{
  actorId: 'char_1',
  type: ActionType.ANIMATION,
  name: 'Run',
  time: 5,
  loop: true,
  fadeIn: 0.5,   // 0.5秒淡入
  fadeOut: 0.3   // 切換時0.3秒淡出
}
```

**效果**：
- 動畫不會突然開始/結束
- 過渡更加自然流暢

---

### 6. 調整播放速度

```typescript
{
  actorId: 'ped_1',
  type: ActionType.ANIMATION,
  name: 'Walking',
  time: 0,
  loop: true,
  timeScale: 1.5  // 1.5倍速播放（更快）
}
```

**常用速度**：
- `0.5` - 慢動作（50%）
- `1.0` - 正常速度
- `1.5` - 加快（150%）
- `2.0` - 兩倍速

---

### 7. 定時播放並在指定時間後停止

```typescript
{
  actorId: 'hazard_light',
  type: ActionType.ANIMATION,
  name: 'Hazard_Blinking',
  time: 0,        // 立即開始
  duration: 5,    // 持續5秒
  loop: true      // 在5秒內循環播放
}
```

**說明**：
- 動畫會循環播放
- 5秒後自動停止
- 適合有時間限制的效果（警示燈、閃爍等）

---

## 🚗 實際場景範例

### 場景 1：公車停靠站

```typescript
{
  id: 'bus_stop',
  actors: [{
    id: 'bus_1',
    type: ActorType.VEHICLE,
    model: '/models/Bus_Rigged.glb',
    animationUrls: [
      '/animations/Bus_Moving.glb',
      '/animations/Bus_Door_Opening.glb'
    ],
    initialPosition: [50, 0, 10]
  }],
  actions: [
    // 一開始：公車移動動畫
    {
      actorId: 'bus_1',
      type: ActionType.ANIMATION,
      name: 'Bus_Moving_Animation',
      time: 0,
      loop: true
    },
    {
      actorId: 'bus_1',
      type: ActionType.MOVEMENT,
      path: [[50,0,10], [20,0,10], [10,0,10]],
      speed: 8,
      time: 0,
      duration: 5  // 5秒後停止移動
    },

    // 5秒後：停止移動動畫
    {
      actorId: 'bus_1',
      type: ActionType.ANIMATION,
      name: 'Bus_Moving_Animation',
      time: 5,
      loop: false,
      duration: 0  // 立即停止
    },

    // 5.5秒：開門
    {
      actorId: 'bus_1',
      type: ActionType.ANIMATION,
      name: 'Bus_Door_Opening_Animation',
      time: 5.5,
      loop: false,
      clampWhenFinished: true  // 門保持開啟
    }
  ]
}
```

---

### 場景 2：自行車 + 騎士同步動畫

```typescript
{
  id: 'bicycle_rider',
  actors: [
    {
      id: 'bicycle_1',
      type: ActorType.BICYCLE,
      model: '/models/Bicycle1.glb',
      animationUrls: ['/animations/Bicycle_Moving.glb'],
      initialPosition: [5, 0, 30]
    },
    {
      id: 'rider_1',
      type: ActorType.PEDESTRIAN,
      model: '/models/Male1.glb',
      animationUrls: ['/animations/Male_Riding_Bicycle.glb'],
      initialPosition: [5, 0, 30]
    }
  ],
  actions: [
    // 自行車動畫
    {
      actorId: 'bicycle_1',
      type: ActionType.ANIMATION,
      name: 'Bicycle_Moving_Animation',
      time: 0,
      loop: true
    },
    {
      actorId: 'bicycle_1',
      type: ActionType.MOVEMENT,
      path: [[5,0,30], [10,0,45], [7,0,60]],
      speed: 5,
      time: 0
    },

    // 騎士動畫（同步）
    {
      actorId: 'rider_1',
      type: ActionType.ANIMATION,
      name: 'Male_Riding_Bicycle_Animation',
      time: 0,
      loop: true
    },
    {
      actorId: 'rider_1',
      type: ActionType.MOVEMENT,
      path: [[5,0,30], [10,0,45], [7,0,60]],  // ✅ 相同路徑
      speed: 5,  // ✅ 相同速度
      time: 0
    }
  ]
}
```

---

### 場景 3：行人使用手機

```typescript
{
  id: 'phone_user',
  actors: [{
    id: 'ped_1',
    type: ActorType.PEDESTRIAN,
    model: '/models/Male1_CnH_Rigged.glb',
    accessoryNames: ['phone'],  // ✅ 顯示手機配件
    animationUrls: ['/animations/Male_Walking_Phone.glb'],
    initialPosition: [-92, 0.15, -15]
  }],
  actions: [
    {
      actorId: 'ped_1',
      type: ActionType.ANIMATION,
      name: 'Male_Walking_Phone_Animation',
      time: 0,
      loop: true,
      timeScale: 0.9  // 稍微慢一點（分心）
    },
    {
      actorId: 'ped_1',
      type: ActionType.MOVEMENT,
      path: [[-92,0.15,-15], [-82,0.15,-15], [-72,0.15,-15]],
      speed: 1.2,  // 走得較慢
      time: 0,
      loop: true
    }
  ]
}
```

---

## 🎨 特殊效果範例

### 範例 1：漸進加速動畫

```typescript
{
  id: 'accelerating_car',
  actors: [{
    id: 'car_1',
    model: '/models/Car.glb',
    animationUrls: ['/animations/Car_Wheels.glb'],
    initialPosition: [0, 0, 0]
  }],
  actions: [
    // 0-2秒：慢速
    {
      actorId: 'car_1',
      type: ActionType.ANIMATION,
      name: 'Wheel_Rotation',
      time: 0,
      loop: true,
      timeScale: 0.5,
      duration: 2
    },

    // 2-4秒：正常速度
    {
      actorId: 'car_1',
      type: ActionType.ANIMATION,
      name: 'Wheel_Rotation',
      time: 2,
      loop: true,
      timeScale: 1.0,
      duration: 2
    },

    // 4秒後：快速
    {
      actorId: 'car_1',
      type: ActionType.ANIMATION,
      name: 'Wheel_Rotation',
      time: 4,
      loop: true,
      timeScale: 2.0
    }
  ]
}
```

---

### 範例 2：警示燈閃爍效果

```typescript
{
  id: 'hazard_vehicle',
  actors: [{
    id: 'car_1',
    model: '/models/Car.glb',
    initialPosition: [10, 0, 50]
  }],
  actions: [
    // 危險警示燈（如果有動畫）
    {
      actorId: 'car_1',
      type: ActionType.ANIMATION,
      name: 'Hazard_Light_Blinking',
      time: 0,
      loop: true,
      duration: 8  // 閃爍8秒
    },

    // 或使用 LIGHT action（如果支援）
    {
      actorId: 'car_1',
      type: ActionType.LIGHT,
      lightType: 'hazard',
      enabled: true,
      blinkRate: 2,
      time: 0,
      duration: 8
    }
  ]
}
```

---

## 🔧 調試技巧

### 檢查動畫是否正確載入

在瀏覽器 Console 中：

```typescript
// 檢查可用動畫列表
console.log(animControllerRef.current?.getAnimationNames());

// 檢查當前播放動畫
console.log(animControllerRef.current?.getCurrentAnimationName());
```

### 常見問題排查

**問題 1：動畫不播放**
```typescript
// 檢查點：
1. animationUrls 是否正確？
2. action.name 與動畫文件中的名稱是否一致？
3. action.time 是否已到達？
4. 檢查 Console 是否有錯誤訊息
```

**問題 2：動畫名稱不匹配**
```typescript
// 使用 getAnimationNames() 查看實際名稱
const names = animControllerRef.current?.getAnimationNames();
console.log('Available:', names);
// 然後使用正確的名稱
```

**問題 3：動畫播放但看不到**
```typescript
// 檢查點：
1. 模型是否載入成功？
2. 骨骼結構是否正確？
3. 動畫是否與模型匹配？
4. timeScale 是否設置為 0？
```

---

## 📝 配置檢查清單

創建動畫動作時，確認：

- [ ] `actorId` 正確對應 actor
- [ ] `name` 與動畫文件中的名稱一致
- [ ] `time` 設置合理（秒）
- [ ] `loop` 根據需求設置（循環 vs 一次）
- [ ] `clampWhenFinished` 用於「保持姿勢」場景
- [ ] `duration` 用於「定時停止」場景
- [ ] `fadeIn/fadeOut` 用於平滑過渡
- [ ] `timeScale` 用於速度調整

---

## 🎯 最佳實踐

1. **命名一致性**
   - 使用清晰的動畫命名
   - 確保名稱與文件一致

2. **時間規劃**
   - 預留足夠時間給每個動畫
   - 避免時間重疊導致衝突

3. **循環使用**
   - 持續動作 → `loop: true`
   - 一次性動作 → `loop: false`
   - 保持狀態 → `clampWhenFinished: true`

4. **性能優化**
   - 使用 `duration` 停止不需要的動畫
   - 避免同時播放過多動畫

5. **測試驗證**
   - 使用 `enableDebug={true}` 查看路徑
   - 檢查 Console 日誌確認觸發
   - 測試不同幀率下的表現

---

## 🔗 相關文檔

- `ANIMATION_FLOW.md` - 完整動畫流程
- `types.ts` - AnimationAction 類型定義
- `AnimationController.ts` - 核心動畫引擎
- `DangerActorObject.tsx` - 組件實現
