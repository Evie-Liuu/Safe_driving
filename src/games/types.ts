import type { ComponentType } from 'react';

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  component: ComponentType<GameProps>;
  difficulty?: 'easy' | 'medium' | 'hard';
  icon?: string;
  color?: string;
  timeLimit?: number;
}

export interface GameProps {
  onExit: () => void;
}
