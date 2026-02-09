/**
 * Action types - 與 RiskEvents 一致
 */
export enum ActionType {
  MOVEMENT = 'movement',
  ANIMATION = 'animation',
  SOUND = 'sound',
  LIGHT = 'light',
}

/**
 * Actor types
 */
export enum ActorType {
  VEHICLE = 'vehicle',
  SCOOTER = 'scooter',
  PEDESTRIAN = 'pedestrian',
  BICYCLE = 'bicycle',
  OBJECT = 'object',
}

/**
 * Quiz Question
 */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

/**
 * 角色定義 - 與 RiskEvents EventActor 格式一致
 */
export interface DangerActor {
  id: string; // 角色ID，例如 'bus_1', 'scooter_1'
  name: string; // 角色名稱
  type: ActorType; // 角色類型
  model: string; // 模型路徑
  initialPosition: [number, number, number];
  initialRotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string; // 顏色（可選）
  accessoryNames?: string[]; // 配件名稱（例如手機）
  animationUrls?: string[]; // 動畫 URL 列表
}

/**
 * Base action interface
 */
export interface BaseAction {
  actorId: string; // 關聯的角色 ID
  type: ActionType;
  time: number; // 動作開始時間（秒）
  duration?: number; // 動作持續時間（秒）
}

/**
 * Movement action
 */
export interface MovementAction extends BaseAction {
  type: ActionType.MOVEMENT;
  path: [number, number, number][];
  speed: number;
  loop?: boolean;
}

/**
 * Animation action
 */
export interface AnimationAction extends BaseAction {
  type: ActionType.ANIMATION;
  name: string; // 動畫名稱
  loop?: boolean; // 是否循環播放
  clampWhenFinished?: boolean; // 播放完畢後是否保持最後姿勢（loop=false 時默認為 true）
  fadeIn?: number; // 淡入時間（秒）
  fadeOut?: number; // 淡出時間（秒）
  timeScale?: number; // 播放速度倍率（1.0 = 正常速度）
}

/**
 * Sound action
 */
export interface SoundAction extends BaseAction {
  type: ActionType.SOUND;
  soundUrl: string;
  volume?: number;
  loop?: boolean;
}

/**
 * Light action
 */
export interface LightAction extends BaseAction {
  type: ActionType.LIGHT;
  lightType: 'hazard' | 'turnLeft' | 'turnRight' | 'brake';
  enabled: boolean;
  blinkRate?: number;
}

/**
 * Union type for all actions
 */
export type DangerAction = MovementAction | AnimationAction | SoundAction | LightAction;

/**
 * 危險因子定義 - 採用 RiskEvents 的 actors + actions 結構
 */
export interface DangerFactor {
  id: string;
  name: string;
  description?: string;

  // 角色陣列（與行為分離）
  actors: DangerActor[];

  // 行為陣列（通過 actorId 關聯角色）
  actions: DangerAction[];

  // 問答題
  questions: {
    q1: QuizQuestion;
    q2: QuizQuestion;
  };

  // 反饋文字
  feedback: string[];

  // 是否已被找到
  found: boolean;
}

/**
 * 安全物件定義
 */
export interface SafeObject {
  id: string;
  name: string;
  actors: DangerActor[];
  actions: DangerAction[];
}

/**
 * 場景定義
 */
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
