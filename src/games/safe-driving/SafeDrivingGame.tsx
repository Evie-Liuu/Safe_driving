import { GameScene } from '../../game/scenes/GameScene.js';
import type { GameProps } from '../types.js';

export function SafeDrivingGame({ onExit }: GameProps): JSX.Element {
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
