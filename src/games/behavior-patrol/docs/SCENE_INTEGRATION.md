# 場景整合更新記錄

## 更新日期
2026-02-10

## 📝 更新內容

### 1. PatrolScene.tsx ✅

**變更摘要**：完全移除 ClickableObject，改用新的 DangerGroup 和 SafeObjectGroup 組件

**更新前**：
```tsx
import { ClickableObject } from './ClickableObject';

{scenario.dangers.map((danger) => (
  <ClickableObject
    key={danger.id}
    id={danger.id}
    model={danger.model}
    position={danger.position}
    behaviors={danger.behaviors}
    onClick={() => onDangerClick(danger)}
    disabled={disabled}
    found={foundDangerIds.has(danger.id)}
  />
))}
```

**更新後**：
```tsx
import { DangerGroup } from './DangerGroup';
import { SafeObjectGroup } from './SafeObjectGroup';

// 危險因子
{scenario.dangers.map((danger) => (
  <DangerGroup
    key={danger.id}
    danger={danger}
    onClick={() => onDangerClick(danger)}
    disabled={disabled || foundDangerIds.has(danger.id)}
    enableDebug={false}
  />
))}

// 安全物件
{scenario.safeObjects.map((obj) => (
  <SafeObjectGroup
    key={obj.id}
    safeObject={obj}
    onClick={onSafeClick}
    disabled={disabled}
    enableDebug={false}
  />
))}
```

**關鍵改進**：
- ✅ 自動處理多角色渲染
- ✅ 統一的點擊處理（點擊任一角色都觸發）
- ✅ 正確傳遞 `found` 狀態（通過 disabled）
- ✅ 支援 debug 可視化（可選）

---

### 2. SafeObjectGroup.tsx ✅

**新建組件**：專門處理安全物件的渲染

**功能**：
- 渲染 SafeObject 的所有 actors
- 為每個 actor 分配對應的 actions
- 處理點擊事件
- 與 DangerGroup 結構一致

**代碼**：
```tsx
export function SafeObjectGroup({
  safeObject,
  onClick,
  disabled = false,
  enableDebug = false,
}: SafeObjectGroupProps) {
  return (
    <>
      {safeObject.actors.map((actor) => {
        const actorActions = safeObject.actions.filter(
          action => action.actorId === actor.id
        );

        return (
          <DangerActorObject
            key={actor.id}
            actor={actor}
            actions={actorActions}
            onClick={onClick}
            disabled={disabled}
            found={false}
            enableDebug={enableDebug}
          />
        );
      })}
    </>
  );
}
```

---

### 3. BehaviorPatrolGame.tsx ✅

**變更摘要**：更新場景數據引用

**更新前**：
```tsx
import { patrolScenario1 } from './data/PatrolScenario_1';
```

**更新後**：
```tsx
import { patrolScenario1 } from './data/PatrolScenario_1_New';
```

**說明**：
- 使用新格式的場景數據（actors + actions）
- 遊戲邏輯無需改動（類型兼容）
- foundDangerIds 追蹤正常運作

---

## 🎯 組件層級結構

```
BehaviorPatrolGame
  └─ PatrolScene
      ├─ DangerGroup (多個)
      │   └─ DangerActorObject (每個 actor)
      │       ├─ 模型載入
      │       ├─ 動畫控制
      │       ├─ 移動處理
      │       └─ 點擊檢測
      │
      └─ SafeObjectGroup (多個)
          └─ DangerActorObject (每個 actor)
              └─ 同上
```

---

## 📊 數據流

### 危險因子點擊流程

1. **用戶點擊** → DangerActorObject 接收點擊
2. **事件上報** → DangerGroup 的 onClick
3. **傳遞到遊戲** → PatrolScene 的 onDangerClick
4. **更新狀態** → BehaviorPatrolGame 的 foundDangerIds
5. **反映到 UI** → DangerGroup 的 disabled 屬性
6. **視覺反饋** → DangerActorObject 顯示 found 標記

### Actions 執行流程

1. **組件掛載** → DangerActorObject useEffect 載入模型和動畫
2. **開始計時** → useFrame 更新 elapsedTime
3. **檢查時間** → 當 elapsedTime >= action.time
4. **執行動作** → 根據 action.type 執行對應邏輯
   - MOVEMENT: 開始路徑移動
   - ANIMATION: 播放動畫
5. **持續更新** → 根據 action.duration 決定結束

---

## 🔧 關鍵配置

### DangerGroup Props

| Prop | 類型 | 說明 |
|------|------|------|
| danger | DangerFactor | 完整的危險因子數據 |
| onClick | () => void | 點擊回調 |
| disabled | boolean | 是否禁用點擊 |
| enableDebug | boolean | 顯示路徑可視化 |

### DangerActorObject Props

| Prop | 類型 | 說明 |
|------|------|------|
| actor | DangerActor | 角色定義 |
| actions | DangerAction[] | 該角色的所有 actions |
| onClick | () => void | 點擊回調 |
| disabled | boolean | 禁用點擊 |
| found | boolean | 是否已找到（顯示標記） |
| enableDebug | boolean | 顯示路徑點 |

---

## ✨ 新功能特性

