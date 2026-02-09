# 重複播放功能實現總結

## 📅 實現日期
2026-02-10

## 🎯 實現目標

實現動畫的定時重複播放功能，允許動畫在固定時間間隔後重新播放，支援無限重複或指定次數重複。

---

## ✅ 已完成的更新

### 1. 類型定義擴展 (`types.ts`)

新增兩個參數到 `AnimationAction` 介面：

```typescript
export interface AnimationAction extends BaseAction {
  type: ActionType.ANIMATION;
  name: string;
  loop?: boolean;
  clampWhenFinished?: boolean;
  fadeIn?: number;
  fadeOut?: number;
  timeScale?: number;
  repeatInterval?: number; // ✅ 新增：重複播放間隔（秒）
  repeatCount?: number;    // ✅ 新增：重複次數（undefined = 無限）
}
```

**參數說明**：
- `repeatInterval`: 動畫播放完畢後等待的秒數，然後重新播放
- `repeatCount`: 總共播放幾次（不設定 = 無限重複）

---

### 2. 組件實現 (`DangerActorObject.tsx`)

#### 新增狀態追蹤

```typescript
// 追蹤重複播放狀態
const repeatCountRef = useRef<Map<string, number>>(new Map()); // 記錄每個動畫的播放次數
const lastPlayTimeRef = useRef<Map<string, number>>(new Map()); // 記錄每個動畫最後播放時間
```

#### 更新播放邏輯

```typescript
animationActions.forEach((action) => {
  const animKey = `${action.name}_${action.time}`;
  const playCount = repeatCountRef.current.get(animKey) || 0;
  const lastPlayTime = lastPlayTimeRef.current.get(animKey) || 0;

  // 檢查是否應該播放（首次播放或重複播放）
  const shouldPlayFirst = currentTime >= action.time && playCount === 0;
  const shouldRepeat =
    action.repeatInterval &&
    playCount > 0 &&
    currentTime >= lastPlayTime + action.repeatInterval &&
    (!action.repeatCount || playCount < action.repeatCount);

  const shouldPlay = shouldPlayFirst || shouldRepeat;

  if (shouldPlay && animControllerRef.current) {
    // 播放動畫
    animControllerRef.current.play(action.name, animConfig);

    // 更新追蹤狀態
    repeatCountRef.current.set(animKey, playCount + 1);
    lastPlayTimeRef.current.set(animKey, currentTime);
  }
});
```

#### 清理邏輯

```typescript
// Cleanup
return () => {
  playedAnimationsRef.current.clear();
  repeatCountRef.current.clear(); // ✅ 清空重複計數
  lastPlayTimeRef.current.clear(); // ✅ 清空時間記錄
  // ... 其他清理
};
```

---

## 📖 使用範例

### 範例 1：無限重複（警示燈）

```typescript
{
  actorId: 'car_1',
  type: ActionType.ANIMATION,
  name: 'Hazard_Light_Blink',
  time: 0,
  loop: false,              // 單次播放動畫
  duration: 1,              // 動畫持續1秒
  repeatInterval: 5,        // ✅ 每5秒重複一次
  clampWhenFinished: false  // 播放完回到初始
}
```

**時間軸**：
```
0s     1s   5s     6s   10s    11s   15s    16s
[Blink]    [Blink]    [Blink]    [Blink]
  ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
播放  等待  播放  等待  播放  等待  播放  等待  ...（無限）
```

---

### 範例 2：重複指定次數（揮手）

```typescript
{
  actorId: 'char_1',
  type: ActionType.ANIMATION,
  name: 'Wave',
  time: 0,
  loop: false,
  duration: 2,          // 每次揮手2秒
  repeatInterval: 4,    // 每4秒重複
  repeatCount: 3        // ✅ 只重複3次
}
```

**時間軸**：
```
0s  2s 4s  6s 8s  10s
[Wave] [Wave] [Wave]
  ↓    ↓    ↓
 1st  2nd  3rd (停止)
```

---

### 範例 3：播放一次不重複（開門）

```typescript
{
  actorId: 'door_1',
  type: ActionType.ANIMATION,
  name: 'Door_Opening',
  time: 1,
  loop: false,
  clampWhenFinished: true,  // 保持開啟
  // 不設置 repeatInterval - 只播放一次
}
```

---

## 🔍 工作原理

### 觸發邏輯流程圖

```
每幀更新 (useFrame)
    ↓
遍歷所有動畫 actions
    ↓
獲取播放計數和最後播放時間
    ↓
判斷是否應該播放？
    ├─ 首次播放？currentTime >= time && playCount === 0
    └─ 重複播放？
        ├─ 有設定 repeatInterval？
        ├─ 距離上次播放已過 repeatInterval？
        └─ 未超過 repeatCount 限制？
    ↓
是 → 播放動畫
    ├─ 更新 repeatCountRef (playCount + 1)
    ├─ 更新 lastPlayTimeRef (currentTime)
    └─ 記錄到 playedAnimationsRef
```

### 關鍵檢查條件

1. **首次播放**：
   ```typescript
   currentTime >= action.time && playCount === 0
   ```

