import { patrolScenario1 } from '../data/PatrolScenario_1_New';
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
  const scenario = patrolScenario1;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeLow = timeRemaining <= 10;

  // 計算時間進度百分比（假設總時間從props或固定值）
  const totalTime = scenario.timeLimit; // 假設總時間為60秒，您可以根據實際需求調整
  const timeProgress = (timeRemaining / totalTime) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] font-sans">
      {/* 頂部 HUD 容器 - 白色背景條 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[900px] bg-white/20 backdrop-blur-xs rounded-[20px] px-6 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 pointer-events-auto">
        <div className="flex items-center justify-between gap-6">
          {/* 左側 - 危險因子圓形指示器 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 mr-1">發現危險</span>
            <div className="flex gap-2">
              {Array.from({ length: totalDangers }).map((_, i) => (
                <div
                  key={i}
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${i < foundCount
                    ? 'bg-[#4CAF50] shadow-md'
                    : 'bg-gray-200'
                    }`}
                >
                  {i < foundCount ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 中間 - 計時器和進度條 */}
          <div className="flex-1 max-w-[400px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">剩餘時間</span>
              <span className={`text-sm font-bold font-mono ${isTimeLow ? 'text-[#FF5252]' : 'text-gray-700'
                }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            {/* 進度條 */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isTimeLow
                  ? 'bg-gradient-to-r from-[#FF5252] to-[#FF8A80]'
                  : 'bg-gradient-to-r from-[#9CCC65] via-[#FFEB3B] to-[#FFA726]'
                  }`}
                style={{ width: `${timeProgress}%` }}
              ></div>
            </div>
          </div>

          {/* 右側 - SCAN AREA 按鈕 */}
          {/* <button className="bg-gradient-to-br from-[#FF7043] to-[#FF5722] hover:from-[#FF5722] hover:to-[#F4511E] text-white font-bold text-sm px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
            <span>SCAN AREA</span>
            <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
            </div>
          </button> */}
        </div>
      </div>



      {/* 返回按鈕 - 左上角 */}
      <button
        onClick={onExit}
        className="absolute top-6 left-6 text-white bg-[#FF6B6B] rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all z-10 cursor-pointer hover:bg-[#FF5252] hover:scale-110 pointer-events-auto"
        title="返回選單"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.9;
            }
          }
        `}
      </style>
    </div>
  );
}
