# 場景物件載入系統（紅綠燈與裝飾物件）實作計劃

**狀態：** ✅ 已完成實作
**完成日期：** 2026-02-13

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 為 behavior-patrol 遊戲實作場景物件載入功能，包含可控制的紅綠燈系統和靜態裝飾物件（長椅等）。

**Architecture:** 採用混合方案 - 長椅等裝飾重用現有 safeObjects 系統，紅綠燈新增專門的 trafficLights 系統，支援時間表自動控制和開發者手動覆蓋。

**Tech Stack:** React, TypeScript, React Three Fiber (@react-three/fiber), @react-three/drei, Three.js

---

## Task 1: 擴展類型定義

**Files:**
- Modify: `src/games/behavior-patrol/types.ts`

**Step 1: 新增紅綠燈狀態 enum**

在 `types.ts` 的 `ActionType` enum 之後添加：

```typescript
/**
 * Traffic light states
 */
export enum TrafficLightState {
  RED = 'red',
  YELLOW = 'yellow',
  GREEN = 'green',
  OFF = 'off'
}
```

**Step 2: 新增 LightChange interface**

在 `TrafficLightState` 之後添加：

```typescript
/**
 * Traffic light state change definition
 */
export interface LightChange {
  time: number;                    // 變化時間（秒）
  state: TrafficLightState;        // 燈號狀態
  duration?: number;               // 持續時間（秒，可選）
}
```

**Step 3: 新增 TrafficLight interface**

在 `LightChange` 之後添加：

```typescript
/**
 * Traffic light definition
 */
export interface TrafficLight {
  id: string;                      // 紅綠燈 ID
  name: string;                    // 名稱
  model: string;                   // 模型路徑
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];

  // 燈號時間表（場景預設）
  lightSchedule: LightChange[];

  // 循環設定
  loopSchedule?: boolean;          // 是否循環時間表（默認 true）

  // 網格命名（用於控制模型中的燈光網格）
  meshNames?: {
    red: string;                   // 默認 'RedLight'
    yellow: string;                // 默認 'YellowLight'
    green: string;                 // 默認 'GreenLight'
  };
}
```

**Step 4: 擴展 PatrolScenario interface**

在 `PatrolScenario` interface 中添加新字段（在 `safeObjects` 之後）：

```typescript
export interface PatrolScenario {
  id: string;
  name: string;
  description: string;
  timeLimit: number;
  maxLives: number;
  scene: {
    environment: string;
    cameraPosition: [number, number, number];
    cameraLookAt: [number, number, number];
  };
  dangers: DangerFactor[];
  safeObjects: SafeObject[];
  trafficLights?: TrafficLight[];  // 新增：紅綠燈列表
}
```

**Step 5: 驗證類型定義**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/types.ts`
Expected: 無新增錯誤（預存在錯誤可忽略）

**Step 6: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/types.ts
git commit -m "feat(behavior-patrol): add traffic light type definitions

- Add TrafficLightState enum (RED, YELLOW, GREEN, OFF)
- Add LightChange interface for light schedule
- Add TrafficLight interface with position, schedule, and mesh config
- Extend PatrolScenario with optional trafficLights field

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 實作 TrafficLightObject 組件

**Files:**
- Create: `src/games/behavior-patrol/components/TrafficLightObject.tsx`

**Step 1: 建立組件骨架**

創建檔案並添加 imports 和 interface：

```typescript
import { useRef, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Object3D } from 'three';
import { TrafficLight, TrafficLightState } from '../types';

interface TrafficLightObjectProps {
  trafficLight: TrafficLight;
  currentTime: number;              // 當前遊戲時間
  manualState?: TrafficLightState;  // 手動控制狀態（開發者工具）
  onStateChange?: (state: TrafficLightState) => void;
}