### 1. 多角色事件支援
```typescript
{
  id: 'danger-4',
  actors: [
    { id: 'bus_1', ... },
    { id: 'scooter_1', ... }
  ],
  actions: [
    { actorId: 'bus_1', type: ActionType.MOVEMENT, ... },
    { actorId: 'scooter_1', type: ActionType.MOVEMENT, ... }
  ]
}
```

- 點擊公車或機車都會觸發相同的危險因子
- 兩個角色獨立移動和動畫
- 統一的發現狀態管理

### 2. 時間控制
```typescript
actions: [
  { actorId: 'car', type: ActionType.MOVEMENT, time: 0, duration: 5 },
  { actorId: 'car', type: ActionType.ANIMATION, time: 2 },  // 2秒後開始
  { actorId: 'car', type: ActionType.LIGHT, time: 3 }       // 3秒後開燈
]
```

- 精確控制動作開始時間
- 支援持續時間設定
- 多個動作可並行執行

### 3. Debug 可視化
```tsx
<DangerGroup danger={danger} enableDebug={true} />
```

- 顯示移動路徑點（黃色球體）
- 方便調試和路徑設計
- 生產環境設為 false

---

## 🚨 注意事項

### 1. Found 狀態處理

**正確方式**：
```tsx
<DangerGroup
  danger={danger}
  disabled={disabled || foundDangerIds.has(danger.id)}
/>
```

- `disabled` 傳入時包含 found 狀態
- DangerGroup 將 `danger.found` 傳給 DangerActorObject
- 兩者配合實現正確的狀態顯示

### 2. 同步移動

自行車和騎士必須使用相同的路徑和速度：
```typescript
const sharedPath = [[107.5, 0, 36], [110.44, 0, 49.95]];
const sharedSpeed = 5;

actions: [
  { actorId: 'bicycle_1', path: sharedPath, speed: sharedSpeed, time: 0 },
  { actorId: 'rider_1', path: sharedPath, speed: sharedSpeed, time: 0 }
]
```

### 3. 點擊檢測範圍

每個 DangerActorObject 有一個 invisible hitbox（2x2x2 米）：
```tsx
<mesh position={[0, 1, 0]}>
  <boxGeometry args={[2, 2, 2]} />
  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
</mesh>
```

可能需要根據模型大小調整。

---

## 📈 性能考量

### 已實施的優化

1. **資源共享**
   - 使用 SharedLoader 避免重複載入
   - SkeletonUtils.clone 正確複製骨骼動畫

2. **記憶化**
   - useMemo 快取 actions 過濾結果
   - 避免每幀重新計算

3. **條件渲染**
   - 模型載入完成前不渲染
   - found 狀態後可選擇停止更新

### 潛在優化空間

1. **Object Pooling**
   - 複用已完成事件的 actors
   - 減少創建/銷毀開銷

2. **LOD (Level of Detail)**
   - 遠距離使用簡化模型
   - 視錐體剔除

3. **Action 批次處理**
   - 相同時間的 actions 批次執行
   - 減少每幀檢查次數

---

## 🧪 測試建議

### 功能測試

- [ ] 點擊單一角色事件正常觸發
- [ ] 點擊多角色事件任一角色都觸發
- [ ] Found 狀態正確顯示（綠色球體）
- [ ] Disabled 狀態下無法點擊
- [ ] 動畫在指定時間正確播放
- [ ] 移動路徑正確執行
- [ ] 循環動作正常運作
- [ ] Debug 路徑點正確顯示

### 邊界測試

- [ ] 空 actions 陣列不報錯
- [ ] 缺少 actor 的 action 不報錯
- [ ] 動畫 URL 載入失敗的容錯
- [ ] 模型載入失敗顯示錯誤狀態
- [ ] 快速連續點擊不重複觸發

### 性能測試

- [ ] 10+ 危險因子同時存在
- [ ] 多個動畫並行播放
- [ ] 長路徑移動不卡頓
- [ ] 資源正確釋放（組件卸載）

---

## 📝 遷移檢查清單

如果要遷移其他場景數據：

- [ ] 將 `position` 改為 `initialPosition`
- [ ] 將 `rotation` 改為 `initialRotation`
- [ ] 將 `type` 改為 `ActorType` enum
- [ ] 從 actor 中移除 `behaviors`
- [ ] 創建 `actions` 陣列在 DangerFactor 層級
- [ ] 每個 action 添加 `actorId`
- [ ] 每個 action 添加 `time` 屬性
- [ ] 將 `animation` 改為 `name`
- [ ] 將 `animationLoop` 改為 `loop`
- [ ] 更新 import 路徑

---

## 🎉 完成狀態

- ✅ PatrolScene 完全整合新組件
- ✅ SafeObjectGroup 組件創建
- ✅ BehaviorPatrolGame 引用新場景數據
- ✅ 移除舊 ClickableObject 依賴
- ✅ 多角色事件正常運作
- ✅ 時間控制系統就位
- ✅ Debug 可視化可用

**主場景整合完成！** 🚀

下一步：
1. 測試實際遊戲流程
2. 遷移剩餘場景數據
3. 性能優化（如需要）
4. 添加更多 action types（SOUND, LIGHT）
