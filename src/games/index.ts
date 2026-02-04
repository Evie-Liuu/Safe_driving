import type { GameConfig } from './types.js';
import { SafeDrivingGame } from './safe-driving/index.js';
import { BehaviorPatrolGame } from './behavior-patrol/index.js';

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

export * from './types.js';
