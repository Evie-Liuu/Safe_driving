# 多遊戲模組實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重構專案為多遊戲模組架構，並實作「行為糾察隊」遊戲。

**Architecture:** 建立 `games/` 資料夾作為遊戲模組中心，每個遊戲獨立模組。主選單統一入口，共用底層系統保留在 `game/`。

**Tech Stack:** React 19, TypeScript, React Three Fiber, Three.js, Vite

---

## Task 1: 建立遊戲模組基礎結構

**Files:**
- Create: `src/games/types.ts`
- Create: `src/games/index.ts`

**Step 1: 建立遊戲類型定義**

Create `src/games/types.ts`:

```typescript
import { ComponentType } from 'react';

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  component: ComponentType<GameProps>;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameProps {
  onExit: () => void;
}
```

**Step 2: 建立遊戲註冊中心（空）**

Create `src/games/index.ts`:

```typescript
import { GameConfig } from './types';

export const gameRegistry: GameConfig[] = [];

export * from './types';
```

**Step 3: Commit**

```bash
git add src/games/types.ts src/games/index.ts
git commit -m "feat: add game module base structure"
```

---

## Task 2: 建立主選單組件

**Files:**
- Create: `src/components/MainMenu.tsx`

**Step 1: 建立主選單組件**

Create `src/components/MainMenu.tsx`:

```typescript
import { GameConfig } from '../games/types';

interface MainMenuProps {
  games: GameConfig[];
  onSelectGame: (gameId: string) => void;
}

export function MainMenu({ games, onSelectGame }: MainMenuProps) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{
        color: '#fff',
        fontSize: '3rem',
        marginBottom: '3rem',
        textShadow: '0 0 20px rgba(255,255,255,0.3)',
      }}>
        安全駕駛訓練系統
      </h1>

      <div style={{
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '1200px',
        padding: '0 2rem',
      }}>
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            style={{
              width: '300px',
              padding: '2rem',
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <h2 style={{
              color: '#fff',
              fontSize: '1.5rem',
              marginBottom: '0.5rem',
            }}>
              {game.name}
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1rem',
              lineHeight: 1.5,
            }}>
              {game.description}
            </p>
            {game.difficulty && (
              <span style={{
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.25rem 0.75rem',
                background: game.difficulty === 'easy' ? '#4CAF50' :
                           game.difficulty === 'medium' ? '#FF9800' : '#f44336',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.875rem',
              }}>
                {game.difficulty === 'easy' ? '簡單' :
                 game.difficulty === 'medium' ? '中等' : '困難'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/MainMenu.tsx
git commit -m "feat: add MainMenu component"
```

---

## Task 3: 包裝現有安全駕駛遊戲為模組

**Files:**
- Create: `src/games/safe-driving/index.ts`
- Create: `src/games/safe-driving/SafeDrivingGame.tsx`
- Modify: `src/games/index.ts`

**Step 1: 建立安全駕駛遊戲包裝組件**

Create `src/games/safe-driving/SafeDrivingGame.tsx`:

```typescript
import { GameScene } from '../../game/scenes/GameScene';
import { GameProps } from '../types';

export function SafeDrivingGame({ onExit }: GameProps) {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* 返回按鈕 */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 1000,
          padding: '10px 20px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '1rem',
        }}
      >
        ← 返回選單
      </button>

      <GameScene />
    </div>
  );
}
```

**Step 2: 建立模組導出**

Create `src/games/safe-driving/index.ts`:

```typescript
export { SafeDrivingGame } from './SafeDrivingGame';
```

**Step 3: 註冊遊戲到 registry**

Update `src/games/index.ts`:

```typescript
import { GameConfig } from './types';
import { SafeDrivingGame } from './safe-driving';

export const gameRegistry: GameConfig[] = [
  {
    id: 'safe-driving',
    name: '安全駕駛訓練',
    description: '在 3D 場景中駕駛，識別道路上的危險因子，訓練安全駕駛意識。',
    component: SafeDrivingGame,
    difficulty: 'medium',
  },
];

export * from './types';
```

**Step 4: Commit**

```bash
git add src/games/safe-driving/SafeDrivingGame.tsx src/games/safe-driving/index.ts src/games/index.ts
git commit -m "feat: wrap safe-driving game as module"
```

---

## Task 4: 重構 App.tsx 使用遊戲模組系統

**Files:**
- Modify: `src/App.tsx`

**Step 1: 重構 App.tsx**

Replace `src/App.tsx`:

```typescript
import { useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { gameRegistry } from './games';

function App() {
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // 主選單
  if (!currentGameId) {
    return (
      <MainMenu
        games={gameRegistry}
        onSelectGame={setCurrentGameId}
      />
    );
  }

  // 找到對應遊戲
  const game = gameRegistry.find(g => g.id === currentGameId);
  if (!game) {
    setCurrentGameId(null);
    return null;
  }

  const GameComponent = game.component;

  return <GameComponent onExit={() => setCurrentGameId(null)} />;
}

export default App;
```

**Step 2: 驗證現有遊戲仍可運作**

