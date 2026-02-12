# 場景物件載入系統 - 紅綠燈與裝飾物件

**日期：** 2026-02-13
**狀態：** 已批准 ✅
**作者：** Claude Sonnet 4.5

## 概述

為 behavior-patrol 遊戲增加場景物件載入功能，支援：
1. **紅綠燈系統** - 互動教學用，可定時改變燈號或手動控制
2. **靜態裝飾** - 長椅子等視覺裝飾物件

## 設計決策

### 方案選擇：混合方案

- **長椅子**：使用現有 `safeObjects` 系統（靜態裝飾，無互動）
- **紅綠燈**：新增專門的 `trafficLights` 系統（需要特殊控制邏輯）

**理由：**
- 長椅子本質上就是安全物件（不會被誤判為危險）
- 紅綠燈需要特殊的燈號控制和開發者工具
- 符合 YAGNI 原則，不過度設計
- 未來易於擴展其他交通設施

### 控制模式：混合控制

- **場景預設**：在場景數據中手動編排紅綠燈和車輛 actions（通過時間軸對齊）
- **開發者工具**：提供 UI 面板手動控制燈號，自動影響車輛行為

### 紅綠燈模型結構

- **分離網格**：模型包含三個獨立網格（`RedLight`, `YellowLight`, `GreenLight`）
- **控制方式**：通過顯示/隱藏網格切換燈號

## 技術設計

### 1. 數據結構

#### 新增類型定義 (`types.ts`)

```typescript
// 紅綠燈狀態
export enum TrafficLightState {
  RED = 'red',
  YELLOW = 'yellow',
  GREEN = 'green',
  OFF = 'off'
}

// 紅綠燈燈號變化
export interface LightChange {
  time: number;                    // 變化時間（秒）
  state: TrafficLightState;        // 燈號狀態
  duration?: number;               // 持續時間（秒）
}

// 紅綠燈定義
export interface TrafficLight {
  id: string;
  name: string;
  model: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];

  lightSchedule: LightChange[];    // 燈號時間表
  loopSchedule?: boolean;          // 是否循環（默認 true）

  meshNames?: {                    // 網格命名配置
    red: string;
    yellow: string;
    green: string;
  };
}
```

#### 場景定義擴展

```typescript
export interface PatrolScenario {
  // ... 現有字段
  trafficLights?: TrafficLight[];  // 新增紅綠燈列表
}
```

### 2. 組件架構

#### TrafficLightObject 組件

**職責：**
- 載入並渲染紅綠燈 3D 模型
- 根據遊戲時間計算當前燈號狀態
- 支援手動狀態覆蓋（開發者工具）
- 控制模型網格可見性

**核心邏輯：**
```typescript
// 時間表計算
useEffect(() => {
  if (manualState) {
    setCurrentState(manualState);  // 手動優先
    return;
  }

  // 自動計算當前燈號
  const effectiveTime = loopSchedule
    ? currentTime % totalDuration
    : currentTime;

  // 找到對應的燈號狀態
  const newState = findStateAtTime(lightSchedule, effectiveTime);
  setCurrentState(newState);
}, [currentTime, manualState]);

// 網格控制
useEffect(() => {
  redMesh.visible = currentState === TrafficLightState.RED;
  yellowMesh.visible = currentState === TrafficLightState.YELLOW;
  greenMesh.visible = currentState === TrafficLightState.GREEN;
}, [currentState]);
```

#### TrafficLightDevPanel 組件

**職責：**
- 提供開發者控制面板 UI
- 手動切換紅綠燈狀態
- 顯示時間表預覽
- 支援恢復自動模式

**功能：**
- 摺疊/展開面板
- 每個紅綠燈獨立控制
- 紅/黃/綠燈快速切換按鈕
- 顯示當前模式（手動/自動）
- 一鍵恢復所有紅綠燈到自動模式

### 3. 場景集成

#### PatrolScene 修改

```typescript
interface PatrolSceneProps {
  // ... 現有 props
  currentTime: number;              // 新增：遊戲時間
  manualTrafficLightStates?: Record<string, TrafficLightState>;
  onTrafficLightStateChange?: (id: string, state: TrafficLightState) => void;
}

// 渲染紅綠燈
{scenario.trafficLights?.map((light) => (
  <TrafficLightObject
    key={light.id}
    trafficLight={light}
    currentTime={currentTime}
    manualState={manualTrafficLightStates?.[light.id]}
    onStateChange={(state) =>
      onTrafficLightStateChange?.(light.id, state)
    }
  />
))}
```

#### useGameState 擴展

```typescript
export function useGameState(scenario: PatrolScenario) {
  const [gameTime, setGameTime] = useState(0);
  const [manualTrafficLightStates, setManualTrafficLightStates] =
    useState<Record<string, TrafficLightState>>({});

  // 遊戲時間更新
  useEffect(() => {
    if (progress.status !== 'playing') return;

    const interval = setInterval(() => {
      setGameTime(prev => prev + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [progress.status]);

  // 手動控制
  const setTrafficLightState = useCallback(
    (lightId: string, state: TrafficLightState | null) => {
      setManualTrafficLightStates(prev => {
        if (state === null) {
          const { [lightId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [lightId]: state };
      });
    },
    []
  );

  return { gameTime, manualTrafficLightStates, setTrafficLightState };
}
```

### 4. 場景數據範例

#### 紅綠燈定義

