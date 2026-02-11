import { GameProgress, DangerResult, ErrorStatistics, DangerFactor } from '../types';

interface ResultScreenProps {
  progress: GameProgress;
  dangerResults: DangerResult[];
  errorStats: ErrorStatistics;
  allDangers: DangerFactor[];
  onRestart: () => void;
  onExit: () => void;
}

export function ResultScreen({ progress, dangerResults, errorStats, allDangers, onRestart, onExit }: ResultScreenProps) {
  const isWin = progress.status === 'won';
  const maxScore = progress.totalDangers * 20;
  const percentage = maxScore > 0 ? Math.round((progress.score / maxScore) * 100) : 0;

  const getMissedDangerName = (dangerId: string) => {
    const danger = allDangers.find((d) => d.id === dangerId);
    return danger ? danger.name : dangerId;
  };

  const getGrade = () => {
    if (percentage >= 90) return { grade: 'S', color: '#FFD700', bgColor: '#FFF9C4' };
    if (percentage >= 80) return { grade: 'A', color: '#4CAF50', bgColor: '#E0FFEB' };
    if (percentage >= 70) return { grade: 'B', color: '#8BC34A', bgColor: '#F1F8E9' };
    if (percentage >= 60) return { grade: 'C', color: '#FF9800', bgColor: '#FFF3E0' };
    if (percentage >= 50) return { grade: 'D', color: '#FF5722', bgColor: '#FFEBEE' };
    return { grade: 'F', color: '#f44336', bgColor: '#FFEBEE' };
  };

  const { grade, color, bgColor } = getGrade();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="relative w-[90%] max-w-5xl bg-white rounded-[30px] border-4 border-[#3CB4E7] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Close Button */}
        <button
          onClick={onExit}
          className="absolute top-4 right-4 text-white bg-[#FF6B6B] rounded-full w-10 h-10 flex items-center justify-center shadow-md transition-colors z-10 cursor-pointer hover:bg-[#FF5252]"
          title="返回選單"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Title */}
        <div className="flex flex-col items-center mb-8 w-full">
          <div className="text-6xl mb-4">
            {isWin ? '🎉' : '😔'}
          </div>
          <h2
            className="text-4xl md:text-5xl font-black mb-3 tracking-wide drop-shadow-sm font-sans"
            style={{ color: isWin ? '#4CAF50' : '#FF6B6B' }}
          >
            {isWin ? '任務完成！' : '任務失敗'}
          </h2>
          <div className="w-24 h-1.5 bg-[#FFD700] rounded-full mb-6"></div>

          {/* Grade Badge */}
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg"
            style={{ background: bgColor }}
          >
            <div className="text-7xl font-black" style={{ color }}>
              {grade}
            </div>
          </div>
          <div className="text-xl font-bold text-gray-600">
            正確率 {percentage}%
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card: 找到危險 */}
          <div className="bg-white rounded-3xl p-5 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-[#E0FFEB] text-[#00C853] flex items-center justify-center mb-4 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="text-3xl font-black text-[#00C853] mb-1">
              {progress.foundCount}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              / {progress.totalDangers} 危險因子
            </div>
          </div>

          {/* Card: 總得分 */}
          <div className="bg-white rounded-3xl p-5 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-[#FFF9C4] text-[#FBC02D] flex items-center justify-center mb-4 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <div className="text-3xl font-black text-[#FBC02D] mb-1">
              {progress.score}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              / {maxScore} 分
            </div>
          </div>

          {/* Card: 剩餘生命 */}
          <div className="bg-white rounded-3xl p-5 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-[#FFEBEE] text-[#FF5252] flex items-center justify-center mb-4 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <div className="text-3xl mb-1">
              {'❤️'.repeat(progress.lives)}{'🖤'.repeat(3 - progress.lives)}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              剩餘生命
            </div>
          </div>

          {/* Card: 誤判次數 */}
          <div className="bg-white rounded-3xl p-5 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-1 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-[#FFEBEE] text-[#FF5252] flex items-center justify-center mb-4 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <div className="text-3xl font-black text-[#FF5252] mb-1">
              {errorStats.totalWrongClicks}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              誤判次數
            </div>
          </div>
        </div>

        {/* Danger List Section */}
        <div className="bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] rounded-3xl p-6 mb-6 border border-[#3CB4E7]/30">
          <h3 className="text-2xl font-bold text-[#3CB4E7] mb-4 flex items-center gap-2">
            <span>✅</span>
            <span>危險因子清單</span>
          </h3>

          {dangerResults.length > 0 ? (
            <div className="space-y-3">
              {dangerResults.map((result, index) => (
                <div
                  key={result.dangerId}
                  className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all border-l-4 border-[#00C853]"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-lg">
                      {index + 1}. {result.dangerName}
                    </span>
                    <span className="bg-[#FFF9C4] text-[#F57C00] px-3 py-1 rounded-full font-black text-sm">
                      +{result.pointsEarned} 分
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className={`flex items-center gap-1 ${result.q1Correct ? 'text-green-600' : 'text-red-500'} font-medium`}>
                      {result.q1Correct ? '✅' : '❌'} Q1: {result.q1Correct ? '正確 (+5分)' : '錯誤'}
                    </span>
                    <span className={`flex items-center gap-1 ${result.q2Correct ? 'text-green-600' : 'text-red-500'} font-medium`}>
                      {result.q2Correct ? '✅' : '❌'} Q2: {result.q2Correct ? '正確 (+5分)' : '錯誤'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">😔</div>
              <p className="font-medium">未找到任何危險因子</p>
            </div>
          )}

          {/* Missed Dangers */}
          {errorStats.missedDangers.length > 0 && (
            <div className="mt-6 pt-6 border-t-2 border-[#FF5252]/20">
              <h4 className="text-xl font-bold text-[#FF5252] mb-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>錯過的危險因子</span>
              </h4>
              <div className="space-y-2">
                {errorStats.missedDangers.map((dangerId) => (
                  <div
                    key={dangerId}
                    className="bg-[#FFEBEE] rounded-xl p-3 border-l-4 border-[#FF5252] text-[#C62828] font-medium"
                  >
                    {getMissedDangerName(dangerId)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Statistics */}
        {/* <div className="bg-gradient-to-br from-[#FFF3E0] to-[#FFE0B2] rounded-3xl p-6 mb-8 border border-[#FF9800]/30">
          <h3 className="text-2xl font-bold text-[#F57C00] mb-4 flex items-center gap-2">
            <span>📈</span>
            <span>錯誤統計分析</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all">
              <div className="text-5xl font-black text-[#FF5252] mb-2">
                {errorStats.totalWrongClicks}
              </div>
              <div className="text-gray-700 font-bold mb-1">總誤判次數</div>
              <div className="text-sm text-gray-500">(每次 -10 分)</div>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-all">
              <div className="text-5xl font-black text-[#FF9800] mb-2">
                {errorStats.missedDangers.length}
              </div>
              <div className="text-gray-700 font-bold mb-1">錯過的危險</div>
              <div className="text-sm text-gray-500">(未獲得分數)</div>
            </div>
          </div>
        </div> */}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRestart}
            className="flex-1 bg-yellow-400 hover:bg-[#FFC107] text-[#5D4037] font-black text-xl py-4 px-8 rounded-full shadow-[0_6px_0_#CA8A04,0_12px_4px_rgba(0,0,0,0.4)] border-2 border-white/30 transform transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            再玩一次
          </button>
          <button
            onClick={onExit}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#5D4037] font-black text-xl py-4 px-8 rounded-full shadow-[0_6px_0_#9E9E9E,0_12px_4px_rgba(0,0,0,0.4)] border-2 border-white/30 transform transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            返回選單
          </button>
        </div>
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
  );
}