Run: `npm run dev`
Expected: 主選單顯示，點擊「安全駕駛訓練」可進入遊戲，點擊「返回選單」可返回。

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: App.tsx uses game module system"
```

---

## Task 5: 建立行為糾察隊類型定義

**Files:**
- Create: `src/games/behavior-patrol/types.ts`

**Step 1: 建立類型定義**

Create `src/games/behavior-patrol/types.ts`:

```typescript
export interface DangerBehavior {
  type: 'movement' | 'animation';
  // 移動行為
  path?: [number, number, number][];
  speed?: number;
  loop?: boolean;
  // 動畫行為
  animation?: string;
  animationLoop?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface DangerFactor {
  id: string;
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  model: string;
  animationUrls?: string[];
  behaviors: DangerBehavior[];
  questions: {
    q1: QuizQuestion;
    q2: QuizQuestion;
  };
  feedback: string;
  found: boolean;
}

export interface SafeObject {
  id: string;
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  model: string;
  animationUrls?: string[];
  behaviors: DangerBehavior[];
}

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
}

export type GameStatus = 'ready' | 'playing' | 'paused' | 'quiz' | 'feedback' | 'won' | 'lost';

export interface GameProgress {
  timeRemaining: number;
  lives: number;
  foundCount: number;
  totalDangers: number;
  score: number;
  status: GameStatus;
}

export interface QuizResult {
  q1Correct: boolean;
  q2Correct: boolean;
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/types.ts
git commit -m "feat: add behavior-patrol type definitions"
```

---

## Task 6: 建立行為糾察隊場景資料

**Files:**
- Create: `src/games/behavior-patrol/data/PatrolScenario_1.ts`

**Step 1: 建立場景資料**

Create `src/games/behavior-patrol/data/PatrolScenario_1.ts`:

```typescript
import { PatrolScenario } from '../types';

export const patrolScenario1: PatrolScenario = {
  id: 'scenario-1',
  name: '十字路口場景',
  description: '觀察繁忙的十字路口，找出危險行為',
  timeLimit: 60,
  maxLives: 3,

  scene: {
    environment: 'city-intersection',
    cameraPosition: [0, 20, 35],
    cameraLookAt: [0, 0, 0],
  },

  dangers: [
    {
      id: 'danger-1',
      name: '闯红灯行人',
      position: [8, 0, 5],
      rotation: [0, -Math.PI / 2, 0],
      model: '/src/assets/models/Male1_Rigged.glb',
      animationUrls: ['/src/assets/models/animations/Male_Walking_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Armature|mixamo.com|Layer0', animationLoop: true },
        { type: 'movement', path: [[8, 0, 5], [8, 0, -5]], speed: 1.5, loop: false },
      ],
      questions: {
        q1: {
          question: '這個行為為什麼危險？',
          options: ['會造成交通堵塞', '可能被車輛撞到', '會被開罰單', '沒有危險'],
          correctIndex: 1,
        },
        q2: {
          question: '駕駛應該如何應對？',
          options: ['加速通過', '按喇叭警告', '減速並注意行人動向', '不需要理會'],
          correctIndex: 2,
        },
      },
      feedback: '行人闯红灯時，駕駛應保持警覺，減速觀察行人動向，必要時停車禮讓，避免發生事故。',
      found: false,
    },
    {
      id: 'danger-2',
      name: '未打方向燈變換車道',
      position: [-15, 0, 3],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Car_2.glb',
      behaviors: [
        { type: 'movement', path: [[-15, 0, 3], [15, 0, -1]], speed: 6, loop: true },
      ],
      questions: {
        q1: {
          question: '這個駕駛行為有什麼問題？',
          options: ['車速過快', '未打方向燈變換車道', '闯红灯', '逆向行駛'],
          correctIndex: 1,
        },
        q2: {
          question: '這會造成什麼危險？',
          options: ['噪音污染', '後方車輛無法預判導致碰撞', '浪費燃油', '沒有危險'],
          correctIndex: 1,
        },
      },
      feedback: '變換車道時必須提前打方向燈，讓後方車輛有足夠時間反應，避免碰撞事故。',
      found: false,
    },
    {
      id: 'danger-3',
      name: '機車鑽車縫',
      position: [5, 0, -10],
      rotation: [0, Math.PI, 0],
      scale: [0.8, 0.8, 0.8],
      model: '/src/assets/models/Car_1.glb',
      behaviors: [
        { type: 'movement', path: [[5, 0, -10], [-5, 0, -8], [5, 0, -6], [-5, 0, -4]], speed: 8, loop: true },
      ],
      questions: {
        q1: {
          question: '機車鑽車縫的主要危險是什麼？',
          options: ['會刮傷車輛', '容易發生碰撞', '會被檢舉', '沒有危險'],
          correctIndex: 1,
        },
        q2: {
          question: '汽車駕駛如何預防此類事故？',
          options: ['加速離開', '變換車道時多看後照鏡', '按喇叭警告', '不需要注意'],
          correctIndex: 1,
        },
      },
      feedback: '機車鑽車縫容易處於汽車駕駛的視線死角，汽車駕駛變換車道時應多注意後照鏡和死角區域。',
      found: false,
    },
    {
      id: 'danger-4',
      name: '路邊違停車輛',
      position: [-8, 0, 8],
      rotation: [0, Math.PI / 2, 0],
      model: '/src/assets/models/Car_3.glb',
      behaviors: [],
      questions: {
        q1: {
          question: '路邊違停車輛會造成什麼危險？',
          options: ['阻擋視線，可能有行人突然竄出', '噪音污染', '空氣污染', '沒有危險'],
          correctIndex: 0,
        },
        q2: {
          question: '經過違停車輛時應該如何駕駛？',
          options: ['加速通過', '減速並保持警戒，注意是否有人竄出', '按喇叭示警', '靠近違停車輛行駛'],
          correctIndex: 1,
        },
      },
      feedback: '路邊違停車輛會阻擋視線，可能有行人從車輛間突然竄出，經過時應減速並保持警戒。',
      found: false,
    },
    {
      id: 'danger-5',
      name: '兒童追球衝出',
      position: [12, 0, -3],
      rotation: [0, -Math.PI / 2, 0],
      scale: [0.7, 0.7, 0.7],
      model: '/src/assets/models/Male1_Rigged.glb',
      animationUrls: ['/src/assets/models/animations/Male_Running_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Armature|mixamo.com|Layer0', animationLoop: true },
        { type: 'movement', path: [[12, 0, -3], [12, 0, 3]], speed: 3, loop: false },
      ],
      questions: {
        q1: {
          question: '為什麼兒童特別容易發生這種危險？',
          options: ['兒童體型小不容易被看見', '兒童專注於玩耍忽略交通安全', '以上皆是', '兒童很安全'],
          correctIndex: 2,
        },
        q2: {
          question: '在住宅區或學校附近駕駛時應該？',
          options: ['保持正常速度', '減速慢行，隨時準備煞車', '按喇叭警告', '加速通過'],
          correctIndex: 1,
        },
      },
      feedback: '兒童因體型小且專注於玩耍，容易忽略交通安全。在住宅區、學校附近應減速慢行，隨時準備應對突發狀況。',
      found: false,
    },
  ],

  safeObjects: [
    {
      id: 'safe-1',
      name: '正常行駛車輛',
      position: [-20, 0, 0],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Car_1.glb',
      behaviors: [
        { type: 'movement', path: [[-20, 0, 0], [20, 0, 0]], speed: 5, loop: true },
      ],
    },
    {
      id: 'safe-2',
      name: '等紅燈行人',
      position: [-6, 0, 6],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Male1_Rigged.glb',
      animationUrls: ['/src/assets/models/animations/Male_Idle_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Armature|mixamo.com|Layer0', animationLoop: true },
      ],
    },
  ],
};
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/data/PatrolScenario_1.ts
git commit -m "feat: add behavior-patrol scenario data"
```

---

## Task 7: 建立遊戲狀態管理 Hook

**Files:**
- Create: `src/games/behavior-patrol/hooks/useGameState.ts`
- Create: `src/games/behavior-patrol/hooks/useTimer.ts`

**Step 1: 建立計時器 Hook**

Create `src/games/behavior-patrol/hooks/useTimer.ts`:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTimerOptions {
  initialTime: number;
  onTimeUp?: () => void;
}

export function useTimer({ initialTime, onTimeUp }: UseTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Keep callback ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          onTimeUpRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (timeRemaining > 0 && !intervalRef.current) {
      start();
    }
  }, [timeRemaining, start]);

  const reset = useCallback((newTime?: number) => {
    pause();
    setTimeRemaining(newTime ?? initialTime);
  }, [pause, initialTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timeRemaining,
    isRunning,
    start,
    pause,
    resume,
    reset,
  };
}
```

