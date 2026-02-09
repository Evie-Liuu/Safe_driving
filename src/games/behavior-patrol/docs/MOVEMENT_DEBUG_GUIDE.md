# 點位移動調試指南

## 🐛 問題：移動沒有執行

如果您發現角色的點位移動沒有執行（第 231 行的 `if (activeMovement && ...)` 區塊沒有進入），請按照以下步驟排查。

---

## ✅ 已修復的問題

**問題根源**：舊版本使用單幀時間窗口檢測，容易因幀率波動而錯過觸發
```typescript
// ❌ 舊版本（不穩定）
if (
  currentTime >= action.time &&
  currentTime < action.time + delta  // 只在特定幀觸發
)
```

**解決方案**：改用狀態追蹤
```typescript
// ✅ 新版本（穩定）
if (
  currentTime >= action.time &&
  !startedMovementsRef.current.has(movementKey)  // 狀態追蹤
)
```

---

## 🔍 調試步驟

### 步驟 1：檢查 Console 日誌

在瀏覽器開發者工具 Console 中，應該看到：

```
[DangerActorObject] Starting movement for ped_1 at 0.00s
```

**如果沒有看到這行日誌** → 移動沒有被觸發，繼續步驟 2

**如果看到這行日誌但角色不動** → 移動被觸發但執行有問題，跳到步驟 4

---

### 步驟 2：檢查 MovementAction 配置

確認 action 配置正確：

```typescript
{
  actorId: 'ped_1',           // ✅ 與 actor.id 一致
  type: ActionType.MOVEMENT,  // ✅ 類型正確
  path: [
    [-10, 0, 0],              // ✅ 至少2個點
    [10, 0, 0]
  ],
  speed: 2,                   // ✅ 速度 > 0
  time: 0,                    // ✅ 開始時間
  loop: false
}
```

**常見錯誤**：
- ❌ `actorId` 與 `actor.id` 不匹配
- ❌ `path` 只有1個點（需要至少2個）
- ❌ `speed` 為 0 或未設定
- ❌ `time` 設定錯誤（例如設定為 999）

---

### 步驟 3：添加臨時調試日誌

在 `DangerActorObject.tsx` 的 `useFrame` 開頭添加：

```typescript
useFrame((_, delta) => {
  if (!groupRef.current || found || !isReady || !modelSceneRef.current) return;

  elapsedTimeRef.current += delta;
  const currentTime = elapsedTimeRef.current;

  // ✅ 添加調試日誌
  if (currentTime < 1) {  // 只在前1秒打印
    console.log('[Debug] Current time:', currentTime.toFixed(2));
    console.log('[Debug] Movement actions:', movementActions.length);
    movementActions.forEach((action, idx) => {
      console.log(`[Debug] Action ${idx}:`, {
        time: action.time,
        triggered: startedMovementsRef.current.has(`${action.actorId}_movement_${action.time}`),
        path: action.path?.length
      });
    });
  }

  // ... 繼續原有代碼
});
```

這會顯示：
- 當前時間
- 有多少個移動動作
- 每個動作是否被觸發

---

### 步驟 4：檢查 activeMovement 狀態

在移動處理區塊添加日誌：

```typescript
// Handle active movement
if (activeMovement && activeMovement.path && activeMovement.path.length >= 2) {
  console.log('[Debug] Active movement:', {
    path: activeMovement.path,
    speed: activeMovement.speed,
    currentIndex: currentPathIndexRef.current,
    progress: pathProgressRef.current.toFixed(2),
    position: groupRef.current.position.toArray()
  });

  // ... 原有代碼
}
```

檢查：
- `activeMovement` 是否存在
- `path` 是否正確
- `currentIndex` 和 `progress` 是否更新
- 位置是否改變

---

### 步驟 5：啟用路徑可視化

在場景中啟用 debug 模式：

```typescript
<DangerGroup
  danger={danger}
  onClick={...}
  disabled={...}
  enableDebug={true}  // ✅ 啟用調試
/>
```

會在場景中顯示**黃色球體**標記路徑點，確認：
- 路徑點位置是否正確
- 是否在視野內
- 是否有足夠的點

---

## 🧪 測試場景

使用專門的測試場景：

```typescript
import { patrolScenarioMovementTest } from './data/PatrolScenario_MovementTest';

<BehaviorPatrolGame scenario={patrolScenarioMovementTest} />
```

