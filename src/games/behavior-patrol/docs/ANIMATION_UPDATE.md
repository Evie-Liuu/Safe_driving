# 動畫系統更新總結

## 📅 更新日期
2026-02-10

## 🎯 更新目標
改進動畫播放系統，實現：
1. ✅ 更可靠的動畫觸發機制
2. ✅ 支援定時播放一次功能
3. ✅ 支援播放完畢保持姿勢
4. ✅ 支援動畫持續時間控制

---

## 📦 更新內容

### 1. AnimationAction 類型擴展 (`types.ts`)

**新增屬性**：
```typescript
export interface AnimationAction extends BaseAction {
  type: ActionType.ANIMATION;
  name: string;
  loop?: boolean;                  // 是否循環
  clampWhenFinished?: boolean;     // ✅ 新增：保持最後姿勢
  fadeIn?: number;                 // ✅ 新增：淡入時間
  fadeOut?: number;                // ✅ 新增：淡出時間
  timeScale?: number;              // ✅ 新增：播放速度
}
```

### 2. DangerActorObject 組件改進

#### 改進 1：追蹤已播放動畫

**問題**：舊版本依賴單一幀觸發，可能因幀率波動錯過
```typescript
// ❌ 舊版本
if (currentTime >= action.time && currentTime < action.time + delta)
```

**解決**：使用狀態追蹤
```typescript
// ✅ 新版本
const playedAnimationsRef = useRef<Set<string>>(new Set());

if (currentTime >= action.time && !playedAnimationsRef.current.has(animKey)) {
  // 播放動畫
  playedAnimationsRef.current.add(animKey);
}
```

#### 改進 2：支援完整動畫配置

```typescript
const animConfig: any = {
  loop: action.loop ? THREE.LoopRepeat : THREE.LoopOnce,
  clampWhenFinished: action.clampWhenFinished ?? !action.loop,
};

if (action.fadeIn !== undefined) animConfig.fadeIn = action.fadeIn;
if (action.fadeOut !== undefined) animConfig.fadeOut = action.fadeOut;
if (action.timeScale !== undefined) animConfig.timeScale = action.timeScale;

animControllerRef.current.play(action.name, animConfig);
```

#### 改進 3：支援持續時間控制

```typescript
// 檢查是否應該停止（如果有設定 duration）
if (action.duration && currentTime >= action.time + action.duration) {
  animControllerRef.current.stop(action.name);
}
```

---

## 🎬 動畫播放流程

### 完整流程圖

```
載入階段
   ↓
載入模型 → 創建 AnimationController → 載入動畫文件
   ↓
播放階段（每幀執行）
   ↓
更新時間 → 檢查觸發條件 → 播放動畫 → 持續更新
   ↓                      ↓
檢查 duration            標記已播放
   ↓
達到 duration → 停止動畫
```

### 觸發條件改進

**舊版本（不穩定）**：
```typescript
currentTime >= action.time && currentTime < action.time + delta
```
- ❌ 只在特定幀觸發
- ❌ 幀率波動可能錯過

**新版本（穩定）**：
```typescript
currentTime >= action.time && !playedAnimationsRef.current.has(animKey)
```
- ✅ 只要時間到達就觸發
- ✅ 使用狀態追蹤避免重複
- ✅ 不受幀率影響

---

## 💡 三種播放模式

### 模式 1：循環播放

```typescript
{
  actorId: 'ped_1',
  type: ActionType.ANIMATION,
  name: 'Walking',
  time: 0,
  loop: true  // ✅ 一直循環
}
```

**特點**：
- 持續播放直到切換或停止
- 適合：走路、跑步、待機

---

### 模式 2：播放一次（回到初始姿勢）

```typescript
{
  actorId: 'char_1',
  type: ActionType.ANIMATION,
  name: 'Wave',
  time: 2,
  loop: false,
  clampWhenFinished: false  // ❌ 播放完回到初始
}
```

**特點**：
- 播放一次後停止
- 回到初始姿勢
- 適合：揮手、跳躍

