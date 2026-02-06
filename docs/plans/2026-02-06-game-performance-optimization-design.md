# 遊戲流程效能優化設計文檔

**日期:** 2026-02-06
**更新日期:** 2026-02-07
**作者:** Claude Sonnet 4.5
**狀態:** ✅ Phase 1-4 已完成，待測試驗證

## 概述

本文檔描述了針對 Safe Driving 遊戲的全面效能優化方案，解決已完成事件持續佔用資源導致的效能下降問題。

## 問題分析

### 當前問題
1. **資源洩漏:** 已完成事件的 3D 模型、幾何體、材質持續佔用 GPU 記憶體
2. **記憶體累積:** EventManager 的 completedEvents 無限增長
3. **無效渲染:** EventActor 組件在事件完成後仍執行 useFrame 和動畫更新
4. **渲染負擔:** 所有物件持續渲染，缺乏批次優化

### 影響範圍
- 遊戲進行 5-10 分鐘後 FPS 明顯下降
- 記憶體使用持續增長
- 瀏覽器可能崩潰或卡頓

## 優化方案

### 1. 資源清理系統 (ResourceCleanupManager)

#### 設計目標
實現批次清理機制，避免頻繁 dispose 造成卡頓。

#### 架構
```typescript
class ResourceCleanupManager {
  private completedEventQueue: EventCleanupTask[] = []
  private cleanupThreshold: number = 5          // 積累 5 個事件才清理
  private cleanupInterval: number = 2000        // 或每 2 秒檢查一次
  private lastCleanupTime: number = 0

  // 排程清理任務
  scheduleCleanup(eventId: string, actorIds: string[], resources: CleanupResources): void

  // 執行批次清理
  performBatchCleanup(): void

  // 清理單一事件資源
  private disposeEventResources(task: EventCleanupTask): void

  // 清理 Three.js 資源
  private disposeThreeObject(object: THREE.Object3D): void
}

interface EventCleanupTask {
  eventId: string
  actorIds: string[]
  timestamp: number
  resources: CleanupResources
}

interface CleanupResources {
  geometries: THREE.BufferGeometry[]
  materials: THREE.Material[]
  textures: THREE.Texture[]
  animationMixers: THREE.AnimationMixer[]
  sceneObjects: THREE.Object3D[]
}
```

#### 清理目標
- ✅ THREE.BufferGeometry
- ✅ THREE.Material (包含所有 maps: map, normalMap, emissiveMap 等)
- ✅ THREE.Texture
- ✅ AnimationMixer 和 AnimationClip
- ✅ 從場景樹移除 Object3D
- ✅ 清除 EventManager 的 completedEvents 記錄

#### 清理流程
1. EventManager.completeEvent() 時收集資源引用
2. 將清理任務加入隊列
3. 當達到閾值（5 個事件）或時間間隔（2 秒）時觸發批次清理
4. 依序 dispose 所有資源
5. 記錄清理統計（釋放的記憶體、物件數量）

#### 整合點
- EventManager.completeEvent()
- EventSystemUpdater.useFrame() - 定期檢查清理條件

---

### 2. 事件系統記憶體管理 (EventManager 優化)

#### 問題
- `completedEvents: Set<string>` 無限增長
- `eventRegistry: Map<string, GameEvent>` 永久保留所有事件
- `EventContext` 物件包含大量 Map 引用未清理

#### 解決方案

**A. LRU 快取機制**
```typescript
class CompletedEventsCache {
  private maxSize: number
  private cache: Map<string, CompletedEventRecord> = new Map()

  add(eventId: string): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }
    this.cache.set(eventId, {
      timestamp: Date.now(),
      eventId
    })
  }

  private evictOldest(): void {
    const oldest = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]
    this.cache.delete(oldest[0])
  }

  has(eventId: string): boolean
  clear(): void
}

interface CompletedEventRecord {
  eventId: string
  timestamp: number
}
```

**B. EventManager 配置擴展**
```typescript
interface EventManagerConfig {
  // 現有配置...
  maxCompletedEventsCache: number    // 預設 20
  enableEventRecycling: boolean      // 預設 true
  contextCleanupDelay: number        // 預設 5 秒
}
```

**C. EventContext 清理**
```typescript
// EventManager.completeEvent() 修改
completeEvent(eventId: string, success: boolean): void {
  const context = this.activeEvents.get(eventId)
  if (!context) return

  // 清理 context 內部引用
  context.activeActors.clear()
  context.completedActions.clear()
  context.actorPathsCompleted?.clear()

  // 移除並加入 LRU 快取
  this.activeEvents.delete(eventId)
  this.completedEventsCache.add(eventId)

  // 通知清理系統
  this.resourceCleanupManager.scheduleCleanup(eventId, ...)

  // 原有邏輯...
}
```

#### 效益
- completedEvents 記憶體使用上限固定（~20 個事件）
- EventContext 不再累積未使用的引用
- 預期減少 40-60% 的事件系統記憶體佔用

---

### 3. Actor 生命週期管理 (ActorLifecycleManager)

