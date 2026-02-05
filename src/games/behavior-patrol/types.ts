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
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  model: string;
  accessoryNames?: string[];
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
