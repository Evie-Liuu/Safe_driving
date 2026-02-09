import { useState, useEffect, useCallback, useRef } from 'react';
import { GameProps } from '../types';
import { GameHUD, QuizModal, FeedbackPanel, ResultScreen, PatrolScene } from './components';
import { useGameState, useTimer } from './hooks';
import { patrolScenario1 } from './data/PatrolScenario_1_New';
import { DangerFactor } from './types';

export function BehaviorPatrolGame({ onExit }: GameProps) {
  const scenario = patrolScenario1;
  const [foundDangerIds, setFoundDangerIds] = useState<Set<string>>(new Set());
  const [showInstructions, setShowInstructions] = useState(false);

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

  // Pause timer when in quiz, feedback, or viewing instructions
  useEffect(() => {
    if (status === 'quiz' || status === 'feedback' || showInstructions) {
      pauseTimer();
    } else if (status === 'playing') {
      resumeTimer();
    }
  }, [status, showInstructions, pauseTimer, resumeTimer]);

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
        <PatrolInstructionsPanel
          scenario={scenario}
          showStartButton
          onStart={handleStart}
          onExit={onExit}
        />
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
      {/* {(status === 'won' || status === 'lost') && (
        <ResultScreen
          progress={{ ...progress, timeRemaining, score, foundCount }}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )} */}

      {/* 遊戲中的說明按鈕（右下角） */}
      {isGameActive && status === 'playing' && (
        <button
          onClick={() => setShowInstructions(true)}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 15px rgba(74, 144, 217, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            zIndex: 100,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 144, 217, 0.7)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 144, 217, 0.5)'
          }}
          title="查看遊戲說明"
        >
          ❓
        </button>
      )}

      {/* 遊戲中的說明面板 */}
      {showInstructions && (
        <PatrolInstructionsPanel
          scenario={scenario}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}

/**
 * 糾察遊戲說明面板
 */
function PatrolInstructionsPanel({
  scenario,
  showStartButton = false,
  onStart,
  onClose,
  onExit
}: {
  scenario: typeof patrolScenario1
  showStartButton?: boolean
  onStart?: () => void
  onClose?: () => void
  onExit?: () => void
}) {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,40,0.95) 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-in'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 60px rgba(74, 144, 217, 0.4)',
        border: '2px solid rgba(100, 150, 255, 0.3)'
      }}>
        {/* 標題 */}
        <div style={{ marginBottom: '25px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '36px',
            fontFamily: 'monospace',
            color: '#fff',
            margin: '0 0 10px 0',
            textShadow: '0 0 20px rgba(74, 144, 217, 0.8)'
          }}>
            🔍 行為糾察隊
          </h1>
          <div style={{
            fontSize: '18px',
            color: '#4a90d9',
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}>
            {scenario.name}
          </div>
          <div style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '5px'
          }}>
            {scenario.description}
          </div>
        </div>

        {/* 內容區（可滾動） */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          fontFamily: 'monospace',
          color: '#fff',
          fontSize: '14px',
          paddingRight: '10px'
        }}>
          {/* 遊戲資訊 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              background: 'rgba(255, 165, 0, 0.1)',
              borderRadius: '8px',
              borderLeft: '4px solid #ffa500'
            }}>
              <span style={{ fontSize: '20px', marginRight: '10px' }}>⏱️</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#ffa500' }}>時間限制</div>
                <div style={{ fontSize: '12px', color: '#ddd' }}>{scenario.timeLimit} 秒</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              background: 'rgba(68, 255, 68, 0.1)',
              borderRadius: '8px',
              borderLeft: '4px solid #44ff44'
            }}>
              <span style={{ fontSize: '20px', marginRight: '10px' }}>🔍</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#44ff44' }}>危險因子</div>
                <div style={{ fontSize: '12px', color: '#ddd' }}>共 {scenario.dangers.length} 個需要找出</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px',
              background: 'rgba(255, 68, 68, 0.1)',
              borderRadius: '8px',
              borderLeft: '4px solid #ff4444'
            }}>
              <span style={{ fontSize: '20px', marginRight: '10px' }}>❤️</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#ff4444' }}>錯誤機會</div>
                <div style={{ fontSize: '12px', color: '#ddd' }}>{scenario.maxLives} 次（點錯會扣生命）</div>
              </div>
            </div>
          </div>

          {/* 遊戲玩法 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '15px',
            lineHeight: '1.8'
          }}>
            <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
              🎮 遊戲玩法
            </h2>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#44ff44' }}>觀察場景</strong>：仔細查看 3D 場景中的各種物品和設施
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#ffa500' }}>點擊危險物</strong>：發現危險因子後，用滑鼠點擊它
              </li>
              <li style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#4a90d9' }}>回答問題</strong>：點擊後會出現問答題，選擇正確答案
              </li>
              <li>
                <strong style={{ color: '#ff6666' }}>注意生命值</strong>：點錯物品或答錯題目會扣生命
              </li>
            </ol>
          </div>

          {/* 操作說明 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '15px'
          }}>
            <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
              🖱️ 操作說明
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'start' }}>
                <span style={{ fontSize: '18px', marginRight: '10px', minWidth: '30px' }}>🖱️</span>
                <div>
                  <strong>滑鼠拖曳</strong>：旋轉視角
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'start' }}>
                <span style={{ fontSize: '18px', marginRight: '10px', minWidth: '30px' }}>🔍</span>
                <div>
                  <strong>滾輪</strong>：縮放視角
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'start' }}>
                <span style={{ fontSize: '18px', marginRight: '10px', minWidth: '30px' }}>👆</span>
                <div>
                  <strong>左鍵點擊</strong>：選擇物品
                </div>
              </div>
            </div>
          </div>

          {/* 計分說明 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '15px'
          }}>
            <h2 style={{ color: '#4a90d9', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
              💯 計分說明
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                background: 'rgba(68, 255, 68, 0.1)',
                padding: '10px',
                borderRadius: '5px',
                borderLeft: '3px solid #44ff44'
              }}>
                <strong style={{ color: '#44ff44' }}>找到危險因子</strong>：+10 分
              </div>
              <div style={{
                background: 'rgba(74, 144, 217, 0.1)',
                padding: '10px',
                borderRadius: '5px',
                borderLeft: '3px solid #4a90d9'
              }}>
                <strong style={{ color: '#4a90d9' }}>答對問題</strong>：+5 分
              </div>
              <div style={{
                background: 'rgba(255, 68, 68, 0.1)',
                padding: '10px',
                borderRadius: '5px',
                borderLeft: '3px solid #ff4444'
              }}>
                <strong style={{ color: '#ff4444' }}>點錯/答錯</strong>：-1 生命值
              </div>
            </div>
          </div>

          {/* 勝利條件 */}
          <div style={{
            background: 'rgba(255, 215, 0, 0.1)',
            borderRadius: '10px',
            padding: '20px',
            border: '2px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h2 style={{ color: '#ffd700', marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
              🏆 勝利條件
            </h2>
            <p style={{ margin: 0, lineHeight: '1.6' }}>
              在時間限制內找出<strong style={{ color: '#ffd700' }}>所有危險因子</strong>，且生命值不歸零，即可過關！
            </p>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '15px',
                fontSize: '16px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              關閉說明
            </button>
          )}

          {showStartButton && onStart && (
            <button
              onClick={onStart}
              style={{
                flex: 2,
                padding: '15px',
                fontSize: '20px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#fff',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(76, 175, 80, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.5)'
              }}
            >
              🚀 開始遊戲
            </button>
          )}

          {showStartButton && onExit && (
            <button
              onClick={onExit}
              style={{
                flex: 1,
                padding: '15px',
                fontSize: '16px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              }}
            >
              返回選單
            </button>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  )
}
