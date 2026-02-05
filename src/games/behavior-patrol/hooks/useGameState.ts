import { useState, useCallback } from 'react';
import { GameStatus, GameProgress, DangerFactor, QuizResult } from '../types';

interface UseGameStateOptions {
  totalDangers: number;
  maxLives: number;
  timeLimit: number;
}

export function useGameState({ totalDangers, maxLives, timeLimit }: UseGameStateOptions) {
  const [status, setStatus] = useState<GameStatus>('ready');
  const [lives, setLives] = useState(maxLives);
  const [foundCount, setFoundCount] = useState(0);
  const [score, setScore] = useState(0);
  const [currentDanger, setCurrentDanger] = useState<DangerFactor | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const startGame = useCallback(() => {
    setStatus('playing');
    setLives(maxLives);
    setFoundCount(0);
    setScore(0);
    setCurrentDanger(null);
    setQuizResult(null);
  }, [maxLives]);

  const handleCorrectClick = useCallback((danger: DangerFactor) => {
    setCurrentDanger(danger);
    setStatus('quiz');
  }, []);

  const handleWrongClick = useCallback(() => {
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

    // Calculate score: 10 points per correct answer
    const points = (q1Correct ? 10 : 0) + (q2Correct ? 10 : 0);
    setScore((prev) => prev + points);
    setFoundCount((prev) => prev + 1);

    setStatus('feedback');
  }, [currentDanger]);

  const handleContinue = useCallback(() => {
    setCurrentDanger(null);
    setQuizResult(null);

    // Check if all dangers found
    if (foundCount + 1 >= totalDangers) {
      setStatus('won');
    } else {
      setStatus('playing');
    }
  }, [foundCount, totalDangers]);

  const handleTimeUp = useCallback(() => {
    // if (status === 'playing') {
    //   setStatus('lost');
    // }
  }, [status]);

  const resetGame = useCallback(() => {
    setStatus('ready');
    setLives(maxLives);
    setFoundCount(0);
    setScore(0);
    setCurrentDanger(null);
    setQuizResult(null);
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
    startGame,
    handleCorrectClick,
    handleWrongClick,
    handleQuizSubmit,
    handleContinue,
    handleTimeUp,
    resetGame,
  };
}
