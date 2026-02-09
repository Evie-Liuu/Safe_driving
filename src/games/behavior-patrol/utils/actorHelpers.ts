import { DangerFactor, DangerActor, DangerAction, ActionType } from '../types';

/**
 * 判斷 DangerFactor 是否使用多角色格式
 */
export function isMultiActorDanger(danger: DangerFactor): boolean {
  return danger.actors.length > 1;
}

/**
 * 獲取 DangerFactor 中所有角色的數量
 */
export function getActorCount(danger: DangerFactor): number {
  return danger.actors.length;
}

/**
 * 根據 ID 查找特定角色
 */
export function findActorById(danger: DangerFactor, actorId: string): DangerActor | undefined {
  return danger.actors.find(actor => actor.id === actorId);
}

/**
 * 獲取某個角色的所有 actions
 */
export function getActionsForActor(danger: DangerFactor, actorId: string): DangerAction[] {
  return danger.actions.filter(action => action.actorId === actorId);
}

/**
 * 獲取某個角色的 movement actions
 */
export function getMovementActionsForActor(danger: DangerFactor, actorId: string): DangerAction[] {
  return danger.actions.filter(
    action => action.actorId === actorId && action.type === ActionType.MOVEMENT
  );
}

/**
 * 獲取某個角色的 animation actions
 */
export function getAnimationActionsForActor(danger: DangerFactor, actorId: string): DangerAction[] {
  return danger.actions.filter(
    action => action.actorId === actorId && action.type === ActionType.ANIMATION
  );
}

/**
 * 獲取所有角色的初始位置（用於計算邊界或中心點）
 */
export function getAllActorPositions(danger: DangerFactor): [number, number, number][] {
  return danger.actors.map(actor => actor.initialPosition);
}

/**
 * 計算多角色事件的中心點（用於點擊檢測或相機聚焦）
 */
export function calculateDangerCenter(danger: DangerFactor): [number, number, number] {
  const positions = getAllActorPositions(danger);

  if (positions.length === 0) {
    return [0, 0, 0];
  }

  const sum = positions.reduce(
    (acc, pos) => [acc[0] + pos[0], acc[1] + pos[1], acc[2] + pos[2]],
    [0, 0, 0] as [number, number, number]
  );

  return [
    sum[0] / positions.length,
    sum[1] / positions.length,
    sum[2] / positions.length,
  ];
}

/**
 * 獲取事件的邊界半徑（用於點擊檢測範圍）
 */
export function calculateDangerRadius(danger: DangerFactor): number {
  const positions = getAllActorPositions(danger);

  if (positions.length <= 1) {
    return 2; // 單一角色默認半徑 2 米
  }

  const center = calculateDangerCenter(danger);
  const maxDistance = Math.max(
    ...positions.map(pos => {
      const dx = pos[0] - center[0];
      const dy = pos[1] - center[1];
      const dz = pos[2] - center[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    })
  );

  // 返回最大距離 + 緩衝（2米）
  return maxDistance + 2;
}