**Step 2: 建立遊戲狀態管理 Hook**

Create `src/games/behavior-patrol/hooks/useGameState.ts`:

```typescript
import { useState, useCallback } from 'react';
import { GameStatus, GameProgress, DangerFactor, QuizResult } from '../types';

interface UseGameStateOptions {
  totalDangers: number;
  maxLives: number;
  timeLimit: number;
}

export function useGameState({ totalDangers, maxLives, timeLimit }: UseGameStateOptions) {
  const [status, setStatus] = useState<GameStatus>('ready');
  const [lives, setLives] = useState(maxLives);
  const [foundCount, setFoundCount] = useState(0);
  const [score, setScore] = useState(0);
  const [currentDanger, setCurrentDanger] = useState<DangerFactor | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const startGame = useCallback(() => {
    setStatus('playing');
    setLives(maxLives);
    setFoundCount(0);
    setScore(0);
    setCurrentDanger(null);
    setQuizResult(null);
  }, [maxLives]);

  const handleCorrectClick = useCallback((danger: DangerFactor) => {
    setCurrentDanger(danger);
    setStatus('quiz');
  }, []);

  const handleWrongClick = useCallback(() => {
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setStatus('lost');
      }
      return newLives;
    });
  }, []);

  const handleQuizSubmit = useCallback((q1Answer: number, q2Answer: number) => {
    if (!currentDanger) return;

    const q1Correct = q1Answer === currentDanger.questions.q1.correctIndex;
    const q2Correct = q2Answer === currentDanger.questions.q2.correctIndex;

    setQuizResult({ q1Correct, q2Correct });

    // Calculate score: 10 points per correct answer
    const points = (q1Correct ? 10 : 0) + (q2Correct ? 10 : 0);
    setScore((prev) => prev + points);
    setFoundCount((prev) => prev + 1);

    setStatus('feedback');
  }, [currentDanger]);

  const handleContinue = useCallback(() => {
    setCurrentDanger(null);
    setQuizResult(null);

    // Check if all dangers found
    if (foundCount + 1 >= totalDangers) {
      setStatus('won');
    } else {
      setStatus('playing');
    }
  }, [foundCount, totalDangers]);

  const handleTimeUp = useCallback(() => {
    if (status === 'playing') {
      setStatus('lost');
    }
  }, [status]);

  const resetGame = useCallback(() => {
    setStatus('ready');
    setLives(maxLives);
    setFoundCount(0);
    setScore(0);
    setCurrentDanger(null);
    setQuizResult(null);
  }, [maxLives]);

  const progress: GameProgress = {
    timeRemaining: timeLimit,
    lives,
    foundCount,
    totalDangers,
    score,
    status,
  };

  return {
    progress,
    status,
    lives,
    foundCount,
    score,
    currentDanger,
    quizResult,
    startGame,
    handleCorrectClick,
    handleWrongClick,
    handleQuizSubmit,
    handleContinue,
    handleTimeUp,
    resetGame,
  };
}
```

