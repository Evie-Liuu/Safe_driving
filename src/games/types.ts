import type { ComponentType } from 'react';

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
