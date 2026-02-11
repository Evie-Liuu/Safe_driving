import type { GameConfig } from './types.js';
import { SafeDrivingGame } from './safe-driving/index.js';
import { BehaviorPatrolGame } from './behavior-patrol/index.js';

export const gameRegistry: GameConfig[] = [
  {
    id: 'behavior-patrol',
    name: '行為糾察隊',
    description: '觀察 3D 場景，在限時內找出危險行為並回答問題。',
    component: BehaviorPatrolGame,
    difficulty: 'easy',
    icon: 'sports_esports',
    color: '#4CAF50',
    timeLimit: 60,
  },
  {
    id: 'safe-driving',
    name: '風險預判模擬',
    description: '在 3D 場景中駕駛，識別道路上的危險因子，訓練安全駕駛意識。',
    component: SafeDrivingGame,
    difficulty: 'medium',
    icon: 'sports_esports',
  },
  {
    id: 'brake-reaction',
    name: '間距與速度',
    description: '在不同情境選擇合理速度與跟車距離，避免追撞與急煞風險。',
    component: SafeDrivingGame,
    difficulty: 'medium',
    icon: 'sports_esports',
  },
];

export * from './types.js';