**Step 3: 建立 hooks 索引**

Create `src/games/behavior-patrol/hooks/index.ts`:

```typescript
export { useGameState } from './useGameState';
export { useTimer } from './useTimer';
```

**Step 4: Commit**

```bash
git add src/games/behavior-patrol/hooks/
git commit -m "feat: add behavior-patrol game state hooks"
```

---

## Task 8: 建立 UI 組件 - GameHUD

**Files:**
- Create: `src/games/behavior-patrol/components/GameHUD.tsx`

**Step 1: 建立 GameHUD 組件**

Create `src/games/behavior-patrol/components/GameHUD.tsx`:

```typescript
interface GameHUDProps {
  lives: number;
  maxLives: number;
  timeRemaining: number;
  foundCount: number;
  totalDangers: number;
  onExit: () => void;
}

export function GameHUD({
  lives,
  maxLives,
  timeRemaining,
  foundCount,
  totalDangers,
  onExit,
}: GameHUDProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      {/* 左側：返回按鈕 + 生命值 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto' }}>
        <button
          onClick={onExit}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          ← 返回選單
        </button>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px 15px',
          borderRadius: '8px',
          display: 'flex',
          gap: '5px',
        }}>
          {Array.from({ length: maxLives }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: '1.5rem',
                filter: i < lives ? 'none' : 'grayscale(1)',
                opacity: i < lives ? 1 : 0.3,
              }}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* 右側：計時器 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 20px',
        borderRadius: '8px',
        color: timeRemaining <= 10 ? '#ff4444' : 'white',
        fontSize: '1.5rem',
        fontFamily: 'monospace',
        fontWeight: 'bold',
      }}>
        ⏱️ {formatTime(timeRemaining)}
      </div>

      {/* 底部中央：進度 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 25px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '1.1rem',
      }}>
        進度：{foundCount} / {totalDangers} 已找到
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/components/GameHUD.tsx
git commit -m "feat: add GameHUD component"
```

---

## Task 9: 建立 UI 組件 - QuizModal

**Files:**
- Create: `src/games/behavior-patrol/components/QuizModal.tsx`

**Step 1: 建立 QuizModal 組件**

Create `src/games/behavior-patrol/components/QuizModal.tsx`:

```typescript
import { useState } from 'react';
import { DangerFactor } from '../types';

interface QuizModalProps {
  danger: DangerFactor;
  onSubmit: (q1Answer: number, q2Answer: number) => void;
}

export function QuizModal({ danger, onSubmit }: QuizModalProps) {
  const [q1Answer, setQ1Answer] = useState<number | null>(null);
  const [q2Answer, setQ2Answer] = useState<number | null>(null);

  const handleSubmit = () => {
    if (q1Answer !== null && q2Answer !== null) {
      onSubmit(q1Answer, q2Answer);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white',
      }}>
        {/* 標題 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <span style={{ fontSize: '2rem', marginRight: '10px' }}>🔍</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>發現危險：{danger.name}</span>
        </div>

        {/* Q1 */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 'bold' }}>
            Q1: {danger.questions.q1.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {danger.questions.q1.options.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 15px',
                  background: q1Answer === index ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: q1Answer === index ? '2px solid #4CAF50' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="q1"
                  checked={q1Answer === index}
                  onChange={() => setQ1Answer(index)}
                  style={{ marginRight: '12px', width: '18px', height: '18px' }}
                />
                <span>{optionLabels[index]}. {option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 'bold' }}>
            Q2: {danger.questions.q2.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {danger.questions.q2.options.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 15px',
                  background: q2Answer === index ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: q2Answer === index ? '2px solid #4CAF50' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="q2"
                  checked={q2Answer === index}
                  onChange={() => setQ2Answer(index)}
                  style={{ marginRight: '12px', width: '18px', height: '18px' }}
                />
                <span>{optionLabels[index]}. {option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 送出按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={q1Answer === null || q2Answer === null}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: q1Answer !== null && q2Answer !== null ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: q1Answer !== null && q2Answer !== null ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          確認送出
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/components/QuizModal.tsx
git commit -m "feat: add QuizModal component"
```