#### 問題
EventActor 組件在事件完成後：
- 仍在 React 組件樹中
- useFrame 每幀執行（浪費 CPU）
- AnimationMixer 持續更新
- 3D 模型佔用 GPU 記憶體

#### 解決方案

**A. 生命週期管理器**
```typescript
class ActorLifecycleManager {
  private activeActors: Map<string, ActorInfo> = new Map()
  private pendingRemoval: Map<string, RemovalTask> = new Map()
  private removalThreshold: number = 5

  registerActor(actorId: string, eventId: string, ref: React.RefObject<EventActorHandle>): void

  markForRemoval(actorId: string, eventId: string, delay: number = 0): void {
    this.pendingRemoval.set(actorId, {
      actorId,
      eventId,
      timestamp: Date.now() + delay,
      ref: this.activeActors.get(actorId)?.ref
    })
  }

  cleanupBatch(): string[] {
    const now = Date.now()
    const toRemove = Array.from(this.pendingRemoval.values())
      .filter(task => task.timestamp <= now)

    toRemove.forEach(task => {
      this.removeActor(task.actorId)
    })

    return toRemove.map(t => t.actorId)
  }

  private removeActor(actorId: string): void {
    const info = this.activeActors.get(actorId)
    if (!info) return

    // 通知 React 組件清理
    info.onRequestCleanup?.()

    this.activeActors.delete(actorId)
    this.pendingRemoval.delete(actorId)
  }
}

interface ActorInfo {
  actorId: string
  eventId: string
  ref: React.RefObject<EventActorHandle>
  onRequestCleanup?: () => void
}

interface RemovalTask {
  actorId: string
  eventId: string
  timestamp: number
  ref?: React.RefObject<EventActorHandle>
}
```

**B. EventActor 組件修改**
```typescript
interface EventActorProps {
  // 現有 props...
  shouldCleanup?: boolean
  onCleanupComplete?: () => void
}

// 新增 cleanup effect
useEffect(() => {
  if (shouldCleanup) {
    // 清理動畫控制器
    if (animationControllerRef.current) {
      animationControllerRef.current.dispose()
      animationControllerRef.current = null
    }

    // 清理模型
    if (modelSceneRef.current && groupRef.current) {
      disposeObject3D(modelSceneRef.current)
      groupRef.current.remove(modelSceneRef.current)
      modelSceneRef.current = null
    }

    // 通知完成
    onCleanupComplete?.()
  }
}, [shouldCleanup, onCleanupComplete])
```

**C. 整合到事件系統**
```typescript
// EventManager.completeEvent() 修改
completeEvent(eventId: string, success: boolean): void {
  // ...現有邏輯...

  // 標記所有 actors 待移除
  const context = this.activeEvents.get(eventId)
  if (context) {
    context.activeActors.forEach((_, actorId) => {
      this.actorLifecycleManager.markForRemoval(actorId, eventId, 0)
    })
  }

  // ...
}

// EventSystemUpdater 定期清理
useFrame(() => {
  // 每 2 秒或積累 5 個時清理
  const removedActorIds = actorLifecycleManager.cleanupBatch()

  // 更新 React 狀態觸發 unmount
  if (removedActorIds.length > 0) {
    setActorsToRemove(prev => [...prev, ...removedActorIds])
  }
})
```

#### 效益
- 減少 30-50% 的 useFrame 執行次數
- 釋放未使用的 AnimationMixer（每個約 1-5 MB）
- React 組件樹保持精簡

---

### 4. 渲染效能優化

#### A. 物件池 (Object Pooling)

**設計**
```typescript
class ActorPool {
  private pools: Map<string, PooledActor[]> = new Map()
  private maxPoolSize: number = 10

  acquire(modelUrl: string): PooledActor | null {
    const pool = this.pools.get(modelUrl) || []
    return pool.pop() || null
  }

  release(actor: PooledActor, modelUrl: string): void {
    const pool = this.pools.get(modelUrl) || []
    if (pool.length < this.maxPoolSize) {
      actor.reset()
      pool.push(actor)
      this.pools.set(modelUrl, pool)
    } else {
      actor.dispose()
    }
  }

  warm(modelUrl: string, count: number): Promise<void> {
    // 預載入並放入池中
  }
}

interface PooledActor {
  scene: THREE.Object3D
  mixer: THREE.AnimationMixer | null
  reset(): void
  dispose(): void
}
```

**整合**
- EventActor 完成後，不直接 dispose，而是回收到池
- 新事件觸發時，優先從池中取用
- 減少頻繁的模型載入和 GPU 資源分配

**效益**
- 減少 50-70% 的模型載入時間
- 降低記憶體碎片化

---

#### B. 幾何體實例化 (Instancing)

針對重複物件（如行人、路標），使用 `THREE.InstancedMesh`：

```typescript
class InstancedActorManager {
  private instances: Map<string, THREE.InstancedMesh> = new Map()

  createInstancedMesh(
    modelUrl: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    maxCount: number
  ): THREE.InstancedMesh

  updateInstance(meshId: string, index: number, matrix: THREE.Matrix4): void

  setInstanceVisibility(meshId: string, index: number, visible: boolean): void
}
```

