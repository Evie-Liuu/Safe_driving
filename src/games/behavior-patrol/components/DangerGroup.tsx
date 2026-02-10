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
            replayInterval={actor.replayInterval}
            replayCount={actor.replayCount}
          />
        );
      })}
    </>
  );
}