---

## Task 10: 建立 UI 組件 - FeedbackPanel

**Files:**
- Create: `src/games/behavior-patrol/components/FeedbackPanel.tsx`

**Step 1: 建立 FeedbackPanel 組件**

Create `src/games/behavior-patrol/components/FeedbackPanel.tsx`:

```typescript
import { DangerFactor, QuizResult } from '../types';

interface FeedbackPanelProps {
  danger: DangerFactor;
  result: QuizResult;
  onContinue: () => void;
}

export function FeedbackPanel({ danger, result, onContinue }: FeedbackPanelProps) {
  const optionLabels = ['A', 'B', 'C', 'D'];
  const bothCorrect = result.q1Correct && result.q2Correct;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white',
      }}>
        {/* 結果標題 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <span style={{ fontSize: '3rem' }}>{bothCorrect ? '🎉' : '📝'}</span>
          <h2 style={{
            fontSize: '1.5rem',
            marginTop: '10px',
            color: bothCorrect ? '#4CAF50' : '#FF9800',
          }}>
            {bothCorrect ? '完全正確！' : '部分正確'}
          </h2>
        </div>

        {/* 答題結果 */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
            padding: '10px 15px',
            background: result.q1Correct ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{result.q1Correct ? '✅' : '❌'}</span>
            <span>Q1: {result.q1Correct ? '正確' : '錯誤'}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 15px',
            background: result.q2Correct ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{result.q2Correct ? '✅' : '❌'}</span>
            <span>Q2: {result.q2Correct ? '正確' : '錯誤'}</span>
          </div>
        </div>

        {/* 正確答案顯示（如果有錯誤） */}
        {(!result.q1Correct || !result.q2Correct) && (
          <div style={{
            marginBottom: '25px',
            padding: '15px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>正確答案：</p>
            {!result.q1Correct && (
              <p style={{ marginBottom: '5px', color: '#4CAF50' }}>
                Q1 應選 {optionLabels[danger.questions.q1.correctIndex]}. {danger.questions.q1.options[danger.questions.q1.correctIndex]}
              </p>
            )}
            {!result.q2Correct && (
              <p style={{ color: '#4CAF50' }}>
                Q2 應選 {optionLabels[danger.questions.q2.correctIndex]}. {danger.questions.q2.options[danger.questions.q2.correctIndex]}
              </p>
            )}
          </div>
        )}

        {/* 說明 */}
        <div style={{
          marginBottom: '25px',
          padding: '15px',
          background: 'rgba(255, 193, 7, 0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid #FFC107',
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span> 說明：
          </p>
          <p style={{ lineHeight: 1.6 }}>{danger.feedback}</p>
        </div>

        {/* 繼續按鈕 */}
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          繼續遊戲
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/components/FeedbackPanel.tsx
git commit -m "feat: add FeedbackPanel component"
```

---

## Task 11: 建立 UI 組件 - ResultScreen

**Files:**
- Create: `src/games/behavior-patrol/components/ResultScreen.tsx`

**Step 1: 建立 ResultScreen 組件**

Create `src/games/behavior-patrol/components/ResultScreen.tsx`:

```typescript
import { GameProgress } from '../types';

interface ResultScreenProps {
  progress: GameProgress;
  onRestart: () => void;
  onExit: () => void;
}

export function ResultScreen({ progress, onRestart, onExit }: ResultScreenProps) {
  const isWin = progress.status === 'won';
  const maxScore = progress.totalDangers * 20; // 每題 10 分，兩題
  const percentage = Math.round((progress.score / maxScore) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'S', color: '#FFD700' };
    if (percentage >= 80) return { grade: 'A', color: '#4CAF50' };
    if (percentage >= 70) return { grade: 'B', color: '#8BC34A' };
    if (percentage >= 60) return { grade: 'C', color: '#FF9800' };
    if (percentage >= 50) return { grade: 'D', color: '#FF5722' };
    return { grade: 'F', color: '#f44336' };
  };

  const { grade, color } = getGrade();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        color: 'white',
      }}>
        {/* 結果標題 */}
        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
          {isWin ? '🎉' : '😔'}
        </div>
        <h1 style={{
          fontSize: '2rem',
          marginBottom: '30px',
          color: isWin ? '#4CAF50' : '#f44336',
        }}>
          {isWin ? '任務完成！' : '任務失敗'}
        </h1>

        {/* 等級 */}
        <div style={{
          fontSize: '5rem',
          fontWeight: 'bold',
          color: color,
          textShadow: `0 0 30px ${color}`,
          marginBottom: '20px',
        }}>
          {grade}
        </div>

        {/* 分數統計 */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
            fontSize: '1.1rem',
          }}>
            <span>找到危險因子</span>
            <span>{progress.foundCount} / {progress.totalDangers}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
            fontSize: '1.1rem',
          }}>
            <span>答題得分</span>
            <span>{progress.score} / {maxScore}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
            fontSize: '1.1rem',
          }}>
            <span>剩餘生命</span>
            <span>{'❤️'.repeat(progress.lives)}{'🖤'.repeat(3 - progress.lives)}</span>
          </div>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.3rem',
            fontWeight: 'bold',
          }}>
            <span>正確率</span>
            <span style={{ color }}>{percentage}%</span>
          </div>
        </div>

        {/* 按鈕 */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={onRestart}
            style={{
              flex: 1,
              padding: '15px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            再玩一次
          </button>
          <button
            onClick={onExit}
            style={{
              flex: 1,
              padding: '15px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            返回選單
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/components/ResultScreen.tsx
git commit -m "feat: add ResultScreen component"
```

