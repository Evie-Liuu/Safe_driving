# 行為序列重播功能

## 概述

為 `DangerActorObject` 組件添加了整個行為序列的重播功能,允許角色在完成所有動作後,等待指定時間再自動重置並重新播放。這對於模擬週期性重複發生的危險行為非常有用,例如「機車超速到斑馬線迴轉」。

## 功能特點

### 1. 與現有 `loop` 的區別

| 功能 | `loop: true` (MovementAction) | `replayInterval` (Actor 重播) |
|------|-------------------------------|------------------------------|
| 循環方式 | 路徑立即循環,車輛持續移動 | 完成後重置到起點,等待後重播 |
| 適用場景 | 持續不斷的循環移動 | 週期性重複的完整事件序列 |
| 位置重置 | 不重置,直接從終點回到起點 | 完全重置到初始位置和旋轉 |
| 動畫狀態 | 持續播放 | 停止並重新開始 |
| 等待時間 | 無等待 | 可配置等待時間 |

### 2. 核心參數

在 `DangerActor` 接口中添加了兩個可選參數:

```typescript
export interface DangerActor {
  // ... 其他屬性

  // 整個行為序列重播設定
  replayInterval?: number; // 所有動作完成後等待多久再重播(秒),undefined = 不重播
  replayCount?: number;    // 重播次數,undefined = 無限重播
}
```

## 實現機制

### 1. 序列完成檢測

組件會自動檢測以下條件來判斷序列是否完成:
- 所有有 `duration` 的動作都已超過結束時間
- 所有移動動作都已啟動
- 所有動畫動作都已播放

### 2. 重播流程

```
動作開始 → 動作執行 → 序列完成 → 等待 replayInterval → 重置狀態 → 重新播放
```

### 3. 狀態重置

重播時會重置以下狀態:
- `elapsedTimeRef`: 經過時間歸零
- 位置和旋轉: 回到 `initialPosition` 和 `initialRotation`
- 動畫狀態: 停止所有動畫
- 移動狀態: 清空路徑進度和索引
- 追蹤狀態: 清空已播放動畫、已啟動移動的記錄
- 可見性: 恢復物件可見性

### 4. 自動停止

當危險因子被找到 (`found = true`) 時,重播功能會自動停止。

### 5. 等待期間隱藏

在重播等待期間,角色物件會自動隱藏,只有在重新播放時才會重新出現。這讓重播效果更加自然,避免物件停留在終點位置的尷尬感。

**行為流程**:
```
動作執行 → 序列完成 → 隱藏物件 → 等待 replayInterval → 重置並顯示 → 重新播放
```

## 使用方法

### 配置示例

在 `PatrolScenario_1_New.ts` 中為角色添加重播配置:

```typescript
{
  id: 'scooter_speeding_1',
  name: '超速回轉機車',
  type: ActorType.SCOOTER,
  model: '/src/assets/models/Scooter3_Rigged.glb',
  initialPosition: [4.26, 0, -60],
  initialRotation: [0, Math.PI / 2, 0],
  animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
  replayInterval: 10, // ✅ 完成後等待10秒再重播
  replayCount: 3,     // ✅ 可選：限制重播3次
}
```

### 動作配置注意事項

1. **移除 `loop: true`**: 使用重播功能時,移動動作不應使用 `loop: true`
2. **添加 `duration`**: 為動作指定持續時間,幫助檢測序列完成
3. **同步重播**: 同一事件中的所有角色應使用相同的 `replayInterval`

```typescript
actions: [
  {
    actorId: 'scooter_speeding_1',
    type: ActionType.MOVEMENT,
    path: [...],
    speed: 17,
    time: 0,
    duration: 8,  // ✅ 添加 duration
    // ❌ 移除 loop: true
  },
  {
    actorId: 'scooter_speeding_1',
    type: ActionType.ANIMATION,
    name: 'Scooter_Moving_Animation',
    time: 0,
    duration: 8,  // ✅ 與移動同步
    loop: true,   // ✅ 動畫本身可以循環播放
  },
]
```

## 已配置的事件

以下事件已經配置了重播功能:

| 事件 ID | 事件名稱 | 重播間隔 | 說明 |
|---------|---------|---------|------|
| danger-1 | 行人邊走邊滑手機 | 18秒 | 行人走完後等待18秒重播 |
| danger-2 | 不走斑馬線任意穿越 | 15秒 | 行人穿越後等待15秒重播 |
| danger-3 | 機車超速到斑馬線迴轉 | 10秒 | 機車完成迴轉後等待10秒重播 |
| danger-4 | 機車在公車後方搶快超車 | 15秒 | 公車和機車完成路徑後等待15秒重播 |
| danger-5 | 汽車不禮讓斑馬線行人 | 12秒 | 汽車和行人完成後等待12秒重播 |

## 調整建議

### 根據事件特性調整間隔

- **快速重複事件** (5-10秒): 適用於高頻危險行為,如超速機車
- **中等間隔** (10-15秒): 適用於一般交通違規
- **較長間隔** (15-20秒): 適用於行人相關事件,避免過於頻繁

### 動態調整

可以根據遊戲難度或場景需求動態調整:
- 新手模式: 較長的 `replayInterval`,降低難度
- 專家模式: 較短的 `replayInterval`,增加挑戰
- 時間壓力: 使用 `replayCount` 限制重播次數

## 調試

啟用 `enableDebug` 可以在控制台看到重播相關的日誌:

```typescript
<DangerGroup
  danger={danger}
  onClick={handleClick}
  enableDebug={true}  // ✅ 啟用調試
/>
```

控制台輸出示例:
```
[DangerActorObject] Sequence completed for scooter_speeding_1 at 8.00s, waiting 10s before replay (hidden)
[DangerActorObject] Replaying sequence for scooter_speeding_1 (replay #1)
[DangerActorObject] Sequence reset for scooter_speeding_1
```

**注意**: 當序列完成時,物件會自動隱藏,日誌中會顯示 "(hidden)" 標記。

## 技術細節

### 修改的文件

1. **types.ts**: 添加 `replayInterval` 和 `replayCount` 到 `DangerActor` 接口
2. **DangerActorObject.tsx**: 實現重播邏輯
3. **DangerGroup.tsx**: 傳遞重播參數給 `DangerActorObject`
4. **PatrolScenario_1_New.ts**: 為所有事件配置重播參數

### 性能考量

- 重播不會創建新的模型實例,只是重置狀態
- 使用高效的 ref 追蹤,避免不必要的重新渲染
- 自動清理:當組件卸載或危險因子被找到時停止重播

## 未來擴展

可能的擴展方向:
1. **隨機間隔**: `replayIntervalRange: [min, max]` 讓重播時間隨機化
2. **條件重播**: 根據玩家行為或遊戲狀態觸發重播
3. **漸進式難度**: 重播間隔隨時間逐漸縮短
4. **群組重播**: 多個角色協調重播時機
