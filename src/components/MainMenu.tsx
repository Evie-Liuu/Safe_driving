import type { GameConfig } from '../games/types.js';

interface MainMenuProps {
  games: GameConfig[];
  onSelectGame: (gameId: string) => void;
}

function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return '#4CAF50';
    case 'medium':
      return '#FF9800';
    case 'hard':
      return '#f44336';
  }
}

function getDifficultyLabel(difficulty: 'easy' | 'medium' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return '簡單';
    case 'medium':
      return '中等';
    case 'hard':
      return '困難';
  }
}

function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>): void {
  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
  e.currentTarget.style.transform = 'translateY(-5px)';
  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
}

function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>): void {
  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.boxShadow = 'none';
}

export function MainMenu({ games, onSelectGame }: MainMenuProps): React.ReactElement {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          color: '#fff',
          fontSize: '3rem',
          marginBottom: '3rem',
          textShadow: '0 0 20px rgba(255,255,255,0.3)',
        }}
      >
        安全駕駛訓練系統
      </h1>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '1200px',
          padding: '0 2rem',
        }}
      >
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <h2
              style={{
                color: '#fff',
                fontSize: '1.5rem',
                marginBottom: '0.5rem',
              }}
            >
              {game.name}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1rem',
                lineHeight: 1.5,
              }}
            >
              {game.description}
            </p>
            {game.difficulty && (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '1rem',
                  padding: '0.25rem 0.75rem',
                  background: getDifficultyColor(game.difficulty),
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '0.875rem',
                }}
              >
                {getDifficultyLabel(game.difficulty)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