---

## Task 12: 建立可點擊的危險物件組件

**Files:**
- Create: `src/games/behavior-patrol/components/ClickableObject.tsx`

**Step 1: 建立 ClickableObject 組件**

Create `src/games/behavior-patrol/components/ClickableObject.tsx`:

```typescript
import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { DangerBehavior } from '../types';
import { AnimationController } from '../../../game/animations/AnimationController';
import { getSharedLoader } from '../../../game/utils/SharedLoader';

interface ClickableObjectProps {
  id: string;
  model: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  behaviors: DangerBehavior[];
  animationUrls?: string[];
  onClick: () => void;
  disabled?: boolean;
  found?: boolean;
}

export function ClickableObject({
  id,
  model,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  behaviors,
  animationUrls,
  onClick,
  disabled = false,
  found = false,
}: ClickableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(model);
  const [clonedScene, setClonedScene] = useState<THREE.Group | null>(null);
  const animControllerRef = useRef<AnimationController | null>(null);
  const pathProgressRef = useRef(0);
  const currentPathIndexRef = useRef(0);

  // Clone the scene to avoid sharing issues
  useEffect(() => {
    const clone = scene.clone(true);
    setClonedScene(clone);

    return () => {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    };
  }, [scene]);

  // Load animations
  useEffect(() => {
    if (!clonedScene || !animationUrls || animationUrls.length === 0) return;

    const loadAnimations = async () => {
      const loader = getSharedLoader();
      for (const url of animationUrls) {
        try {
          const gltf = await loader.loadAsync(url);
          if (!animControllerRef.current) {
            animControllerRef.current = new AnimationController(clonedScene);
          }
          animControllerRef.current.loadSeparateAnimations(gltf, clonedScene);
        } catch (error) {
          console.error(`Failed to load animation: ${url}`, error);
        }
      }

      // Start animation behaviors
      const animBehavior = behaviors.find(b => b.type === 'animation');
      if (animBehavior?.animation && animControllerRef.current) {
        animControllerRef.current.play(animBehavior.animation, {
          loop: animBehavior.animationLoop ?? true,
        });
      }
    };

    loadAnimations();

    return () => {
      animControllerRef.current?.stopAll();
    };
  }, [clonedScene, animationUrls, behaviors]);

  // Update animations and movement
  useFrame((_, delta) => {
    if (!groupRef.current || found) return;

    // Update animation
    animControllerRef.current?.update(delta);

    // Handle movement behavior
    const movementBehavior = behaviors.find(b => b.type === 'movement');
    if (movementBehavior?.path && movementBehavior.path.length >= 2) {
      const path = movementBehavior.path;
      const speed = movementBehavior.speed ?? 1;
      const loop = movementBehavior.loop ?? false;

      const currentIndex = currentPathIndexRef.current;
      const nextIndex = (currentIndex + 1) % path.length;

      if (nextIndex === 0 && !loop) {
        // Reached end, stop
        return;
      }

      const start = new THREE.Vector3(...path[currentIndex]);
      const end = new THREE.Vector3(...path[nextIndex]);
      const distance = start.distanceTo(end);
      const duration = distance / speed;

      pathProgressRef.current += delta / duration;

      if (pathProgressRef.current >= 1) {
        pathProgressRef.current = 0;
        currentPathIndexRef.current = nextIndex;
        if (nextIndex === 0 && loop) {
          groupRef.current.position.set(...path[0]);
        }
      } else {
        const newPos = start.clone().lerp(end, pathProgressRef.current);
        groupRef.current.position.copy(newPos);

        // Face movement direction
        const direction = end.clone().sub(start).normalize();
        if (direction.length() > 0) {
          const angle = Math.atan2(direction.x, direction.z);
          groupRef.current.rotation.y = angle;
        }
      }
    }
  });

  if (!clonedScene) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !found) {
          onClick();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!disabled && !found) {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={clonedScene} />
      {/* Visual indicator when found */}
      {found && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#4CAF50" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/components/ClickableObject.tsx
git commit -m "feat: add ClickableObject component with behavior support"
```

---

## Task 13: 建立 3D 場景組件

**Files:**
- Create: `src/games/behavior-patrol/components/PatrolScene.tsx`

**Step 1: 建立 PatrolScene 組件**

Create `src/games/behavior-patrol/components/PatrolScene.tsx`:

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Environment } from '../../../game/components/Environment';
import { ClickableObject } from './ClickableObject';
import { PatrolScenario, DangerFactor } from '../types';

interface PatrolSceneProps {
  scenario: PatrolScenario;
  foundDangerIds: Set<string>;
  disabled: boolean;
  onDangerClick: (danger: DangerFactor) => void;
  onSafeClick: () => void;
}