```typescript
trafficLights: [
  {
    id: 'traffic_light_north',
    name: '北向紅綠燈',
    model: '/src/assets/models/TrafficLight.glb',
    position: [-8, 0, -15],

    lightSchedule: [
      { time: 0, state: TrafficLightState.RED, duration: 15 },
      { time: 15, state: TrafficLightState.GREEN, duration: 12 },
      { time: 27, state: TrafficLightState.YELLOW, duration: 3 },
    ],
    loopSchedule: true,
  }
]
```

#### 長椅裝飾（使用 safeObjects）

```typescript
safeObjects: [
  {
    id: 'bench_1',
    name: '路邊長椅',
    actors: [{
      id: 'bench_actor_1',
      name: '長椅',
      type: ActorType.OBJECT,
      model: '/src/assets/models/Bench.glb',
      initialPosition: [-25, 0, -20],
      initialRotation: [0, Math.PI / 2, 0],
    }],
    actions: [],  // 靜態裝飾無動作
  }
]
```

#### 車輛行為協調

```typescript
// 遵守紅綠燈的車輛
actions: [
  // 階段1: 接近紅綠燈
  {
    actorId: 'car_1',
    type: ActionType.MOVEMENT,
    path: [[20, 0, 15], [10, 0, 15]],
    speed: 8,
    time: 0,
  },

  // 階段2: 等待紅燈（使用 WAIT action）
  {
    actorId: 'car_1',
    type: ActionType.WAIT,
    time: 3,
    duration: 12,  // 等待綠燈
  },

  // 階段3: 綠燈通過
  {
    actorId: 'car_1',
    type: ActionType.MOVEMENT,
    path: [[10, 0, 15], [-20, 0, 15]],
    speed: 8,
    time: 15,
  },
]
```

## 實現步驟

### 步驟 1：類型定義
- [ ] 修改 `src/games/behavior-patrol/types.ts`
- [ ] 新增 `TrafficLightState`, `LightChange`, `TrafficLight`
- [ ] 在 `PatrolScenario` 中添加 `trafficLights?` 字段

### 步驟 2：紅綠燈組件
- [ ] 創建 `src/games/behavior-patrol/components/TrafficLightObject.tsx`
- [ ] 實現時間表計算邏輯
- [ ] 實現網格可見性控制
- [ ] 支持手動狀態覆蓋

### 步驟 3：開發者工具
- [ ] 創建 `src/games/behavior-patrol/components/TrafficLightDevPanel.tsx`
- [ ] 實現 UI 面板（摺疊、燈號按鈕）
- [ ] 實現手動/自動切換
- [ ] 添加時間表預覽

### 步驟 4：場景集成
- [ ] 修改 `src/games/behavior-patrol/components/PatrolScene.tsx`
- [ ] 添加 `currentTime`, `manualTrafficLightStates` props
- [ ] 渲染 `TrafficLightObject` 組件

### 步驟 5：狀態管理
- [ ] 修改 `src/games/behavior-patrol/hooks/useGameState.ts`
- [ ] 添加 `gameTime` 狀態和更新邏輯
- [ ] 添加 `manualTrafficLightStates` 狀態
- [ ] 實現 `setTrafficLightState` 方法

### 步驟 6：組件導出
- [ ] 更新 `src/games/behavior-patrol/components/index.ts`
- [ ] 導出新組件

### 步驟 7：場景數據
- [ ] 創建 `src/games/behavior-patrol/data/PatrolScenario_WithTrafficLights.ts`
- [ ] 定義完整的紅綠燈場景範例

### 步驟 8：主遊戲集成
- [ ] 修改 `src/games/behavior-patrol/BehaviorPatrolGame.tsx`
- [ ] 整合開發者工具面板

## 測試計劃

### 單元測試
- [ ] TrafficLightObject 燈號切換邏輯
- [ ] 時間表循環計算
- [ ] 手動狀態優先級

### 集成測試
- [ ] 紅綠燈模型正確載入
- [ ] 燈號按時間表自動切換
- [ ] 開發者工具手動控制
- [ ] 長椅等裝飾物件顯示

### 性能測試
- [ ] 多個紅綠燈同時運行
- [ ] 時間計算不影響幀率

## 擴展建議

### 短期擴展
- 停止標誌、讓路標誌
- 人行道紅綠燈
- 倒數計時器顯示
- 左轉箭頭燈

### 長期擴展
- 場景編輯器（可視化編輯）
- 自動關聯系統（車輛自動遵守紅綠燈）
- 真實交通模擬（感應系統、動態燈號）

## 核心文件清單

1. `src/games/behavior-patrol/types.ts` - 類型定義擴展
2. `src/games/behavior-patrol/components/TrafficLightObject.tsx` - 紅綠燈組件
3. `src/games/behavior-patrol/components/TrafficLightDevPanel.tsx` - 開發者工具
4. `src/games/behavior-patrol/components/PatrolScene.tsx` - 場景集成
5. `src/games/behavior-patrol/hooks/useGameState.ts` - 狀態管理
6. `src/games/behavior-patrol/BehaviorPatrolGame.tsx` - 主遊戲集成
7. `src/games/behavior-patrol/data/PatrolScenario_WithTrafficLights.ts` - 範例場景

## 總結

此設計提供了：
- ✅ 靈活的數據結構（支援紅綠燈時間表和靜態裝飾）
- ✅ 混合控制模式（場景預設 + 開發者手動控制）
- ✅ 良好的擴展性（易於添加新交通設施）
- ✅ 與現有系統兼容（重用 safeObjects，最小化改動）
- ✅ 開發者友好（直觀的控制面板）
