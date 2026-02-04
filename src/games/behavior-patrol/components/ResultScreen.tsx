import { GameProgress } from '../types';

interface ResultScreenProps {
  progress: GameProgress;
  onRestart: () => void;
  onExit: () => void;
}

export function ResultScreen({ progress, onRestart, onExit }: ResultScreenProps) {
  const isWin = progress.status === 'won';
  const maxScore = progress.totalDangers * 20; // 每題 10 分，兩題
  const percentage = Math.round((progress.score / maxScore) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'S', color: '#FFD700' };
    if (percentage >= 80) return { grade: 'A', color: '#4CAF50' };
    if (percentage >= 70) return { grade: 'B', color: '#8BC34A' };
    if (percentage >= 60) return { grade: 'C', color: '#FF9800' };
    if (percentage >= 50) return { grade: 'D', color: '#FF5722' };
    return { grade: 'F', color: '#f44336' };
  };

  const { grade, color } = getGrade();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        color: 'white',
      }}>
        {/* 結果標題 */}
        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
          {isWin ? '🎉' : '😔'}
        </div>
        <h1 style={{
          fontSize: '2rem',
          marginBottom: '30px',
          color: isWin ? '#4CAF50' : '#f44336',
        }}>
          {isWin ? '任務完成！' : '任務失敗'}
        </h1>

        {/* 等級 */}
        <div style={{
          fontSize: '5rem',
          fontWeight: 'bold',
          color: color,
          textShadow: `0 0 30px ${color}`,
          marginBottom: '20px',
        }}>
          {grade}
        </div>

        {/* 分數統計 */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
            fontSize: '1.1rem',
          }}>
            <span>找到危險因子</span>
            <span>{progress.foundCount} / {progress.totalDangers}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
            fontSize: '1.1rem',
          }}>
            <span>答題得分</span>
            <span>{progress.score} / {maxScore}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '15px',
            fontSize: '1.1rem',
          }}>
            <span>剩餘生命</span>
            <span>{'❤️'.repeat(progress.lives)}{'🖤'.repeat(3 - progress.lives)}</span>
          </div>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.3rem',
            fontWeight: 'bold',
          }}>
            <span>正確率</span>
            <span style={{ color }}>{percentage}%</span>
          </div>
        </div>

        {/* 按鈕 */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={onRestart}
            style={{
              flex: 1,
              padding: '15px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            再玩一次
          </button>
          <button
            onClick={onExit}
            style={{
              flex: 1,
              padding: '15px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            返回選單
          </button>
        </div>
      </div>
    </div>
  );
}
