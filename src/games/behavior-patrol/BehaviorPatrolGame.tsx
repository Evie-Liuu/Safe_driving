import { useState, useEffect, useCallback, useRef } from 'react';
import { GameProps } from '../types';
import { GameHUD, QuizModal, FeedbackPanel, ResultScreen, PatrolScene, TrafficLightDevPanel } from './components';
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
    errorStats,
    dangerResults,
    startGame,
    handleCorrectClick,
    handleWrongClick,
    handleQuizSubmit,
    handleContinue,
    handleTimeUp,
    resetGame,
    gameTime,
    manualTrafficLightStates,
    setTrafficLightState,
  } = useGameState({
    totalDangers: scenario.dangers.length,
    maxLives: scenario.maxLives,
    timeLimit: scenario.timeLimit,
    dangerList: scenario.dangers,
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
            currentTime={gameTime}
            manualTrafficLightStates={manualTrafficLightStates}
            onTrafficLightStateChange={(id, state) => {
              console.log(`Traffic light ${id} changed to ${state}`);
            }}
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

          {/* 紅綠燈開發者工具面板 */}
          {scenario.trafficLights && scenario.trafficLights.length > 0 && (
            <TrafficLightDevPanel
              trafficLights={scenario.trafficLights}
              manualStates={manualTrafficLightStates}
              onSetState={setTrafficLightState}
              currentTime={gameTime}
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
          dangerResults={dangerResults}
          errorStats={errorStats}
          allDangers={scenario.dangers}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}

      {/* 遊戲中的說明按鈕（右下角） */}
      {isGameActive && status === 'playing' && (
        <button
          onClick={() => setShowInstructions(true)}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
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
  const [soundOn, setSoundOn] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-[90%] max-w-4xl bg-white rounded-[30px] border-4 border-[#3CB4E7] p-8 shadow-2xl flex flex-col items-center">

        {/* Close Button */}
        <button
          onClick={showStartButton ? onExit : onClose}
          className="absolute top-4 right-4 text-white bg-[#FF6B6B] rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-colors z-10 cursor-pointer"
          title={showStartButton ? "退出" : "關閉"}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FF5252')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FF6B6B')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Title */}
        <div className="flex flex-col items-center mb-8 w-full">
          <h2
            className="text-4xl md:text-5xl font-black mb-3 tracking-wide drop-shadow-sm font-sans flex items-center gap-2"
            style={{ color: '#3CB4E7' }}
          >
            <span>遊戲說明</span>
          </h2>
          <div className="w-24 h-1.5 bg-[#FFD700] rounded-full"></div>
        </div>

        {/* Cards Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10 px-4">

          {/* Card 1: Watch Carefully */}
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100 group">
            <div className="w-20 h-20 rounded-full bg-[#E0FFEB] text-[#00C853] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">仔細觀察</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              觀察街道場景，尋找危險行為。
            </p>
          </div>

          {/* Card 2: Click Hazards */}
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100 group">
            <div className="w-20 h-20 rounded-full bg-[#FFEBEE] text-[#FF5252] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">點擊危險</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              計時結束前點擊危險行為並根據情境回答問題！
            </p>
          </div>

          {/* Card 3: Score Points */}
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100 group">
            <div className="w-20 h-20 rounded-full bg-[#FFF9C4] text-[#FBC02D] flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10" />
                <path d="M17 4v8a5 5 0 0 1-10 0V4" />
                <path d="M5 9v2a2 2 0 0 0 2 2" />
                <path d="M19 9v2a2 2 0 0 1-2 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">獲得分數</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              找出正確危險即可得分。
            </p>
          </div>

        </div>

        {/* Play Button */}
        <button
          onClick={showStartButton ? onStart : onClose}
          className="bg-yellow-400 hover:bg-[#FFC107] text-[#5D4037] font-black text-2xl py-4 px-16 rounded-full shadow-[0_6px_0_#CA8A04,0_12px_4px_rgba(0,0,0,0.4)] border-2 border-white/30 transform transition hover:scale-105 active:scale-95 mb-6 tracking-wide cursor-pointer"
        >
          {showStartButton ? '開始遊戲' : '繼續遊戲'}
        </button>

        {/* Sound Toggle */}
        {/* <div className="flex items-center gap-3 text-gray-500 font-medium cursor-pointer" onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          )}
          <span className="text-sm">音效 {soundOn ? '開啟' : '關閉'}</span>
          <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${soundOn ? 'bg-[#2ECC71]' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${soundOn ? 'translate-x-4' : ''}`}></div>
          </div>
        </div> */}

      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}
      </style>
    </div>
  )
}