2. **重複播放**：
   ```typescript
   action.repeatInterval &&                              // 有設定間隔
   playCount > 0 &&                                      // 已播放過
   currentTime >= lastPlayTime + action.repeatInterval &&// 時間已到
   (!action.repeatCount || playCount < action.repeatCount)// 未超過次數
   ```

---

## 🎨 參數組合效果對比

| 參數組合 | 效果 | 適用場景 |
|---------|------|---------|
| `loop: true` | 連續循環，無間隔 | 走路、跑步、待機 |
| `loop: false` | 播放一次後停止 | 揮手、跳躍 |
| `loop: false` + `clampWhenFinished: true` | 播放一次並保持姿勢 | 開門、停止動作 |
| `loop: false` + `repeatInterval: 5` | 每5秒播放一次（無限） | 警示燈、週期性動作 |
| `loop: false` + `repeatInterval: 5` + `repeatCount: 3` | 每5秒播放一次，共3次 | 有限次數的提醒 |
| `loop: true` + `duration: 10` | 循環播放10秒後停止 | 限時效果 |

---

## 📝 最佳實踐

### 1. 選擇正確的模式

**持續性動作** → 使用 `loop: true`
```typescript
{
  name: 'Walking',
  loop: true,  // 一直循環
  // 無 repeatInterval
}
```

**間歇性動作** → 使用 `repeatInterval`
```typescript
{
  name: 'Wave',
  loop: false,
  repeatInterval: 5,  // 每5秒重複
}
```

**一次性動作** → 不設 loop 和 repeatInterval
```typescript
{
  name: 'Door_Opening',
  loop: false,
  clampWhenFinished: true,  // 保持姿勢
}
```

### 2. 注意時間規劃

確保 `duration` 小於 `repeatInterval`：
```typescript
{
  duration: 2,        // 動畫持續2秒
  repeatInterval: 5,  // ✅ 每5秒重複（留3秒間隔）
}
```

❌ 錯誤配置：
```typescript
{
  duration: 6,        // 動畫持續6秒
  repeatInterval: 5,  // ❌ 間隔太短，動畫還沒播完就要重複
}
```

### 3. 善用 clampWhenFinished

如果希望重複播放時回到初始姿勢：
```typescript
{
  repeatInterval: 5,
  clampWhenFinished: false,  // ✅ 每次播放完回到初始
}
```

如果只播放一次且保持最後姿勢：
```typescript
{
  clampWhenFinished: true,  // ✅ 保持最後姿勢
  // 不設 repeatInterval
}
```

---

## 🐛 調試技巧

### 查看播放次數

```typescript
console.log('Play counts:', Array.from(repeatCountRef.current.entries()));
// 輸出: [['Wave_0', 3], ['Blink_0', 10], ...]
```

### 查看最後播放時間

```typescript
console.log('Last play times:', Array.from(lastPlayTimeRef.current.entries()));
// 輸出: [['Wave_0', 8.5], ['Blink_0', 15.2], ...]
```

### 啟用詳細日誌

組件已內建日誌，會顯示：
```
[DangerActorObject] Starting animation: Wave for ped_1 at 0.00s (play #1)
[DangerActorObject] Repeating animation: Wave for ped_1 at 4.00s (play #2)
[DangerActorObject] Repeating animation: Wave for ped_1 at 8.00s (play #3)
```

---

## 📦 測試場景

已創建測試場景檔案：`PatrolScenario_RepeatExample.ts`

包含三個範例：
1. **警示車輛** - 無限重複的警示燈（repeatInterval: 5）
2. **揮手行人** - 重複3次的揮手動畫（repeatCount: 3）
3. **開門車輛** - 只播放一次的開門動畫（無 repeatInterval）

### 使用測試場景

```typescript
import { patrolScenarioRepeatExample } from './data/PatrolScenario_RepeatExample';

// 在遊戲中使用
<BehaviorPatrolGame scenario={patrolScenarioRepeatExample} />
```

---

## ✅ 完成檢查清單

- ✅ 類型定義更新（repeatInterval, repeatCount）
- ✅ 追蹤狀態 refs 實現（repeatCountRef, lastPlayTimeRef）
- ✅ 首次播放邏輯
- ✅ 重複播放邏輯
- ✅ 次數限制檢查
- ✅ 清理邏輯
- ✅ 詳細日誌輸出
- ✅ 範例場景創建
- ✅ 文檔完整

---

## 🔗 相關文檔

- `MOVEMENT_AND_REPEAT.md` - 完整的移動和重複播放說明
- `ANIMATION_UPDATE.md` - 動畫系統更新總結
- `ANIMATION_EXAMPLES.md` - 動畫使用範例
- `types.ts` - AnimationAction 類型定義
- `DangerActorObject.tsx` - 組件實現

---

## 🎉 總結

重複播放功能已完全實現！現在可以：

- ✅ 設定動畫在固定間隔重複播放
- ✅ 限制重複次數或無限重複
- ✅ 與現有的 loop、duration、clampWhenFinished 完美配合
- ✅ 靈活控制各種動畫效果

**使用建議**：
- 警示燈、閃爍效果 → `repeatInterval` + 無限重複
- 週期性動作（揮手、點頭）→ `repeatInterval` + `repeatCount`
- 持續動作（走路、跑步）→ `loop: true`
- 一次性動作（開門、停止）→ 無 loop、無 repeatInterval
