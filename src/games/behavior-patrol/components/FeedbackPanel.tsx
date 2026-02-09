import { DangerFactor, QuizResult } from '../types';

interface FeedbackPanelProps {
  danger: DangerFactor;
  result: QuizResult;
  onContinue: () => void;
}

export function FeedbackPanel({ danger, result, onContinue }: FeedbackPanelProps) {
  const optionLabels = ['A', 'B', 'C', 'D'];
  const bothCorrect = result.q1Correct && result.q2Correct;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white',
      }}>
        {/* 結果標題 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <span style={{ fontSize: '3rem' }}>{bothCorrect ? '🎉' : '📝'}</span>
          <h2 style={{
            fontSize: '1.5rem',
            marginTop: '10px',
            color: bothCorrect ? '#4CAF50' : '#FF9800',
          }}>
            {bothCorrect ? '完全正確！' : '部分正確'}
          </h2>
        </div>

        {/* 答題結果 */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
            padding: '10px 15px',
            background: result.q1Correct ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{result.q1Correct ? '✅' : '❌'}</span>
            <span>Q1: {result.q1Correct ? '正確' : '錯誤'}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 15px',
            background: result.q2Correct ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            borderRadius: '8px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{result.q2Correct ? '✅' : '❌'}</span>
            <span>Q2: {result.q2Correct ? '正確' : '錯誤'}</span>
          </div>
        </div>

        {/* 正確答案顯示（如果有錯誤） */}
        {(!result.q1Correct || !result.q2Correct) && (
          <div style={{
            marginBottom: '25px',
            padding: '15px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px',
          }}>
            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>正確答案：</p>
            {!result.q1Correct && (
              <p style={{ marginBottom: '5px', color: '#4CAF50' }}>
                Q1 應選 {optionLabels[danger.questions.q1.correctIndex]}. {danger.questions.q1.options[danger.questions.q1.correctIndex]}
              </p>
            )}
            {!result.q2Correct && (
              <p style={{ color: '#4CAF50' }}>
                Q2 應選 {optionLabels[danger.questions.q2.correctIndex]}. {danger.questions.q2.options[danger.questions.q2.correctIndex]}
              </p>
            )}
          </div>
        )}

        {/* 說明 */}
        <div style={{
          marginBottom: '25px',
          padding: '15px',
          background: 'rgba(255, 193, 7, 0.1)',
          borderRadius: '8px',
          borderLeft: '4px solid #FFC107',
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span> 說明：
          </p>
          <ul>
            {danger.feedback.map((feedback, index) => (
              <li key={index} style={{ lineHeight: 1.6 }} className='flex items-start gap-1'>
                <span className='text-md'>●</span>
                <span>{feedback}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 繼續按鈕 */}
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          繼續遊戲
        </button>
      </div>
    </div>
  );
}
