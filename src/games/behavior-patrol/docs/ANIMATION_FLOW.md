# 動畫播放流程文檔

## 📋 動畫系統架構

### 1. 核心組件

```
AnimationController (核心動畫引擎)
    ↓
DangerActorObject (組件層)
    ↓
AnimationAction (動作定義)
```

---

## 🎬 完整播放流程

### 階段 1：載入階段（useEffect）

```typescript
// 1. 載入模型
const gltf = await loader.loadAsync(actor.model);
const clonedScene = SkeletonUtils.clone(gltf.scene);

// 2. 創建動畫控制器
const animController = new AnimationController(clonedScene);

// 3. 載入外部動畫文件
for (const url of actor.animationUrls) {
  const animGltf = await loader.loadAsync(url);
  animController.loadSeparateAnimations(animGltf, clonedScene);
}
```

**關鍵點**：
- 使用 `SkeletonUtils.clone` 複製骨骼結構
- `loadSeparateAnimations` 會重新定位（retarget）動畫到新骨架
- 所有動畫都儲存在 AnimationController 的 actions Map 中

---

### 階段 2：播放觸發（useFrame）

```typescript
useFrame((_, delta) => {
  elapsedTimeRef.current += delta;
  const currentTime = elapsedTimeRef.current;

  // 更新動畫混合器
  animControllerRef.current?.update(delta);

  // 檢查並觸發動畫
  animationActions.forEach((action) => {
    if (currentTime >= action.time &&
        currentTime < action.time + delta) {
      animControllerRef.current.play(action.name, {
        loop: action.loop ? THREE.LoopRepeat : THREE.LoopOnce
      });
    }
  });
});
```

**觸發條件**：
- `currentTime >= action.time` - 時間已到達
- `currentTime < action.time + delta` - 在當前幀範圍內（防止重複觸發）

---

### 階段 3：AnimationController 播放

```typescript
play(name: string, config?: Partial<AnimationConfig>) {
  const action = this.actions.get(name);

  // 1. 應用配置
  action.loop = config.loop;  // LoopRepeat 或 LoopOnce
  action.clampWhenFinished = config.clampWhenFinished;  // 結束後保持最後姿勢

  // 2. 淡出當前動畫
  if (this.currentAction && this.currentAction !== action) {
    this.currentAction.fadeOut(fadeOutDuration);
  }

  // 3. 淡入新動畫
  action.reset();
  action.fadeIn(fadeInDuration);
  action.play();
}
```

**動畫混合**：
- 使用 fadeIn/fadeOut 實現平滑過渡
- reset() 確保從頭開始播放
- 支援 weight、timeScale 等參數

---

## 🔄 循環模式

### 1. 循環播放（LoopRepeat）

```typescript
{
  actorId: 'pedestrian_1',
  type: ActionType.ANIMATION,
  name: 'Walking',
  time: 0,
  loop: true  // ← 循環播放
}
```

**特性**：
- 動畫會一直循環播放
- 適合：走路、跑步、待機動畫

### 2. 播放一次（LoopOnce）

```typescript
{
  actorId: 'car_1',
  type: ActionType.ANIMATION,
  name: 'Door_Opening',
  time: 2,      // ← 2秒後播放
  loop: false   // ← 只播放一次
}
```

**特性**：
- 播放完畢後停止
- 默認回到初始姿勢
- 適合：開門、揮手、跳躍等一次性動作

### 3. 播放一次並保持（LoopOnce + clampWhenFinished）

```typescript
{
  actorId: 'car_1',
  type: ActionType.ANIMATION,
  name: 'Door_Opening',
  time: 2,
  loop: false,
  clampWhenFinished: true  // ← 保持最後姿勢
}
```

**特性**：
- 播放完畢後保持最後一幀
- 不會回到初始姿勢
- 適合：開門後保持開啟狀態

---

## ⏰ 時間控制

### 基本時間參數

```typescript
interface AnimationAction {
  actorId: string;
  type: ActionType.ANIMATION;
  name: string;
  time: number;      // 開始時間（秒）
  duration?: number; // 持續時間（秒）- 可選
  loop?: boolean;    // 是否循環
}
```

### 時間軸示例

```typescript
actions: [
  // t=0: 開始待機動畫（循環）
  { actorId: 'char', type: ActionType.ANIMATION, name: 'Idle', time: 0, loop: true },

  // t=2: 播放揮手動畫（一次）
  { actorId: 'char', type: ActionType.ANIMATION, name: 'Wave', time: 2, loop: false },

  // t=5: 開始走路動畫（循環）
  { actorId: 'char', type: ActionType.ANIMATION, name: 'Walk', time: 5, loop: true }
]
```

**執行流程**：
1. 0秒：開始 Idle 動畫循環
2. 2秒：切換到 Wave 動畫播放一次（約1-2秒）
3. Wave 結束後自動回到 Idle
4. 5秒：切換到 Walk 動畫循環

---

## 🚨 當前問題與限制

### 問題 1：幀率依賴觸發

**問題描述**：
```typescript
if (currentTime >= action.time && currentTime < action.time + delta)
```
- 只在特定幀觸發
- 如果幀率波動，可能錯過觸發窗口

**解決方案**：需要追蹤已播放狀態

### 問題 2：無法控制動畫持續時間

**問題描述**：
- AnimationAction 有 `duration` 參數但未使用
- 無法在指定時間後停止動畫

**解決方案**：需要實現 duration 檢查

### 問題 3：重複播放問題

