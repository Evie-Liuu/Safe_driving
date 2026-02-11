import { useState, useCallback } from 'react';
import { GameStatus, GameProgress, DangerFactor, QuizResult, ErrorStatistics, DangerResult } from '../types';

interface UseGameStateOptions {
  totalDangers: number;
  maxLives: number;
  timeLimit: number;
  dangerList: DangerFactor[];
}

export function useGameState({ totalDangers, maxLives, timeLimit, dangerList }: UseGameStateOptions) {
  const [status, setStatus] = useState<GameStatus>('ready');
  const [lives, setLives] = useState(maxLives);
  const [foundCount, setFoundCount] = useState(0);
  const [score, setScore] = useState(0);
  const [currentDanger, setCurrentDanger] = useState<DangerFactor | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  // 錯誤統計
  const [errorStats, setErrorStats] = useState<ErrorStatistics>({
    consecutiveWrongClicks: 0,
    totalWrongClicks: 0,
    missedDangers: [],
  });

  // 危險因子結果記錄
  const [dangerResults, setDangerResults] = useState<DangerResult[]>([]);

  const startGame = useCallback(() => {
    setStatus('playing');
    setLives(maxLives);
    setFoundCount(0);
    setScore(0);
    setCurrentDanger(null);
    setQuizResult(null);
    setErrorStats({
      consecutiveWrongClicks: 0,
      totalWrongClicks: 0,
      missedDangers: [],
    });
    setDangerResults([]);
  }, [maxLives]);

  const handleCorrectClick = useCallback((danger: DangerFactor) => {
    setCurrentDanger(danger);
    setStatus('quiz');

    // 找到危險因子得 10 分
    setScore((prev) => prev + 10);

    // 重置連續誤判計數
    setErrorStats((prev) => ({
      ...prev,
      consecutiveWrongClicks: 0,
    }));
  }, []);

  const handleWrongClick = useCallback(() => {
    // 誤判扣 10 分（但分數不會低於 0）
    setScore((prev) => Math.max(0, prev - 10));

    // 更新誤判統計
    setErrorStats((prev) => {
      const newConsecutive = prev.consecutiveWrongClicks + 1;
      const newTotal = prev.totalWrongClicks + 1;

      // 連續誤判 3 次 → Game Over
      if (newConsecutive >= 3) {
        setStatus('lost');
      }

      return {
        ...prev,
        consecutiveWrongClicks: newConsecutive,
        totalWrongClicks: newTotal,
      };
    });

    // 扣生命值（保留原有邏輯）
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setStatus('lost');
      }
      return newLives;
    });
  }, []);

  const handleQuizSubmit = useCallback((q1Answer: number, q2Answer: number) => {
    if (!currentDanger) return;

    const q1Correct = q1Answer === currentDanger.questions.q1.correctIndex;
    const q2Correct = q2Answer === currentDanger.questions.q2.correctIndex;

    setQuizResult({ q1Correct, q2Correct });

    // 更新計分: Q1答對 +5分, Q2答對 +5分
    const quizPoints = (q1Correct ? 5 : 0) + (q2Correct ? 5 : 0);
    setScore((prev) => prev + quizPoints);
    setFoundCount((prev) => prev + 1);

    // 記錄此危險因子的結果
    const totalPoints = 10 + quizPoints; // 找到危險 10分 + 問答分數
    setDangerResults((prev) => [
      ...prev,
      {
        dangerId: currentDanger.id,
        dangerName: currentDanger.name,
        found: true,
        q1Correct,
        q2Correct,
        pointsEarned: totalPoints,
      },
    ]);

    setStatus('feedback');
  }, [currentDanger]);

  const handleContinue = useCallback(() => {
    setCurrentDanger(null);
    setQuizResult(null);

    // Check if all dangers found
    if (foundCount + 1 >= totalDangers) {
      // 遊戲勝利 - 計算錯過的危險因子（應該為空）
      const foundDangerIds = new Set(dangerResults.map((r) => r.dangerId));
      const missedDangers = dangerList
        .filter((d) => !foundDangerIds.has(d.id))
        .map((d) => d.id);

      setErrorStats((prev) => ({
        ...prev,
        missedDangers,
      }));

      setStatus('won');
    } else {
      setStatus('playing');
    }
  }, [foundCount, totalDangers, dangerResults, dangerList]);

  const handleTimeUp = useCallback(() => {
    if (status === 'playing') {
      // 記錄未找到的危險因子
      const foundDangerIds = new Set(dangerResults.map((r) => r.dangerId));
      const missedDangers = dangerList
        .filter((d) => !foundDangerIds.has(d.id))
        .map((d) => d.id);

      setErrorStats((prev) => ({
        ...prev,
        missedDangers,
      }));

      // 根據是否找到所有危險因子決定勝負
      if (foundCount >= totalDangers) {
        setStatus('won');
      } else {
        setStatus('lost');
      }
    }
  }, [status, dangerResults, dangerList, foundCount, totalDangers]);

  const resetGame = useCallback(() => {
    setStatus('ready');
    setLives(maxLives);
    setFoundCount(0);
    setScore(0);
    setCurrentDanger(null);
    setQuizResult(null);
    setErrorStats({
      consecutiveWrongClicks: 0,
      totalWrongClicks: 0,
      missedDangers: [],
    });
    setDangerResults([]);
  }, [maxLives]);

  const progress: GameProgress = {
    timeRemaining: timeLimit,
    lives,
    foundCount,
    totalDangers,
    score,
    status,
  };

  return {
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
  };
}