export function PatrolScene({
  scenario,
  foundDangerIds,
  disabled,
  onDangerClick,
  onSafeClick,
}: PatrolSceneProps) {
  return (
    <Canvas shadows>
      <PerspectiveCamera
        makeDefault
        position={scenario.scene.cameraPosition}
        fov={60}
      />
      <OrbitControls
        target={scenario.scene.cameraLookAt}
        enablePan={false}
        enableZoom={true}
        minDistance={15}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
      />

      <Environment />

      {/* 危險因子 */}
      {scenario.dangers.map((danger) => (
        <ClickableObject
          key={danger.id}
          id={danger.id}
          model={danger.model}
          position={danger.position}
          rotation={danger.rotation}
          scale={danger.scale}
          behaviors={danger.behaviors}
          animationUrls={danger.animationUrls}
          onClick={() => onDangerClick(danger)}
          disabled={disabled}
          found={foundDangerIds.has(danger.id)}
        />
      ))}

      {/* 安全物件 */}
      {scenario.safeObjects.map((obj) => (
        <ClickableObject
          key={obj.id}
          id={obj.id}
          model={obj.model}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          behaviors={obj.behaviors}
          animationUrls={obj.animationUrls}
          onClick={onSafeClick}
          disabled={disabled}
        />
      ))}
    </Canvas>
  );
}
```

**Step 2: Commit**

```bash
git add src/games/behavior-patrol/components/PatrolScene.tsx
git commit -m "feat: add PatrolScene component"
```

---

## Task 14: 建立組件索引與主遊戲組件

**Files:**
- Create: `src/games/behavior-patrol/components/index.ts`
- Create: `src/games/behavior-patrol/BehaviorPatrolGame.tsx`
- Create: `src/games/behavior-patrol/index.ts`

**Step 1: 建立組件索引**

Create `src/games/behavior-patrol/components/index.ts`:

```typescript
export { GameHUD } from './GameHUD';
export { QuizModal } from './QuizModal';
export { FeedbackPanel } from './FeedbackPanel';
export { ResultScreen } from './ResultScreen';
export { ClickableObject } from './ClickableObject';
export { PatrolScene } from './PatrolScene';
```

**Step 2: 建立主遊戲組件**

Create `src/games/behavior-patrol/BehaviorPatrolGame.tsx`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { GameProps } from '../types';
import { GameHUD, QuizModal, FeedbackPanel, ResultScreen, PatrolScene } from './components';
import { useGameState, useTimer } from './hooks';
import { patrolScenario1 } from './data/PatrolScenario_1';
import { DangerFactor } from './types';

export function BehaviorPatrolGame({ onExit }: GameProps) {
  const scenario = patrolScenario1;
  const [foundDangerIds, setFoundDangerIds] = useState<Set<string>>(new Set());

  const {
    progress,
    status,
    lives,
    foundCount,
    score,
    currentDanger,
    quizResult,
    startGame,
    handleCorrectClick,
    handleWrongClick,
    handleQuizSubmit,
    handleContinue,
    handleTimeUp,
    resetGame,
  } = useGameState({
    totalDangers: scenario.dangers.length,
    maxLives: scenario.maxLives,
    timeLimit: scenario.timeLimit,
  });

  const { timeRemaining, start: startTimer, pause: pauseTimer, reset: resetTimer, resume: resumeTimer } = useTimer({
    initialTime: scenario.timeLimit,
    onTimeUp: handleTimeUp,
  });

  // Start game
  const handleStart = useCallback(() => {
    startGame();
    resetTimer();
    startTimer();
    setFoundDangerIds(new Set());
  }, [startGame, resetTimer, startTimer]);

  // Pause timer when in quiz or feedback
  useEffect(() => {
    if (status === 'quiz' || status === 'feedback') {
      pauseTimer();
    } else if (status === 'playing') {
      resumeTimer();
    }
  }, [status, pauseTimer, resumeTimer]);

  // Handle danger click
  const onDangerClick = useCallback((danger: DangerFactor) => {
    if (foundDangerIds.has(danger.id)) return;
    setFoundDangerIds((prev) => new Set(prev).add(danger.id));
    handleCorrectClick(danger);
  }, [foundDangerIds, handleCorrectClick]);

  // Handle safe object click (wrong)
  const onSafeClick = useCallback(() => {
    handleWrongClick();
  }, [handleWrongClick]);

  // Handle continue after feedback
  const onContinue = useCallback(() => {
    handleContinue();
  }, [handleContinue]);

  // Handle restart
  const handleRestart = useCallback(() => {
    resetGame();
    resetTimer();
    setFoundDangerIds(new Set());
  }, [resetGame, resetTimer]);

  const isGameActive = status === 'playing' || status === 'quiz' || status === 'feedback';
  const showScene = status !== 'ready';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 開始畫面 */}
      {status === 'ready' && (
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍 行為糾察隊</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
            {scenario.name}
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '2rem', color: 'rgba(255,255,255,0.6)' }}>
            {scenario.description}
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '20px 30px',
            borderRadius: '12px',
            marginBottom: '2rem',
            textAlign: 'left',
          }}>
            <p style={{ marginBottom: '10px' }}>⏱️ 時間限制：{scenario.timeLimit} 秒</p>
            <p style={{ marginBottom: '10px' }}>🔍 危險因子：{scenario.dangers.length} 個</p>
            <p>❤️ 錯誤機會：{scenario.maxLives} 次</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleStart}
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              開始遊戲
            </button>
            <button
              onClick={onExit}
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              返回選單
            </button>
          </div>
        </div>
      )}

      {/* 遊戲場景 */}
      {showScene && (
        <>
          <PatrolScene
            scenario={scenario}
            foundDangerIds={foundDangerIds}
            disabled={status !== 'playing'}
            onDangerClick={onDangerClick}
            onSafeClick={onSafeClick}
          />

          {/* HUD */}
          {isGameActive && (
            <GameHUD
              lives={lives}
              maxLives={scenario.maxLives}
              timeRemaining={timeRemaining}
              foundCount={foundCount}
              totalDangers={scenario.dangers.length}
              onExit={onExit}
            />
          )}
        </>
      )}

      {/* 問答彈窗 */}
      {status === 'quiz' && currentDanger && (
        <QuizModal
          danger={currentDanger}
          onSubmit={handleQuizSubmit}
        />
      )}

      {/* 回饋面板 */}
      {status === 'feedback' && currentDanger && quizResult && (
        <FeedbackPanel
          danger={currentDanger}
          result={quizResult}
          onContinue={onContinue}
        />
      )}

      {/* 結果畫面 */}
      {(status === 'won' || status === 'lost') && (
        <ResultScreen
          progress={{ ...progress, timeRemaining, score, foundCount }}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
```