---

### 模式 3：播放一次並保持 ⭐（定時播放一次）

```typescript
{
  actorId: 'car_1',
  type: ActionType.ANIMATION,
  name: 'Door_Opening',
  time: 1,
  loop: false,
  clampWhenFinished: true  // ✅ 保持最後姿勢
}
```

**特點**：
- 播放一次後停止
- **保持最後一幀姿勢**
- 適合：開門、狀態改變

**這就是「定時播放一次」的實現方式！**

---

## 📊 使用對比

### 範例：車門開啟

**舊配置（功能有限）**：
```typescript
behaviors: [
  {
    type: 'animation',
    animation: 'Door_Opening',
    animationLoop: false  // 只有這個選項
  }
]
```

**新配置（功能完整）**：
```typescript
actions: [
  {
    actorId: 'car_1',
    type: ActionType.ANIMATION,
    name: 'Door_Opening',
    time: 1,                      // ✅ 精確時間控制
    loop: false,                  // ✅ 不循環
    clampWhenFinished: true,      // ✅ 保持開啟狀態
    fadeIn: 0.3,                  // ✅ 平滑淡入
    timeScale: 0.8                // ✅ 速度調整
  }
]
```

---

## 🔥 實際使用範例

### 範例 1：行人邊走邊滑手機（循環）

```typescript
{
  id: 'danger-1',
  actors: [{
    id: 'pedestrian_1',
    model: '/models/Male1_CnH_Rigged.glb',
    accessoryNames: ['phone'],
    animationUrls: ['/animations/Male_Walking_Phone.glb'],
    initialPosition: [-92.17, 0.15, -15.64]
  }],
  actions: [
    {
      actorId: 'pedestrian_1',
      type: ActionType.ANIMATION,
      name: 'Male_Walking_Phone_Animation',
      time: 0,
      loop: true  // 持續播放
    },
    {
      actorId: 'pedestrian_1',
      type: ActionType.MOVEMENT,
      path: [[-92.17, 0.15, -15.64], [-71.69, 0.15, -15.25]],
      speed: 1.5,
      time: 0,
      loop: true
    }
  ]
}
```

---

### 範例 2：車門開啟（定時播放一次）⭐

```typescript
{
  id: 'parked_car_door',
  actors: [{
    id: 'parked_car_1',
    model: '/models/Car_Main2_Rigged.glb',
    animationUrls: ['/animations/Car_Main2_LeftDoor_Opening.glb'],
    initialPosition: [11, 0, 43.5],
    initialRotation: [0, Math.PI, 0]
  }],
  actions: [
    {
      actorId: 'parked_car_1',
      type: ActionType.ANIMATION,
      name: 'Car_Main2_LeftDoor_Opening_Animation',
      time: 0.5,                    // 0.5秒後開始
      loop: false,                  // 不循環
      clampWhenFinished: true,      // ✅ 保持開啟狀態
      fadeIn: 0.2                   // 平滑開始
    }
  ]
}
```

**效果**：
- 0.5秒後開始播放開門動畫
- 動畫播放一次（約1-2秒）
- **門保持開啟狀態，不會自動關閉**

---

### 範例 3：動畫序列（多段動畫）

```typescript
{
  id: 'character_sequence',
  actors: [{
    id: 'char_1',
    model: '/models/Character.glb',
    animationUrls: ['/animations/Idle.glb', '/animations/Wave.glb', '/animations/Walk.glb'],
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

    // 3-5秒：揮手
    {
      actorId: 'char_1',
      type: ActionType.ANIMATION,
      name: 'Wave',
      time: 3,
      loop: false,
      duration: 2  // ✅ 2秒後停止
    },

    // 5秒後：走路
    {
      actorId: 'char_1',
      type: ActionType.ANIMATION,
      name: 'Walk',
      time: 5,
      loop: true
    }
  ]
}
```

**時間軸**：
```
0s ──────→ 3s ──→ 5s ────────→
[  Idle  ] [Wave] [  Walk   ]
```

---