export function TrafficLightObject({
  trafficLight,
  currentTime,
  manualState,
  onStateChange
}: TrafficLightObjectProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(trafficLight.model);
  const [currentState, setCurrentState] = useState<TrafficLightState>(
    TrafficLightState.OFF
  );

  // 網格名稱配置（使用默認值或自定義）
  const meshNames = {
    red: trafficLight.meshNames?.red || 'RedLight',
    yellow: trafficLight.meshNames?.yellow || 'YellowLight',
    green: trafficLight.meshNames?.green || 'GreenLight'
  };

  // TODO: 添加時間表計算邏輯
  // TODO: 添加網格控制邏輯

  return (
    <group
      ref={groupRef}
      position={trafficLight.position}
      rotation={trafficLight.rotation}
      scale={trafficLight.scale || [1, 1, 1]}
    >
      <primitive object={scene.clone()} />
    </group>
  );
}
```

**Step 2: 實作時間表計算邏輯**

在組件中添加 useEffect（在 meshNames 之後）：

```typescript
  // 計算當前應該顯示的燈號狀態
  useEffect(() => {
    // 如果有手動狀態，優先使用
    if (manualState) {
      setCurrentState(manualState);
      onStateChange?.(manualState);
      return;
    }

    // 否則根據時間表計算
    const { lightSchedule, loopSchedule = true } = trafficLight;

    if (lightSchedule.length === 0) {
      setCurrentState(TrafficLightState.OFF);
      return;
    }

    // 計算總時長
    let totalDuration = 0;
    lightSchedule.forEach(change => {
      totalDuration += change.duration || 0;
    });

    // 如果循環且有總時長，使用模運算
    const effectiveTime = loopSchedule && totalDuration > 0
      ? currentTime % totalDuration
      : currentTime;

    // 找到當前時間對應的燈號
    let newState = lightSchedule[0].state;

    for (const change of lightSchedule) {
      if (effectiveTime >= change.time) {
        newState = change.state;
      } else {
        break;
      }
    }

    setCurrentState(newState);
    onStateChange?.(newState);
  }, [currentTime, manualState, trafficLight, onStateChange]);
```

**Step 3: 實作網格可見性控制**

在時間表計算 useEffect 之後添加：

```typescript
  // 更新模型中的網格可見性
  useEffect(() => {
    if (!groupRef.current) return;

    const redMesh = groupRef.current.getObjectByName(meshNames.red);
    const yellowMesh = groupRef.current.getObjectByName(meshNames.yellow);
    const greenMesh = groupRef.current.getObjectByName(meshNames.green);

    // 設置可見性
    if (redMesh) redMesh.visible = currentState === TrafficLightState.RED;
    if (yellowMesh) yellowMesh.visible = currentState === TrafficLightState.YELLOW;
    if (greenMesh) greenMesh.visible = currentState === TrafficLightState.GREEN;

    // OFF 狀態：全部隱藏
    if (currentState === TrafficLightState.OFF) {
      if (redMesh) redMesh.visible = false;
      if (yellowMesh) yellowMesh.visible = false;
      if (greenMesh) greenMesh.visible = false;
    }
  }, [currentState, meshNames]);
```

**Step 4: 驗證組件編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/components/TrafficLightObject.tsx`
Expected: 編譯成功（預存在錯誤可忽略）

**Step 5: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/components/TrafficLightObject.tsx
git commit -m "feat(behavior-patrol): implement TrafficLightObject component

- Load and render 3D traffic light model
- Calculate current light state from schedule with loop support
- Support manual state override for dev tools
- Control mesh visibility based on current state
- Configurable mesh names for different model structures

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 實作 TrafficLightDevPanel 開發者工具

**Files:**
- Create: `src/games/behavior-patrol/components/TrafficLightDevPanel.tsx`

**Step 1: 建立面板骨架**

創建檔案並添加基本結構：

