import { useState } from 'react';
import { DangerFactor } from '../types';

interface QuizModalProps {
  danger: DangerFactor;
  onSubmit: (q1Answer: number, q2Answer: number) => void;
}

export function QuizModal({ danger, onSubmit }: QuizModalProps) {
  const [q1Answer, setQ1Answer] = useState<number | null>(null);
  const [q2Answer, setQ2Answer] = useState<number | null>(null);

  const handleSubmit = () => {
    if (q1Answer !== null && q2Answer !== null) {
      onSubmit(q1Answer, q2Answer);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

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
        {/* 標題 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <span style={{ fontSize: '2rem', marginRight: '10px' }}>🔍</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>發現危險：{danger.name}</span>
        </div>

        {/* Q1 */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 'bold' }}>
            Q1: {danger.questions.q1.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {danger.questions.q1.options.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 15px',
                  background: q1Answer === index ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: q1Answer === index ? '2px solid #4CAF50' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="q1"
                  checked={q1Answer === index}
                  onChange={() => setQ1Answer(index)}
                  style={{ marginRight: '12px', width: '18px', height: '18px' }}
                />
                <span>{optionLabels[index]}. {option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 'bold' }}>
            Q2: {danger.questions.q2.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {danger.questions.q2.options.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 15px',
                  background: q2Answer === index ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: q2Answer === index ? '2px solid #4CAF50' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name="q2"
                  checked={q2Answer === index}
                  onChange={() => setQ2Answer(index)}
                  style={{ marginRight: '12px', width: '18px', height: '18px' }}
                />
                <span>{optionLabels[index]}. {option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 送出按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={q1Answer === null || q2Answer === null}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: q1Answer !== null && q2Answer !== null ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: q1Answer !== null && q2Answer !== null ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          確認送出
        </button>
      </div>
    </div>
  );
}
