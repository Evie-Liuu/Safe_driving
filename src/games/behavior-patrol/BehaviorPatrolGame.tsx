import { useState, useEffect, useCallback } from 'react';
import { GameProps } from '../types';
import { GameHUD, QuizModal, FeedbackPanel, ResultScreen, PatrolScene } from './components';
import { useGameState, useTimer } from './hooks';
import { patrolScenario1 } from './data/PatrolScenario_1';
import { DangerFactor } from './types';

export function BehaviorPatrolGame({ onExit }: GameProps) {
  const scenario = patrolScenario1;
  const [foundDangerIds, setFoundDangerIds] = useState<Set<string>>(new Set());

  const {
    progress,
    status,
    lives,
    foundCount,
    score,
    currentDanger,
    quizResult,
    startGame,
    handleCorrectClick,
    handleWrongClick,
    handleQuizSubmit,
    handleContinue,
    handleTimeUp,
    resetGame,
  } = useGameState({
    totalDangers: scenario.dangers.length,
    maxLives: scenario.maxLives,
    timeLimit: scenario.timeLimit,
  });

  const { timeRemaining, start: startTimer, pause: pauseTimer, reset: resetTimer, resume: resumeTimer } = useTimer({
    initialTime: scenario.timeLimit,
    onTimeUp: handleTimeUp,
  });

  // Start game
  const handleStart = useCallback(() => {
    startGame();
    resetTimer();
    startTimer();
    setFoundDangerIds(new Set());
  }, [startGame, resetTimer, startTimer]);

  // Pause timer when in quiz or feedback
  useEffect(() => {
    if (status === 'quiz' || status === 'feedback') {
      pauseTimer();
    } else if (status === 'playing') {
      resumeTimer();
    }
  }, [status, pauseTimer, resumeTimer]);

  // Handle danger click
  const onDangerClick = useCallback((danger: DangerFactor) => {
    if (foundDangerIds.has(danger.id)) return;
    setFoundDangerIds((prev) => new Set(prev).add(danger.id));
    handleCorrectClick(danger);
  }, [foundDangerIds, handleCorrectClick]);

  // Handle safe object click (wrong)
  const onSafeClick = useCallback(() => {
    handleWrongClick();
  }, [handleWrongClick]);

  // Handle continue after feedback
  const onContinue = useCallback(() => {
    handleContinue();
  }, [handleContinue]);

  // Handle restart
  const handleRestart = useCallback(() => {
    resetGame();
    resetTimer();
    setFoundDangerIds(new Set());
  }, [resetGame, resetTimer]);

  const isGameActive = status === 'playing' || status === 'quiz' || status === 'feedback';
  const showScene = status !== 'ready';

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* 開始畫面 */}
      {status === 'ready' && (
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍 行為糾察隊</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
            {scenario.name}
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '2rem', color: 'rgba(255,255,255,0.6)' }}>
            {scenario.description}
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '20px 30px',
            borderRadius: '12px',
            marginBottom: '2rem',
            textAlign: 'left',
          }}>
            <p style={{ marginBottom: '10px' }}>⏱️ 時間限制：{scenario.timeLimit} 秒</p>
            <p style={{ marginBottom: '10px' }}>🔍 危險因子：{scenario.dangers.length} 個</p>
            <p>❤️ 錯誤機會：{scenario.maxLives} 次</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={handleStart}
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              開始遊戲
            </button>
            <button
              onClick={onExit}
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
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
      )}

      {/* 遊戲場景 */}
      {showScene && (
        <>
          <PatrolScene
            scenario={scenario}
            foundDangerIds={foundDangerIds}
            disabled={status !== 'playing'}
            onDangerClick={onDangerClick}
            onSafeClick={onSafeClick}
          />

          {/* HUD */}
          {isGameActive && (
            <GameHUD
              lives={lives}
              maxLives={scenario.maxLives}
              timeRemaining={timeRemaining}
              foundCount={foundCount}
              totalDangers={scenario.dangers.length}
              onExit={onExit}
            />
          )}
        </>
      )}

      {/* 問答彈窗 */}
      {status === 'quiz' && currentDanger && (
        <QuizModal
          danger={currentDanger}
          onSubmit={handleQuizSubmit}
        />
      )}

      {/* 回饋面板 */}
      {status === 'feedback' && currentDanger && quizResult && (
        <FeedbackPanel
          danger={currentDanger}
          result={quizResult}
          onContinue={onContinue}
        />
      )}

      {/* 結果畫面 */}
      {(status === 'won' || status === 'lost') && (
        <ResultScreen
          progress={{ ...progress, timeRemaining, score, foundCount }}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