```typescript
import { useState } from 'react';
import { TrafficLight, TrafficLightState } from '../types';

interface TrafficLightDevPanelProps {
  trafficLights: TrafficLight[];
  manualStates: Record<string, TrafficLightState>;
  onSetState: (lightId: string, state: TrafficLightState | null) => void;
  currentTime: number;
}

export function TrafficLightDevPanel({
  trafficLights,
  manualStates,
  onSetState,
  currentTime
}: TrafficLightDevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (trafficLights.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-[100]">
      {/* 摺疊按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
      >
        🚦 紅綠燈控制 {isOpen ? '▼' : '▶'}
      </button>

      {/* TODO: 添加控制面板內容 */}
    </div>
  );
}
```

**Step 2: 實作控制面板內容**

在 return 語句中，摺疊按鈕之後添加：

```typescript
      {/* 控制面板 */}
      {isOpen && (
        <div className="mt-2 bg-gray-800 text-white rounded-lg shadow-xl p-4 max-w-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">紅綠燈控制面板</h3>
            <span className="text-sm text-gray-400">
              時間: {currentTime.toFixed(1)}s
            </span>
          </div>

          <div className="space-y-3">
            {trafficLights.map(light => {
              const isManual = light.id in manualStates;
              const currentState = manualStates[light.id];

              return (
                <div
                  key={light.id}
                  className="bg-gray-700 rounded p-3 space-y-2"
                >
                  {/* 紅綠燈名稱 */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{light.name}</span>
                    {isManual && (
                      <span className="text-xs bg-yellow-600 px-2 py-1 rounded">
                        手動
                      </span>
                    )}
                  </div>

                  {/* 燈號控制按鈕 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSetState(light.id, TrafficLightState.RED)}
                      className={`flex-1 py-2 rounded font-semibold transition-colors ${
                        currentState === TrafficLightState.RED
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-red-700'
                      }`}
                    >
                      🔴 紅燈
                    </button>
                    <button
                      onClick={() => onSetState(light.id, TrafficLightState.YELLOW)}
                      className={`flex-1 py-2 rounded font-semibold transition-colors ${
                        currentState === TrafficLightState.YELLOW
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-600 text-gray-300 hover:bg-yellow-600'
                      }`}
                    >
                      🟡 黃燈
                    </button>
                    <button
                      onClick={() => onSetState(light.id, TrafficLightState.GREEN)}
                      className={`flex-1 py-2 rounded font-semibold transition-colors ${
                        currentState === TrafficLightState.GREEN
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-green-700'
                      }`}
                    >
                      🟢 綠燈
                    </button>
                  </div>

                  {/* 重置按鈕 */}
                  {isManual && (
                    <button
                      onClick={() => onSetState(light.id, null)}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    >
                      ↻ 恢復自動時間表
                    </button>
                  )}

                  {/* 時間表預覽 */}
                  {!isManual && light.lightSchedule.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">
                      時間表: {light.lightSchedule.map(s =>
                        `${s.time}s→${s.state}`
                      ).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 全部重置按鈕 */}
          {Object.keys(manualStates).length > 0 && (
            <button
              onClick={() => {
                trafficLights.forEach(light => onSetState(light.id, null));
              }}
              className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold transition-colors"
            >
              🔄 全部恢復自動
            </button>
          )}
        </div>
      )}
```

**Step 3: 驗證編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/components/TrafficLightDevPanel.tsx`
Expected: 編譯成功

**Step 4: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/components/TrafficLightDevPanel.tsx
git commit -m "feat(behavior-patrol): add traffic light dev control panel

- Collapsible panel UI with traffic light controls
- Individual light state buttons (red/yellow/green)
- Manual/auto mode indicator and toggle
- Schedule preview in auto mode
- Reset all lights to auto mode
- Current game time display

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 擴展遊戲狀態管理

**Files:**
- Modify: `src/games/behavior-patrol/hooks/useGameState.ts`

**Step 1: 添加 import**

在檔案開頭的 imports 中添加：

```typescript
import { PatrolScenario, DangerFactor, QuizResult, ErrorStatistics, DangerResult, TrafficLightState } from '../types';
```

**Step 2: 添加遊戲時間狀態**

在 `useGameState` 函數內部，找到其他 `useState` 聲明的位置，添加：

```typescript
  const [gameTime, setGameTime] = useState(0);  // 遊戲時間（秒）