**Step 3: 建立模組導出**

Create `src/games/behavior-patrol/index.ts`:

```typescript
export { BehaviorPatrolGame } from './BehaviorPatrolGame';
export * from './types';
```

**Step 4: Commit**

```bash
git add src/games/behavior-patrol/components/index.ts src/games/behavior-patrol/BehaviorPatrolGame.tsx src/games/behavior-patrol/index.ts
git commit -m "feat: add BehaviorPatrolGame main component"
```

---

## Task 15: 註冊行為糾察隊遊戲

**Files:**
- Modify: `src/games/index.ts`

**Step 1: 更新遊戲註冊**

Update `src/games/index.ts`:

```typescript
import { GameConfig } from './types';
import { SafeDrivingGame } from './safe-driving';
import { BehaviorPatrolGame } from './behavior-patrol';

export const gameRegistry: GameConfig[] = [
  {
    id: 'safe-driving',
    name: '安全駕駛訓練',
    description: '在 3D 場景中駕駛，識別道路上的危險因子，訓練安全駕駛意識。',
    component: SafeDrivingGame,
    difficulty: 'medium',
  },
  {
    id: 'behavior-patrol',
    name: '行為糾察隊',
    description: '觀察 3D 場景，在限時內找出危險行為並回答問題。',
    component: BehaviorPatrolGame,
    difficulty: 'easy',
  },
];

export * from './types';
```

**Step 2: 驗證遊戲運作**

Run: `npm run dev`
Expected:
- 主選單顯示兩個遊戲
- 點擊「行為糾察隊」可進入遊戲
- 開始畫面顯示場景資訊
- 點擊「開始遊戲」進入 3D 場景
- 可點擊危險因子觸發問答
- 點擊安全物件扣生命
- 完成或失敗後顯示結果畫面

**Step 3: Commit**

```bash
git add src/games/index.ts
git commit -m "feat: register behavior-patrol game"
```

---

## Task 16: 最終驗證與清理

**Step 1: 執行完整測試**

Run: `npm run dev`

驗證項目：
1. 主選單正常顯示
2. 安全駕駛訓練可正常遊玩
3. 行為糾察隊可正常遊玩
4. 返回選單功能正常
5. 無 console 錯誤

**Step 2: 建立功能提交**

```bash
git add -A
git commit -m "feat: complete multi-game module architecture

- Add game registry system
- Add MainMenu component
- Wrap safe-driving as game module
- Implement behavior-patrol game with:
  - 60 second time limit
  - 5 danger factors with behaviors
  - Quiz system (Q1+Q2)
  - Feedback panel with explanation
  - Lives system (3 chances)
  - Result screen with grade"
```

---

## Summary

完成後的檔案結構：

```
src/
├── App.tsx                              # 遊戲路由入口
├── components/
│   └── MainMenu.tsx                     # 主選單
├── games/
│   ├── index.ts                         # 遊戲註冊中心
│   ├── types.ts                         # 共用類型
│   ├── safe-driving/
│   │   ├── index.ts
│   │   └── SafeDrivingGame.tsx
│   └── behavior-patrol/
│       ├── index.ts
│       ├── BehaviorPatrolGame.tsx
│       ├── types.ts
│       ├── components/
│       │   ├── index.ts
│       │   ├── GameHUD.tsx
│       │   ├── QuizModal.tsx
│       │   ├── FeedbackPanel.tsx
│       │   ├── ResultScreen.tsx
│       │   ├── ClickableObject.tsx
│       │   └── PatrolScene.tsx
│       ├── hooks/
│       │   ├── index.ts
│       │   ├── useGameState.ts
│       │   └── useTimer.ts
│       └── data/
│           └── PatrolScenario_1.ts
└── game/                                # 共用系統（保留）
```
