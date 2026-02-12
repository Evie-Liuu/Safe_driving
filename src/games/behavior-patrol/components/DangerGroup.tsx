import { useState, useEffect, useCallback, useRef } from 'react';
import { DangerFactor } from '../types';
import { DangerActorObject } from './DangerActorObject';
import { getActionsForActor } from '../utils/actorHelpers';

interface DangerGroupProps {
  danger: DangerFactor;
  onClick: () => void;
  disabled?: boolean;
  enableDebug?: boolean;
}

/**
 * DangerGroup - 渲染單一危險因子的所有角色
 * 採用 RiskEvents 的 actors + actions 結構
 */
export function DangerGroup({
  danger,
  onClick,
  disabled = false,
  enableDebug = false,
}: DangerGroupProps) {
  const [completedActors, setCompletedActors] = useState<Set<string>>(new Set());
  const [resetKey, setResetKey] = useState(0);
  const [isWaiting, setIsWaiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 當危險因子 ID 改變時，重置所有狀態
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCompletedActors(new Set());
    setResetKey(0);
    setIsWaiting(false);
  }, [danger.id]);

  // 當危險因子已找到時，清理定時器
  useEffect(() => {
    if (danger.found) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsWaiting(false);
    }
  }, [danger.found]);

  // 處理角色完成回調
  const handleActorComplete = useCallback((actorId: string) => {
    setCompletedActors((prev) => {
      const newSet = new Set(prev);
      newSet.add(actorId);
      return newSet;
    });
  }, []);

  // 檢查是否所有「有動作」的角色都已完成
  useEffect(() => {
    if (danger.found || isWaiting) return;

    // 只計算「有動作」的角色
    const actorsWithActions = danger.actors.filter(actor =>
      getActionsForActor(danger, actor.id).length > 0
    );

    if (actorsWithActions.length > 0 && completedActors.size === actorsWithActions.length) {
      console.log(`[DangerGroup] All ${actorsWithActions.length} active actors finished for ${danger.id}.`);

      const interval = danger.replayInterval;

      if (interval !== undefined) {
        setIsWaiting(true);
        console.log(`[DangerGroup] Waiting ${interval}s before replay...`);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (!danger.found) {
            console.log(`[DangerGroup] Triggering replay for ${danger.id}`);
            setCompletedActors(new Set());
            setResetKey((prev) => prev + 1);
            setIsWaiting(false);
            timerRef.current = null;
          }
        }, interval * 1000);
      }
    }
  }, [completedActors, danger.actors, danger.replayInterval, danger.found, danger.id, isWaiting, danger]);

  // 組件卸載時清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <>
      {danger.actors.map((actor) => {
        // 獲取該角色的所有 actions
        const actorActions = getActionsForActor(danger, actor.id);

        return (
          <DangerActorObject
            key={actor.id}
            actor={actor}
            actions={actorActions}
            onClick={onClick}
            disabled={disabled}
            found={danger.found}
            enableDebug={enableDebug}
            onComplete={danger.replayInterval !== undefined ? () => handleActorComplete(actor.id) : undefined}
            resetKey={resetKey}
          />
        );
      })}
    </>
  );
}
