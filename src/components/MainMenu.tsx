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

function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>, color: string): void {
  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
  e.currentTarget.style.transform = 'translateY(-5px)';
  e.currentTarget.style.border = `3px solid ${color}88`;
  e.currentTarget.style.boxShadow = `0 8px 0 ${color}, 0 12px 4px rgba(0,0,0,0.4)`;
}

function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>): void {
  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
  e.currentTarget.style.transform = 'translateY(0)';
  e.currentTarget.style.border = '2px solid rgba(255,255,255,0.3)';
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
              minHeight: '380px',
              padding: '2rem',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
            }}
            className='border-2 border-white/30 hover:scale-[1.02]'
            onMouseEnter={(e) => handleMouseEnter(e, game.color || '#4F46E5')}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="w-14 h-14 p-2 rounded-full shadow-lg flex items-center justify-center mb-6"
              style={{ backgroundColor: game.color || '#4F46E5' }}
            >
              <span className='material-icons text-white' style={{ fontSize: '28px' }}>{game.icon}</span>
            </div>
            <h2
              style={{
                color: '#fff',
                fontSize: '1.5rem',
                marginBottom: '0.8rem',
                fontWeight: '600',
              }}
            >
              {game.name}
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '1rem',
                lineHeight: 1.6,
                flexGrow: 1,
              }}
            >
              {game.description}
            </p>
            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {game.timeLimit ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                  <span className="material-icons" style={{ fontSize: '1.2rem' }}>timer</span>
                  <span>{game.timeLimit}s</span>
                </div>
              ) : <div></div>}
              {game.difficulty && (
                <span
                  style={{
                    padding: '0.3rem 0.8rem',
                    background: getDifficultyColor(game.difficulty),
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                  }}
                >
                  {getDifficultyLabel(game.difficulty)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
