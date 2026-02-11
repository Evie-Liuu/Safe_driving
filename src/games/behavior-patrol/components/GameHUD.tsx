interface GameHUDProps {
  lives: number;
  maxLives: number;
  timeRemaining: number;
  foundCount: number;
  totalDangers: number;
  onExit: () => void;
}

export function GameHUD({
  lives,
  maxLives,
  timeRemaining,
  foundCount,
  totalDangers,
  onExit,
}: GameHUDProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      {/* 左側：返回按鈕 + 生命值 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto' }}>
        <button
          onClick={onExit}
          style={{
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          ← 返回選單
        </button>
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '10px 15px',
          borderRadius: '8px',
          display: 'flex',
          gap: '5px',
        }}>
          {Array.from({ length: maxLives }).map((_, i) => (
            <span
              key={i}
              style={{
                fontSize: '1.5rem',
                filter: i < lives ? 'none' : 'grayscale(1)',
                opacity: i < lives ? 1 : 0.3,
              }}
            >
              ♥️
            </span>
          ))}
        </div>
      </div>

      {/* 右側：計時器 */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 20px',
        borderRadius: '8px',
        color: timeRemaining <= 10 ? '#ff4444' : 'white',
        fontSize: '1.5rem',
        fontFamily: 'monospace',
        fontWeight: 'bold',
      }}>
        ⏱️ {formatTime(timeRemaining)}
      </div>

      {/* 底部中央：進度 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px 25px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '1.1rem',
      }}>
        進度：{foundCount} / {totalDangers} 已找到
      </div>
    </div>
  );
}