測試場景包含 5 個測試案例：
1. **簡單移動** - 基本 A→B 移動
2. **多點路徑** - 經過多個點
3. **循環移動** - 來回移動
4. **延遲啟動** - 3 秒後才開始
5. **限時移動** - 5 秒後停止

每個測試都會在 Console 顯示詳細日誌。

---

## 📊 常見問題排查表

| 症狀 | 可能原因 | 解決方案 |
|------|---------|---------|
| 沒有 "Starting movement" 日誌 | 觸發條件不滿足 | 檢查 `time`、`actorId` 配置 |
| 有日誌但角色不動 | `activeMovement` 未設置 | 檢查 `setActiveMovement` 是否執行 |
| 角色移動但方向錯誤 | 路徑點順序問題 | 檢查 `path` 數組順序 |
| 移動速度異常 | `speed` 設置錯誤 | 確認 `speed > 0` |
| 角色跳躍或閃爍 | `initialPosition` 與 `path[0]` 不一致 | 確保起點相同 |
| 移動到一半停止 | 設置了 `duration` | 檢查 `duration` 是否過短 |
| 循環不工作 | `loop: false` | 改為 `loop: true` |
| 角色不轉向 | 路徑點太近 | 增加點之間距離 |

---

## 💡 移動檢查清單

創建移動動作時，確認：

- [ ] `actorId` 與 actor 的 `id` 完全一致
- [ ] `type: ActionType.MOVEMENT`
- [ ] `path` 至少有 2 個點
- [ ] `path[0]` 與 `actor.initialPosition` 一致
- [ ] `speed` > 0
- [ ] `time` 合理（通常 0 表示立即開始）
- [ ] 如需循環，設置 `loop: true`
- [ ] 如需限時，設置 `duration`

---

## 🔧 調試技巧

### 1. 檢查 actions 是否正確過濾

```typescript
console.log('Movement actions:', movementActions);
console.log('For actor:', actor.id);
```

### 2. 檢查 path 計算

```typescript
const start = new THREE.Vector3(...path[currentIndex]);
const end = new THREE.Vector3(...path[nextIndex]);
const distance = start.distanceTo(end);
console.log('Path segment:', { start, end, distance });
```

### 3. 檢查進度更新

```typescript
console.log('Progress:', {
  pathProgress: pathProgressRef.current,
  currentIndex: currentPathIndexRef.current,
  delta,
  speed,
  duration: distance / speed
});
```

### 4. 檢查位置更新

```typescript
console.log('Position update:', {
  from: groupRef.current.position.toArray(),
  to: newPos.toArray()
});
```

---

## 📝 完整調試代碼範例

```typescript
// 在 useFrame 中添加
useFrame((_, delta) => {
  if (!groupRef.current || found || !isReady || !modelSceneRef.current) return;

  elapsedTimeRef.current += delta;
  const currentTime = elapsedTimeRef.current;

  // === 調試區塊開始 ===
  const debugMovement = true;  // 設為 false 關閉調試

  if (debugMovement && movementActions.length > 0) {
    console.group(`[Movement Debug] ${actor.id}`);
    console.log('Current time:', currentTime.toFixed(2));
    console.log('Active movement:', activeMovement?.actorId);
    console.log('Path progress:', pathProgressRef.current.toFixed(2));
    console.log('Current path index:', currentPathIndexRef.current);
    console.log('Position:', groupRef.current.position.toArray());
    console.groupEnd();
  }
  // === 調試區塊結束 ===

  // ... 原有代碼
});
```

---

## ✅ 驗證移動正常工作

如果以下條件都滿足，移動功能正常：

1. ✅ Console 顯示 "Starting movement" 日誌
2. ✅ 角色位置隨時間改變
3. ✅ 角色朝向移動方向
4. ✅ 經過所有路徑點
5. ✅ 循環或停止行為符合預期

---

## 🔗 相關文件

- `DangerActorObject.tsx` - 移動實現代碼
- `types.ts` - MovementAction 類型定義
- `PatrolScenario_MovementTest.ts` - 測試場景
- `MOVEMENT_AND_REPEAT.md` - 移動系統完整說明

---

## 🆘 仍然無法解決？

如果按照上述步驟仍無法解決，請提供：

1. 完整的 MovementAction 配置
2. Console 日誌（包括錯誤和警告）
3. 是否看到 "Starting movement" 日誌
4. 角色的 `initialPosition`
5. 使用的場景（PatrolScenario）

這樣可以更快定位問題！
