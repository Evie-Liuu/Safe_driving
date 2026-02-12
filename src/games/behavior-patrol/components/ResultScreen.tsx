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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn font-sans p-4">
      {/* 
        Outer Frame: 
        - Handles Border, Rounded Corners, and Shadow.
        - Important: overflow-hidden ensures that the inner scrollable area is clipped 
          to the rounded corners exactly, preventing the scrollbar from appearing to 'stick out'.
      */}
      <div className="relative w-full max-w-5xl bg-white rounded-[40px] border-4 border-[#3CB4E7] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Fixed Frame UI Elements */}
        {/* Decorative corner dots */}
        {/* <div className="absolute top-4 left-8 flex items-center gap-2 pointer-events-none opacity-30 z-10">
          <div className="w-3 h-3 rounded-full bg-[#3CB4E7] animate-pulse"></div>
          <div className="w-3 h-3 rounded-full bg-[#3CB4E7] animate-pulse [animation-delay:0.2s]"></div>
        </div> */}

        {/* Close Button - Stays fixed on the frame */}
        <button
          onClick={onExit}
          className="absolute top-5 right-5 text-white bg-[#FF6B6B] rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all z-20 cursor-pointer hover:bg-[#FF5252] hover:scale-110 active:scale-95"
          title="返回選單"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* 
           Scrollable Content Wrapper: 
           - The actual scrollable area.
           - padding ensures content and scrollbar aren't squished against the border.
        */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>

          {/* Header Section */}
          <div className="flex flex-col items-center mb-10 w-full animate-slideDown">
            <div className="text-6xl mb-4 drop-shadow-md">
              {isWin ? '🎉' : '😔'}
            </div>
            <h2
              className="text-4xl md:text-5xl font-black mb-4 tracking-wider drop-shadow-sm italic text-center"
              style={{ color: isWin ? '#4CAF50' : '#FF6B6B' }}
            >
              {isWin ? '任務完成' : '任務失敗'}
            </h2>
            <div className="w-32 h-2.5 bg-[#FFD700] rounded-full mb-8 shadow-inner"></div>

            <div className="flex flex-col md:flex-row items-center gap-8 mb-2">
              {/* Grade Badge */}
              <div
                className="w-36 h-36 rounded-full flex items-center justify-center shadow-2xl border-[10px] border-white/80 ring-4 ring-gray-50 scale-100 hover:scale-105 transition-transform"
                style={{ background: bgColor }}
              >
                <div className="text-7xl font-black" style={{ color }}>
                  {grade}
                </div>
              </div>

              <div className="flex flex-col items-center md:items-start">
                <div className="text-3xl font-black text-gray-700 mb-1">
                  正確率 <span className="text-6xl" style={{ color: color }}>{percentage}%</span>
                </div>
                {/* <div className="text-sm font-black text-gray-400 tracking-widest uppercase">Performance Metric</div> */}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                label: '找到危險',
                value: progress.foundCount,
                sub: `/ ${progress.totalDangers}`,
                icon: 'check',
                colors: 'bg-green-50 text-green-500',
                rotation: 'rotate-2'
              },
              {
                label: '獲得積分',
                value: progress.score,
                sub: `/ ${maxScore}`,
                icon: 'star',
                colors: 'bg-yellow-50 text-yellow-600',
                rotation: '-rotate-2'
              },
              {
                label: '剩餘生命',
                value: '❤️'.repeat(progress.lives) + '🖤'.repeat(3 - progress.lives),
                sub: 'HEALTH STATUS',
                icon: 'heart',
                colors: 'bg-red-50 text-red-500',
                rotation: 'rotate-3'
              },
              {
                label: '誤判次數',
                value: errorStats.totalWrongClicks,
                sub: 'TOTAL ERRORS',
                icon: 'alert',
                colors: 'bg-purple-50 text-purple-600',
                rotation: '-rotate-1'
              }
            ].map((stat, i) => (
              <div key={i} className={`bg-white rounded-[2.5rem] p-6 flex flex-col items-center text-center shadow-md border border-gray-100 transition-all hover:shadow-xl ${stat.rotation}`}>
                <div className={`w-14 h-14 rounded-2xl ${stat.colors.split(' ')[0]} ${stat.colors.split(' ')[1]} flex items-center justify-center mb-4 shadow-sm`}>
                  {stat.icon === 'check' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  )}
                  {stat.icon === 'star' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  )}
                  {stat.icon === 'heart' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  )}
                  {stat.icon === 'alert' && (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  )}
                </div>
                <div className={`font-black mb-1 ${stat.icon === 'heart' ? 'text-2xl' : 'text-4xl'} ${stat.colors.split(' ')[1]}`}>
                  {stat.value}
                </div>
                <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{stat.label}</div>
                <div className="text-[10px] text-gray-300 font-bold">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Detailed Reports Section */}
          <div className="bg-gradient-to-br from-[#F8FBFF] to-[#EBF5FB] rounded-[3.5rem] p-8 mb-10 border-2 border-[#3CB4E7]/10 shadow-lg">
            <div className="flex flex-col lg:flex-row gap-12">

              {/* Left Column: Found Hazards */}
              <div className="flex-[1.4]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#3CB4E7] text-white flex items-center justify-center shadow-lg shadow-[#3CB4E7]/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-700 tracking-tight">危險因子偵測報告</h3>
                </div>

                {dangerResults.length > 0 ? (
                  <div className="space-y-4">
                    {dangerResults.map((result, index) => (
                      <div key={result.dangerId} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-start gap-5 hover:translate-x-1 transition-transform group">
                        <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 flex items-center justify-center font-black text-lg group-hover:bg-[#00C853] group-hover:text-white transition-colors flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-black text-gray-800 text-xl tracking-tight">{result.dangerName}</div>
                            <div className="bg-[#E0FFEB] text-[#00C853] px-3 py-1 rounded-full text-xs font-black border border-[#00C853]/10">+{result.pointsEarned} 分</div>
                          </div>
                          <div className="flex gap-4">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${result.q1Correct ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-400'}`}>
                              {result.q1Correct ? '✓ 正確' : '✗ 錯誤'}
                            </span>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${result.q2Correct ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-400'}`}>
                              {result.q2Correct ? '✓ 正確' : '✗ 錯誤'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                    <div className="text-4xl mb-2 opacity-30">🔍</div>
                    <p className="text-gray-400 font-black tracking-widest uppercase">未找到任何危險</p>
                  </div>
                )}
              </div>

              {/* Right Column: Missed Threats */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B6B] text-white flex items-center justify-center shadow-lg shadow-[#FF6B6B]/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                  <h3 className="text-2xl font-black text-gray-700 tracking-tight">未察覺威脅</h3>
                </div>

                {errorStats.missedDangers.length > 0 ? (
                  <div className="space-y-3">
                    {errorStats.missedDangers.map((dangerId) => (
                      <div key={dangerId} className="bg-red-50/60 rounded-2xl p-4 border-l-4 border-red-400 text-red-700 font-black flex items-center gap-3 shadow-sm hover:bg-red-50 transition-colors">
                        {/* <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></div> */}
                        {getMissedDangerName(dangerId)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                    <div className="text-4xl mb-2 opacity-30">🛡️</div>
                    <p className="text-gray-400 font-black tracking-widest uppercase text-xs">已找到所有威脅</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row gap-6 mb-4">
            <button
              onClick={onRestart}
              className="flex-[1.5] bg-[#FFD700] hover:bg-[#FFC107] text-[#5D4037] font-black text-2xl py-6 px-10 rounded-[1.5rem] shadow-[0_10px_0_#CA8A04,0_15px_30px_rgba(202,138,4,0.4)] transform transition hover:-translate-y-1 active:translate-y-1 active:shadow-none cursor-pointer border-t-2 border-white/50 border-x border-white/30 tracking-tight"
            >
              再試一次 !
            </button>
            <button
              onClick={onExit}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-xl py-6 px-10 rounded-[1.5rem] shadow-[0_10px_0_#E0E0E0,0_15px_30px_rgba(0,0,0,0.1)] transform transition hover:-translate-y-1 active:translate-y-1 active:shadow-none cursor-pointer border-t-2 border-white/80 tracking-tight"
            >
              返回選單
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-slideDown {
            animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          
          /* 
             Custom Scrollbar Theme
             - margin on track ensures it doesn't overlap the curved top/bottom of the frame.
          */
          .custom-scrollbar::-webkit-scrollbar {
            width: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #F8FAFC;
            border-radius: 20px;
            margin: 20px 0; /* Important: keeps scrollbar away from the rounded corners */
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #3CB4E7;
            border-radius: 20px;
            border: 3px solid #F8FAFC;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #25a1d7;
          }
          
          /* Firefox Support */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #3CB4E7 #F8FAFC;
          }
        `}
      </style>
    </div>
  );
}