**適用場景**
- 多個相同模型的行人
- 重複的路標、圓錐
- 不需要獨立動畫的靜態物件

**效益**
- 減少 draw calls 50-80%
- FPS 提升 20-40%

---

#### C. LOD 整合

您已有 `LODSystem.tsx`，整合進 EventActor：

```typescript
interface EventActorProps {
  enableLOD?: boolean
  lodDistances?: [number, number, number]  // [high, medium, low]
}

// EventActor 內部
useEffect(() => {
  if (enableLOD && modelSceneRef.current) {
    const lod = new THREE.LOD()
    lod.addLevel(highDetailModel, 0)
    lod.addLevel(mediumDetailModel, lodDistances[0])
    lod.addLevel(lowDetailModel, lodDistances[1])

    groupRef.current.add(lod)
  }
}, [enableLOD, lodDistances])
```

---

#### D. Frustum Culling 優化

```typescript
// EventActor 完成後
if (movementComplete && !isInView) {
  groupRef.current.visible = false
}

// 或移到視錐外
if (movementComplete) {
  groupRef.current.position.set(999, -100, 999)
}
```

---

#### E. 效能監控整合

```typescript
// EventSystemUpdater
useFrame(() => {
  const fps = state.clock.getFPS()

  if (fps < 30) {
    // 觸發激進清理模式
    resourceCleanupManager.setAggressiveMode(true)
    actorLifecycleManager.cleanupImmediately()
  }

  // 記錄到 PerformanceMonitor
  performanceMonitor.recordFrame(fps, {
    activeEvents: eventManager.getActiveEvents().length,
    activeActors: actorLifecycleManager.getActiveCount(),
    pendingCleanup: resourceCleanupManager.getPendingCount()
  })
})
```

---

## 實施計劃

### Phase 1: 資源清理系統 (2-3 天)
1. 建立 `ResourceCleanupManager` 類別
2. 修改 `EventManager.completeEvent()` 收集資源
3. 實作批次清理邏輯
4. 整合到 `EventSystemUpdater`
5. 測試記憶體釋放效果

### Phase 2: 記憶體管理優化 (1-2 天)
1. 建立 `CompletedEventsCache` LRU 快取
2. 修改 `EventManager` 配置
3. 實作 EventContext 清理
4. 測試記憶體使用上限

### Phase 3: Actor 生命週期 (2-3 天)
1. 建立 `ActorLifecycleManager` 類別
2. 修改 `EventActor` 新增 cleanup 邏輯
3. 整合到事件完成流程
4. 測試 Actor 移除效果

### Phase 4: 渲染優化 (2-3 天)
1. 實作 `ActorPool` 物件池
2. 評估並實作 Instancing（選擇性）
3. 整合現有 LOD 系統
4. 實作 Frustum Culling
5. 整合效能監控

### Phase 5: 整合測試與調優 (1-2 天)
1. 端到端測試
2. 效能基準測試
3. 調整清理閾值和時機
4. 記憶體洩漏檢測

**總計: 8-13 天**

---

## 效能指標預期

| 指標 | 優化前 | 優化後 | 改善幅度 |
|------|--------|--------|----------|
| 記憶體使用（10 分鐘） | 800-1200 MB | 300-500 MB | -60-70% |
| 平均 FPS | 30-45 | 55-60 | +40-80% |
| 事件系統記憶體 | 無上限 | ~5-10 MB | 固定上限 |
| useFrame 執行次數 | 所有 Actors | 只有活躍 Actors | -30-50% |
| Draw Calls（使用 Instancing） | 200-300 | 50-100 | -60-75% |

---

## 風險與注意事項

### 風險
1. **過度清理:** 可能清理到仍需要的資源
2. **卡頓風險:** 批次清理時可能造成短暫卡頓
3. **物件池複雜度:** 池化邏輯可能引入新 bug

### 緩解措施
1. 完善的引用計數和生命週期追蹤
2. 調整批次大小，分散清理負載
3. 充分測試物件重置邏輯
4. 提供開關選項，可回退到舊邏輯

---

## 測試策略

### 單元測試
- ResourceCleanupManager 清理邏輯
- CompletedEventsCache LRU 行為
- ActorLifecycleManager 移除邏輯

### 整合測試
- 事件完成 → 資源清理流程
- Actor 生命週期完整流程
- 效能監控數據準確性

### 效能測試
- 連續 10 分鐘遊戲，監控記憶體曲線
- 記錄 FPS 變化
- 使用 Chrome DevTools Memory Profiler

---

## 後續優化方向

1. **Web Worker 清理:** 將資源 dispose 移到 Worker 執行
2. **增量清理:** 每幀只清理少量資源，避免卡頓
3. **智能預載入:** 根據場景預測下一個事件，提前載入
4. **紋理壓縮:** 使用 basis 或 ktx2 格式減少紋理記憶體

---

## 總結

本設計提供了四大核心優化：資源清理、記憶體管理、生命週期控制、渲染優化。預期可大幅改善遊戲長時間運行的效能表現，將 FPS 穩定在 55-60，記憶體使用減少 60-70%。

實施將分 5 個階段進行，總計 8-13 天。每個階段都有明確的交付物和測試標準。