## 🎯 關鍵改進對比

| 功能 | 舊版本 | 新版本 |
|------|--------|--------|
| 觸發可靠性 | ❌ 依賴單幀，不穩定 | ✅ 狀態追蹤，穩定 |
| 保持姿勢 | ❌ 不支援 | ✅ clampWhenFinished |
| 持續時間控制 | ❌ 不支援 | ✅ duration 參數 |
| 淡入淡出 | ❌ 固定 | ✅ 可配置 |
| 播放速度 | ❌ 固定 | ✅ timeScale |
| 重複播放問題 | ❌ 可能重複 | ✅ 追蹤避免 |

---

## 🐛 已修復的問題

### 問題 1：幀率波動導致動畫不播放 ✅

**原因**：
```typescript
// 只在特定幀觸發
if (currentTime >= action.time && currentTime < action.time + delta)
```

**修復**：
```typescript
// 只要時間到達且未播放就觸發
if (currentTime >= action.time && !playedAnimationsRef.current.has(animKey))
```

### 問題 2：動畫播放後無法保持狀態 ✅

**原因**：沒有 `clampWhenFinished` 配置

**修復**：新增配置選項
```typescript
clampWhenFinished: action.clampWhenFinished ?? !action.loop
```

### 問題 3：無法控制動畫持續時間 ✅

**原因**：`duration` 參數被忽略

**修復**：實現 duration 檢查
```typescript
if (action.duration && currentTime >= action.time + action.duration) {
  animControllerRef.current.stop(action.name);
}
```

---

## 📚 新增文檔

1. **ANIMATION_FLOW.md** ✅
   - 完整的動畫播放流程
   - 循環模式說明
   - 問題分析與解決方案

2. **ANIMATION_EXAMPLES.md** ✅
   - 實際使用範例
   - 三種播放模式詳解
   - 場景應用案例

3. **ANIMATION_UPDATE.md** ✅
   - 更新總結（本文件）
   - 改進對比
   - 使用指南

---

## 🧪 測試建議

### 功能測試

- [ ] 循環動畫正常播放
- [ ] 一次性動畫正確停止
- [ ] clampWhenFinished 保持姿勢
- [ ] duration 正確停止動畫
- [ ] fadeIn/fadeOut 平滑過渡
- [ ] timeScale 速度調整正常

### 穩定性測試

- [ ] 低幀率下動畫仍然觸發
- [ ] 不會重複播放相同動畫
- [ ] 多個動畫序列正確執行
- [ ] 動畫切換無異常

### 邊界測試

- [ ] time = 0 立即播放
- [ ] duration = 0 立即停止
- [ ] 動畫名稱不存在的處理
- [ ] 快速切換場景的清理

---

## 💻 調試工具

### 查看可用動畫
```typescript
console.log(animControllerRef.current?.getAnimationNames());
```

### 查看當前播放
```typescript
console.log(animControllerRef.current?.getCurrentAnimationName());
```

### 追蹤播放狀態
```typescript
console.log('[Animation] Played:', Array.from(playedAnimationsRef.current));
```

---

## ✅ 完成狀態

- ✅ 類型定義擴展（AnimationAction）
- ✅ 組件邏輯改進（DangerActorObject）
- ✅ 穩定的觸發機制
- ✅ 定時播放一次功能
- ✅ 保持姿勢功能
- ✅ 持續時間控制
- ✅ 完整文檔

**動畫系統更新完成！** 🎉

---

## 🚀 下一步

建議的後續改進：

1. **事件監聽** - 監聽動畫完成事件
2. **動畫混合** - 支援多個動畫同時播放
3. **IK 系統** - 反向動力學支援
4. **動畫狀態機** - 更複雜的動畫邏輯

---

## 🔗 相關文件

- `types.ts` - AnimationAction 定義
- `DangerActorObject.tsx` - 組件實現
- `AnimationController.ts` - 核心引擎
- `ANIMATION_FLOW.md` - 流程文檔
- `ANIMATION_EXAMPLES.md` - 使用範例