**問題描述**：
- 沒有記錄哪些動畫已播放
- 可能在不同幀重複觸發

**解決方案**：需要狀態追蹤

---

## 💡 改進建議

### 1. 追蹤已播放動畫

```typescript
const [playedAnimations, setPlayedAnimations] = useState<Set<string>>(new Set());

animationActions.forEach((action) => {
  const actionKey = `${action.actorId}_${action.name}_${action.time}`;

  if (currentTime >= action.time && !playedAnimations.has(actionKey)) {
    animControllerRef.current.play(action.name, {
      loop: action.loop ? THREE.LoopRepeat : THREE.LoopOnce,
      clampWhenFinished: !action.loop  // 非循環動畫保持最後姿勢
    });

    setPlayedAnimations(prev => new Set(prev).add(actionKey));
  }
});
```

### 2. 支援持續時間控制

```typescript
animationActions.forEach((action) => {
  // 開始檢查
  if (currentTime >= action.time && !playedAnimations.has(actionKey)) {
    // 播放動畫...
    setPlayedAnimations(prev => new Set(prev).add(actionKey));
  }

  // 結束檢查
  if (action.duration && currentTime >= action.time + action.duration) {
    animControllerRef.current.stop(action.name);
  }
});
```

### 3. 事件監聽動畫完成

```typescript
// 監聽動畫結束事件
mixer.addEventListener('finished', (e) => {
  console.log(`Animation finished: ${e.action.getClip().name}`);
  // 可以觸發後續動畫或其他邏輯
});
```

---

## 📝 實際使用範例

### 範例 1：行人走路（循環）

```typescript
{
  id: 'pedestrian_1',
  actors: [{
    id: 'ped',
    model: '/models/Male1.glb',
    animationUrls: ['/animations/Male_Walking.glb'],
    initialPosition: [0, 0, 0]
  }],
  actions: [
    {
      actorId: 'ped',
      type: ActionType.ANIMATION,
      name: 'Male_Walking_Animation',
      time: 0,
      loop: true  // 一直循環
    },
    {
      actorId: 'ped',
      type: ActionType.MOVEMENT,
      path: [[0,0,0], [10,0,0]],
      speed: 1.5,
      time: 0
    }
  ]
}
```

### 範例 2：車門開啟（一次）

```typescript
{
  id: 'car_door',
  actors: [{
    id: 'car',
    model: '/models/Car.glb',
    animationUrls: ['/animations/Car_Door_Opening.glb'],
    initialPosition: [11, 0, 43.5]
  }],
  actions: [
    {
      actorId: 'car',
      type: ActionType.ANIMATION,
      name: 'Car_Main2_LeftDoor_Opening_Animation',
      time: 1,      // 1秒後開始
      loop: false,  // 只播放一次
      clampWhenFinished: true  // 保持門開啟狀態
    }
  ]
}
```

### 範例 3：定時播放序列

```typescript
{
  id: 'character_sequence',
  actors: [{
    id: 'char',
    model: '/models/Character.glb',
    animationUrls: [
      '/animations/Idle.glb',
      '/animations/Wave.glb',
      '/animations/Walk.glb'
    ],
    initialPosition: [0, 0, 0]
  }],
  actions: [
    // 0-2秒：待機
    { actorId: 'char', type: ActionType.ANIMATION, name: 'Idle', time: 0, loop: true },

    // 2-4秒：揮手
    { actorId: 'char', type: ActionType.ANIMATION, name: 'Wave', time: 2, loop: false },

    // 4秒後：開始走路
    { actorId: 'char', type: ActionType.ANIMATION, name: 'Walk', time: 4, loop: true },
    { actorId: 'char', type: ActionType.MOVEMENT, path: [[0,0,0], [20,0,0]], speed: 2, time: 4 }
  ]
}
```

---

## 🔍 調試技巧

### 1. 檢查動畫是否載入

```typescript
console.log('Available animations:', animControllerRef.current?.getAnimationNames());
```

### 2. 監控當前播放動畫

```typescript
console.log('Current animation:', animControllerRef.current?.getCurrentAnimationName());
```

### 3. 檢查動畫觸發時間

```typescript
console.log(`[${currentTime.toFixed(2)}s] Triggering animation: ${action.name}`);
```

### 4. 驗證動畫配置

```typescript
const action = mixer.existingAction(clip);
console.log({
  loop: action.loop,
  clampWhenFinished: action.clampWhenFinished,
  isRunning: action.isRunning(),
  time: action.time,
  timeScale: action.timeScale
});
```

---

## 🎯 最佳實踐

1. **動畫命名一致性**
   - 確保 action.name 與動畫文件中的名稱完全一致
   - 使用 getAnimationNames() 查看可用動畫

2. **合理設置時間**
   - 避免多個動畫在同一時間觸發
   - 考慮動畫長度，預留足夠時間

3. **循環動畫使用**
   - 待機、走路、跑步 → loop: true
   - 動作、特效、過場 → loop: false

4. **淡入淡出**
   - 使用 fadeIn/fadeOut 實現平滑過渡
   - 避免動畫突然切換的視覺跳動

5. **性能優化**
   - 不需要的動畫及時停止
   - 避免同時播放過多動畫

---

## 🔗 相關文件

- `AnimationController.ts` - 核心動畫引擎
- `DangerActorObject.tsx` - 組件實現
- `types.ts` - 動作類型定義
- `PatrolScenario_1_New.ts` - 實際使用範例