```

**Step 3: 添加紅綠燈手動狀態**

在 `gameTime` state 之後添加：

```typescript
  // 開發者工具：紅綠燈手動控制狀態
  const [manualTrafficLightStates, setManualTrafficLightStates] =
    useState<Record<string, TrafficLightState>>({});
```

**Step 4: 實作遊戲時間更新邏輯**

在所有 state 聲明之後，其他 useEffect 之前添加：

```typescript
  // 遊戲時間更新（僅在遊戲進行中）
  useEffect(() => {
    if (progress.status !== 'playing') return;

    const interval = setInterval(() => {
      setGameTime(prev => prev + 0.1);  // 每 100ms 更新
    }, 100);

    return () => clearInterval(interval);
  }, [progress.status]);
```

**Step 5: 實作手動控制方法**

在所有 useEffect 之後，return 之前添加：

```typescript
  // 手動設置紅綠燈狀態（開發者工具用）
  const setTrafficLightState = useCallback(
    (lightId: string, state: TrafficLightState | null) => {
      setManualTrafficLightStates(prev => {
        if (state === null) {
          // 移除手動控制，恢復時間表
          const { [lightId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [lightId]: state };
      });
    },
    []
  );
```

**Step 6: 更新 return 語句**

在 return 物件中添加新的返回值：

```typescript
  return {
    // ... 現有返回值
    gameTime,
    manualTrafficLightStates,
    setTrafficLightState,
  };
```

**Step 7: 驗證編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/hooks/useGameState.ts`
Expected: 編譯成功

**Step 8: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/hooks/useGameState.ts
git commit -m "feat(behavior-patrol): add game time and traffic light state management

- Add gameTime state tracking (updates every 100ms during play)
- Add manualTrafficLightStates for dev tool overrides
- Implement setTrafficLightState for manual control
- Support resetting to auto mode by passing null

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 集成到 PatrolScene

**Files:**
- Modify: `src/games/behavior-patrol/components/PatrolScene.tsx`

**Step 1: 添加 import**

在檔案開頭的 imports 中添加：

```typescript
import { TrafficLightObject } from './TrafficLightObject';
import { TrafficLightState } from '../types';
```

**Step 2: 擴展 Props interface**

在 `PatrolSceneProps` interface 中添加新字段：

```typescript
interface PatrolSceneProps {
  scenario: PatrolScenario;
  foundDangerIds: Set<string>;
  disabled: boolean;
  onDangerClick: (danger: DangerFactor) => void;
  onSafeClick: () => void;
  currentTime: number;  // 新增：當前遊戲時間
  // 開發者工具相關（可選）
  manualTrafficLightStates?: Record<string, TrafficLightState>;
  onTrafficLightStateChange?: (id: string, state: TrafficLightState) => void;
}
```

**Step 3: 解構新的 props**

在組件函數中更新參數解構：

```typescript
export function PatrolScene({
  scenario,
  foundDangerIds,
  disabled,
  onDangerClick,
  onSafeClick,
  currentTime,
  manualTrafficLightStates,
  onTrafficLightStateChange,
}: PatrolSceneProps) {
```

**Step 4: 添加紅綠燈渲染**

在 Canvas 中，找到安全物件的渲染代碼（`scenario.safeObjects.map`），在其之後添加：

```typescript
        {/* 紅綠燈 */}
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

**Step 5: 驗證編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/components/PatrolScene.tsx`
Expected: 編譯成功（預存在錯誤可忽略）

**Step 6: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/components/PatrolScene.tsx
git commit -m "feat(behavior-patrol): integrate traffic lights into PatrolScene

- Add currentTime prop for traffic light schedule
- Add manualTrafficLightStates and onTrafficLightStateChange for dev tools
- Render TrafficLightObject components for each traffic light
- Pass manual state and callbacks to components

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: 更新組件導出

**Files:**
- Modify: `src/games/behavior-patrol/components/index.ts`

**Step 1: 添加新組件導出**

在檔案中添加：

```typescript
export { TrafficLightObject } from './TrafficLightObject';
export { TrafficLightDevPanel } from './TrafficLightDevPanel';
```

**Step 2: 驗證編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/components/index.ts`
Expected: 編譯成功

**Step 3: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/components/index.ts
git commit -m "feat(behavior-patrol): export traffic light components

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: 集成到主遊戲組件

**Files:**
- Modify: `src/games/behavior-patrol/BehaviorPatrolGame.tsx`

**Step 1: 添加 import**

在檔案開頭的 imports 中添加：

```typescript
import { TrafficLightDevPanel } from './components/TrafficLightDevPanel';
```

**Step 2: 從 useGameState 解構新狀態**

找到 `useGameState` 的調用，更新解構：

```typescript
  const {
    // ... 現有解構
    gameTime,
    manualTrafficLightStates,
    setTrafficLightState,
  } = useGameState(currentScenario);
```

**Step 3: 更新 PatrolScene props**

找到 `<PatrolScene>` 組件的使用，添加新的 props：

```typescript
      <PatrolScene
        scenario={currentScenario}
        foundDangerIds={foundDangerIds}
        disabled={progress.status !== 'playing'}
        onDangerClick={handleDangerClick}
        onSafeClick={handleSafeClick}
        currentTime={gameTime}
        manualTrafficLightStates={manualTrafficLightStates}
        onTrafficLightStateChange={(id, state) => {
          console.log(`Traffic light ${id} changed to ${state}`);
        }}
      />
```

**Step 4: 添加開發者工具面板**

在組件的 return JSX 中，找到適當位置（通常在 PatrolScene 之後），添加：

```typescript
      {/* 紅綠燈開發者工具面板 */}
      {currentScenario.trafficLights && currentScenario.trafficLights.length > 0 && (
        <TrafficLightDevPanel
          trafficLights={currentScenario.trafficLights}
          manualStates={manualTrafficLightStates}
          onSetState={setTrafficLightState}
          currentTime={gameTime}
        />
      )}
```

**Step 5: 驗證編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit`
Expected: 整體編譯成功（預存在錯誤數量不變）

**Step 6: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/BehaviorPatrolGame.tsx
git commit -m "feat(behavior-patrol): integrate traffic lights into main game

- Pass gameTime to PatrolScene for traffic light schedule
- Pass manual states and control callback to scene
- Add TrafficLightDevPanel for developer controls
- Log traffic light state changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: 創建範例場景數據

**Files:**
- Create: `src/games/behavior-patrol/data/PatrolScenario_WithTrafficLights.ts`

**Step 1: 創建場景數據檔案**

創建檔案並添加完整的範例場景：

```typescript
import { PatrolScenario, ActionType, ActorType, TrafficLightState } from '../types';

/**
 * 紅綠燈路口場景範例
 * 展示紅綠燈系統的使用和與車輛行為的協調
 */
export const patrolScenarioWithTrafficLights: PatrolScenario = {
  id: 'scenario-traffic-lights',
  name: '紅綠燈路口場景',
  description: '觀察紅綠燈路口的交通行為，找出違規車輛',
  timeLimit: 300,
  maxLives: 3,

  scene: {
    environment: 'city-intersection',
    cameraPosition: [0, 20, 35],
    cameraLookAt: [0, 0, 0],
  },

  // ========== 紅綠燈定義 ==========
  trafficLights: [
    {
      id: 'traffic_light_north',
      name: '北向紅綠燈',
      model: '/src/assets/models/TrafficLight.glb',
      position: [-8, 0, -15],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],

      // 燈號時間表（30秒循環）
      lightSchedule: [
        { time: 0, state: TrafficLightState.RED, duration: 15 },
        { time: 15, state: TrafficLightState.GREEN, duration: 12 },
        { time: 27, state: TrafficLightState.YELLOW, duration: 3 },
      ],
      loopSchedule: true,
    },
    {
      id: 'traffic_light_south',
      name: '南向紅綠燈',
      model: '/src/assets/models/TrafficLight.glb',
      position: [8, 0, 15],
      rotation: [0, Math.PI, 0],

      // 與北向相反（錯開15秒）
      lightSchedule: [
        { time: 0, state: TrafficLightState.GREEN, duration: 12 },
        { time: 12, state: TrafficLightState.YELLOW, duration: 3 },
        { time: 15, state: TrafficLightState.RED, duration: 15 },
      ],
      loopSchedule: true,
    },
  ],

  // ========== 危險因子：闖紅燈 ==========
  dangers: [
    {
      id: 'danger-red-light',
      name: '機車闖紅燈',
      description: '機車在紅燈時未停等，直接通過路口',
      replayInterval: 35,

      actors: [
        {
          id: 'scooter_violation',
          name: '闖紅燈機車',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter2_Rigged.glb',
          initialPosition: [-20, 0, -15],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
        },
        {
          id: 'scooter_driver',
          name: '騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male2_CnH_Rigged.glb',
          initialPosition: [-20, 0, -15],
          initialRotation: [0, Math.PI / 2, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],
        },
      ],

      actions: [
        {
          actorId: 'scooter_violation',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 2,
          loop: true,
        },
        {
          actorId: 'scooter_driver',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Scooter_Animation',
          time: 2,
          loop: true,
        },
        {
          actorId: 'scooter_violation',
          type: ActionType.MOVEMENT,
          path: [
            [-20, 0, -15],
            [-8, 0, -15],
            [20, 0, -15],
          ],
          speed: 12,
          time: 2,
        },
        {
          actorId: 'scooter_driver',
          type: ActionType.MOVEMENT,
          path: [
            [-20, 0, -15],
            [-8, 0, -15],
            [20, 0, -15],
          ],
          speed: 12,
          time: 2,
        },
      ],

      questions: {
        q1: {
          question: '這台機車違反了什麼規則？',
          options: ['超速', '闖紅燈', '未打燈', '逆向'],
          correctIndex: 1,
        },
        q2: {
          question: '紅燈時應該怎麼做？',
          options: ['加速通過', '在停止線前停車', '減速慢行', '按喇叭'],
          correctIndex: 1,
        },
      },

      feedback: [
        '危險原因：闖紅燈容易與綠燈方向車輛碰撞。',
        '安全行為：紅燈必須停車，綠燈才能通行。',
      ],
      found: false,
    },
  ],

  // ========== 安全物件：遵守號誌的車輛 + 裝飾 ==========
  safeObjects: [
    {
      id: 'safe-car',
      name: '等紅燈的汽車',
      actors: [
        {
          id: 'car_waiting',
          name: '汽車',
          type: ActorType.VEHICLE,
          model: '/src/assets/models/Car1_Rigged.glb',
          initialPosition: [20, 0, 15],
          initialRotation: [0, -Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Car1_Moving_Animation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'car_waiting',
          type: ActionType.ANIMATION,
          name: 'Car1_Moving_Animation',
          time: 0,
          duration: 3,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 15],
            [10, 0, 15],
          ],
          speed: 8,
          time: 0,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.WAIT,
          time: 3,
          duration: 12,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.ANIMATION,
          name: 'Car1_Moving_Animation',
          time: 15,
          loop: true,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.MOVEMENT,
          path: [
            [10, 0, 15],
            [-20, 0, 15],
          ],
          speed: 8,
          time: 15,
        },
      ],
      replayInterval: 5,
    },

    // ========== 長椅裝飾物件 ==========
    {
      id: 'bench_1',
      name: '路邊長椅',
      actors: [
        {
          id: 'bench_actor_1',
          name: '長椅',
          type: ActorType.OBJECT,
          model: '/src/assets/models/Bench.glb',
          initialPosition: [-25, 0, -20],
          initialRotation: [0, Math.PI / 2, 0],
        },
      ],
      actions: [],
    },
    {
      id: 'bench_2',
      name: '路邊長椅2',
      actors: [
        {
          id: 'bench_actor_2',
          name: '長椅',
          type: ActorType.OBJECT,
          model: '/src/assets/models/Bench.glb',
          initialPosition: [25, 0, 20],
          initialRotation: [0, -Math.PI / 2, 0],
        },
      ],
      actions: [],
    },
  ],
};
```

**Step 2: 驗證編譯**

Run: `cd .worktrees/scene-objects-traffic-lights && npx tsc --noEmit src/games/behavior-patrol/data/PatrolScenario_WithTrafficLights.ts`
Expected: 編譯成功

**Step 3: 提交**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/data/PatrolScenario_WithTrafficLights.ts
git commit -m "feat(behavior-patrol): add traffic light scenario example

- Complete scenario with 2 traffic lights (30s cycle)
- Red light violation danger (scooter running red light)
- Law-abiding car using WAIT action for red light
- Two bench decorations as safe objects
- Coordinated timing between lights and vehicle actions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: 最終驗證和測試

**Files:**
- N/A (verification only)

**Step 1: 完整編譯檢查**

Run: `cd .worktrees/scene-objects-traffic-lights && npm run build`
Expected: 編譯成功（預存在錯誤數量不變，無新增錯誤）

**Step 2: 啟動開發伺服器**

Run: `cd .worktrees/scene-objects-traffic-lights && npm run dev`
Expected: 伺服器啟動成功，無 runtime 錯誤

**Step 3: 手動測試清單**

在瀏覽器中測試以下功能：

- [ ] 紅綠燈模型正確載入並顯示
- [ ] 燈號按時間表自動切換（觀察30秒循環）
- [ ] 開發者面板可以打開/關閉
- [ ] 手動切換燈號立即生效
- [ ] 恢復自動模式後時間表繼續執行
- [ ] 長椅等裝飾物件正確顯示
- [ ] 車輛 WAIT action 正確運作（等紅燈）
- [ ] 整體場景性能良好（60 FPS）

**Step 4: 記錄測試結果**

創建測試報告（如果有問題）或確認全部通過。

---

## Task 10: 文檔和清理

**Files:**
- Create: `src/games/behavior-patrol/docs/TRAFFIC_LIGHTS_GUIDE.md`

**Step 1: 創建使用指南**

創建檔案並添加使用說明：

```markdown
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
```

**Step 2: 提交文檔**

```bash
cd .worktrees/scene-objects-traffic-lights
git add src/games/behavior-patrol/docs/TRAFFIC_LIGHTS_GUIDE.md
git commit -m "docs(behavior-patrol): add traffic lights usage guide

- Explain traffic light definition and configuration
- Document model mesh requirements
- Show how to coordinate with vehicle actions
- Describe dev tool usage
- Provide decoration objects examples

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 3: 更新實作計劃狀態**

在本檔案頂部添加完成標記：

```markdown
**狀態：** ✅ 已完成實作
**完成日期：** [填入完成日期]
```

---

## 完成檢查清單

在合併前確認：

- [ ] 所有 TypeScript 編譯成功（無新增錯誤）
- [ ] 所有組件正確導出
- [ ] 紅綠燈時間表邏輯正確
- [ ] 手動控制功能正常
- [ ] 開發者面板 UI 可用
- [ ] 場景範例數據完整
- [ ] 使用文檔清晰
- [ ] 所有變更已提交
- [ ] Git 歷史乾淨（有意義的 commit messages）

## 後續改進建議

完成基本功能後，可考慮：

1. **測試覆蓋** - 添加單元測試和集成測試
2. **更多交通設施** - 停止標誌、讓路標誌
3. **進階紅綠燈** - 倒數計時器、箭頭燈
4. **自動關聯** - 車輛自動感知並遵守紅綠燈
5. **場景編輯器** - 可視化編輯紅綠燈位置和時間表

---

**實作計劃完成。準備執行！** 🚀
