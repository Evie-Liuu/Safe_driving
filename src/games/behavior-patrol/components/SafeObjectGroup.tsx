import { SafeObject } from '../types';
import { DangerActorObject } from './DangerActorObject';
import { getActionsForActor } from '../utils/actorHelpers';

interface SafeObjectGroupProps {
  safeObject: SafeObject;
  onClick: () => void;
  disabled?: boolean;
  enableDebug?: boolean;
}

/**
 * SafeObjectGroup - 渲染安全物件的所有角色
 * 與 DangerGroup 類似，但用於 SafeObject
 */
export function SafeObjectGroup({
  safeObject,
  onClick,
  disabled = false,
  enableDebug = false,
}: SafeObjectGroupProps) {
  return (
    <>
      {safeObject.actors.map((actor) => {
        // 獲取該角色的所有 actions
        const actorActions = safeObject.actions.filter(action => action.actorId === actor.id);

        return (
          <DangerActorObject
            key={actor.id}
            actor={actor}
            actions={actorActions}
            onClick={onClick}
            disabled={disabled}
            found={false}
            enableDebug={enableDebug}
          />
        );
      })}
    </>
  );
}
