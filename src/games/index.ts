import type { GameConfig } from './types.js';
import { SafeDrivingGame } from './safe-driving/index.js';

export const gameRegistry: GameConfig[] = [
  {
    id: 'safe-driving',
    name: '安全駕駛訓練',
    description: '在 3D 場景中駕駛，識別道路上的危險因子，訓練安全駕駛意識。',
    component: SafeDrivingGame,
    difficulty: 'medium',
  },
];

export * from './types.js';
