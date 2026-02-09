import { useState } from 'react';
import { DangerFactor } from '../types';

interface QuizModalProps {
  danger: DangerFactor;
  onSubmit: (q1Answer: number, q2Answer: number) => void;
}

export function QuizModal({ danger, onSubmit }: QuizModalProps) {
  const [currentStep, setCurrentStep] = useState<0 | 1>(0);
  const [q1Answer, setQ1Answer] = useState<number | null>(null);
  const [q2Answer, setQ2Answer] = useState<number | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  // currentQuestion logic
  const currentQuestion = currentStep === 0 ? danger.questions.q1 : danger.questions.q2;
  const currentAnswer = currentStep === 0 ? q1Answer : q2Answer;
  const setAnswer = (val: number) => {
    if (showingResult) return; // Prevent changing answer after submission
    if (currentStep === 0) setQ1Answer(val);
    else setQ2Answer(val);
  };

  const handleConfirm = () => {
    if (currentAnswer !== null) {
      setShowingResult(true);
    }
  };

  const handleNext = () => {
    setShowingResult(false);
    setCurrentStep(1);
  };

  const handleFinish = () => {
    if (q1Answer !== null && q2Answer !== null) {
      onSubmit(q1Answer, q2Answer);
    }
  };

  const handleAction = () => {
    if (!showingResult) {
      handleConfirm();
    } else {
      if (currentStep === 0) {
        handleNext();
      } else {
        handleFinish();
      }
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  const getOptionStyles = (index: number) => {
    const isSelected = currentAnswer === index;
    const isCorrect = index === currentQuestion.correctIndex;

    let background = 'rgba(255,255,255,0.1)';
    let border = '2px solid transparent';
    let icon = null;

    if (showingResult) {
      if (isCorrect) {
        background = 'rgba(76, 175, 80, 0.3)';
        border = '2px solid #4CAF50';
        icon = <span style={{ marginLeft: 'auto', color: '#4CAF50', fontWeight: 'bold' }}>✓ 正確</span>;
      } else if (isSelected) {
        background = 'rgba(244, 67, 54, 0.3)';
        border = '2px solid #F44336';
        icon = <span style={{ marginLeft: 'auto', color: '#F44336', fontWeight: 'bold' }}>✕ 錯誤</span>;
      }
    } else {
      if (isSelected) {
        background = 'rgba(76, 175, 80, 0.3)';
        border = '2px solid #4CAF50';
      }
    }

    return { background, border, icon };
  };

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

        {/* 題目區域 */}
        <div style={{ marginBottom: '25px' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '15px', fontWeight: 'bold' }}>
            {currentStep === 0 ? 'Q1' : 'Q2'}: {currentQuestion.question}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentQuestion.options.map((option, index) => {
              const { background, border, icon } = getOptionStyles(index);
              return (
                <div
                  key={index}
                  onClick={() => setAnswer(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background,
                    borderRadius: '8px',
                    cursor: showingResult ? 'default' : 'pointer',
                    border,
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{optionLabels[index]}. {option}</span>
                  {icon}
                </div>
              );
            })}
          </div>
        </div>

        {/* 按鈕 */}
        <button
          onClick={handleAction}
          disabled={currentAnswer === null}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            background: currentAnswer !== null ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: currentAnswer !== null ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {!showingResult
            ? '確認'
            : currentStep === 0 ? '下一題' : '完成'}
        </button>
      </div>
    </div>
  );
}
