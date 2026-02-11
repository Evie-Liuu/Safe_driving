import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import {
  DangerActor,
  DangerAction,
  ActionType,
  MovementAction,
  AnimationAction,
} from '../types';
import { AnimationController } from '../../../game/animations/AnimationController';
import { getSharedLoader } from '../../../game/utils/SharedLoader';

interface DangerActorObjectProps {
  actor: DangerActor;
  actions: DangerAction[];
  onClick?: (point?: THREE.Vector3) => void;
  disabled?: boolean;
  found?: boolean;
  enableDebug?: boolean;
  // 整個行為序列重播設定
  onComplete?: () => void;
  resetKey?: number;
}

export function DangerActorObject({
  actor,
  actions,
  onClick,
  disabled = false,
  found = false,
  enableDebug = false,
  onComplete,
  resetKey = 0,
}: DangerActorObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelSceneRef = useRef<THREE.Object3D | null>(null);
  const animControllerRef = useRef<AnimationController | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const elapsedTimeRef = useRef(0);

  // 重播狀態追蹤
  const sequenceCompletedRef = useRef(false); // 標記整個序列是否已完成
  const [isVisible, setIsVisible] = useState(true); // 控制物件可見性

  // 開發測試: 追蹤 bus_1 移動開始時間和轉彎時間
  const movementStartTimeRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<THREE.Vector3 | null>(null);
  const [turnTime, setTurnTime] = useState<number | null>(null);
  const hasDetectedTurnRef = useRef(false);

  // Extract movement and animation actions
  const movementActions = useMemo(
    () => actions.filter((a): a is MovementAction => a.type === ActionType.MOVEMENT),
    [actions]
  );

  const animationActions = useMemo(
    () => actions.filter((a): a is AnimationAction => a.type === ActionType.ANIMATION),
    [actions]
  );

  // State for active movement action
  const [activeMovement, setActiveMovement] = useState<MovementAction | null>(null);
  const pathProgressRef = useRef(0);
  const currentPathIndexRef = useRef(0);

  // 追蹤已播放的動畫（避免重複觸發）
  const playedAnimationsRef = useRef<Set<string>>(new Set());

  // 追蹤重複播放狀態
  const repeatCountRef = useRef<Map<string, number>>(new Map()); // 記錄每個動畫的播放次數
  const lastPlayTimeRef = useRef<Map<string, number>>(new Map()); // 記錄每個動畫最後播放時間

  // 追蹤已準備的動畫（顯示第一幀姿勢）
  const preparedAnimationsRef = useRef<Set<string>>(new Set());

  // 追蹤已啟動的移動動作（避免重複觸發）
  const startedMovementsRef = useRef<Set<string>>(new Set());
  // 追蹤已完成的移動動作
  const completedMovementsRef = useRef<Set<string>>(new Set());

  // 重置序列狀態函數
  const resetSequence = () => {
    elapsedTimeRef.current = 0;
    sequenceCompletedRef.current = false;
    pathProgressRef.current = 0;
    currentPathIndexRef.current = 0;
    setActiveMovement(null);

    // 清空所有追蹤狀態
    playedAnimationsRef.current.clear();
    repeatCountRef.current.clear();
    lastPlayTimeRef.current.clear();
    startedMovementsRef.current.clear();
    completedMovementsRef.current.clear();
    preparedAnimationsRef.current.clear();

    // 停止所有動畫
    animControllerRef.current?.stopAll();

    // 重置位置和旋轉
    if (groupRef.current) {
      groupRef.current.position.set(...actor.initialPosition);
      if (actor.initialRotation) {
        groupRef.current.rotation.set(...actor.initialRotation);
      }
    }

    // 恢復可見性
    setIsVisible(true);

    // // 重置移動追蹤 (bus_1 測試用)
    // if (actor.id === 'bus_1') {
    //   movementStartTimeRef.current = null;
    //   lastDirectionRef.current = null;
    //   hasDetectedTurnRef.current = false;
    //   setTurnTime(null);
    // }

    console.log(`[DangerActorObject] Sequence reset for ${actor.id}`);
  };

  // Load model and animations
  useEffect(() => {
    let isMounted = true;
    const loader = getSharedLoader();

    const loadModelAndAnimations = async () => {
      try {
        setIsReady(false);
        setLoadError(null);

        // Load model
        const gltf = await loader.loadAsync(actor.model);
        if (!isMounted) return;

        // Clone scene with skeleton support
        const clonedScene = SkeletonUtils.clone(gltf.scene);
        modelSceneRef.current = clonedScene;

        // Configure shadows and accessories
        clonedScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Apply color if specified
            if (actor.color && child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if ('color' in mat) {
                    (mat as THREE.MeshStandardMaterial).color.set(actor.color!);
                  }
                });
              } else if ('color' in child.material) {
                (child.material as THREE.MeshStandardMaterial).color.set(actor.color);
              }
            }
          }

          // Handle accessory visibility
          if (actor.accessoryNames && child.name.includes('Accessory')) {
            const childAccessoryName = child.name.toLowerCase().split('_')[1];
            child.visible = actor.accessoryNames.includes(childAccessoryName);
          }
        });

        // Load animations if specified
        if (actor.animationUrls && actor.animationUrls.length > 0) {
          const animController = new AnimationController(clonedScene);
          animControllerRef.current = animController;

          // Load all animations
          for (const url of actor.animationUrls) {
            try {
              const animGltf = await loader.loadAsync(url);
              if (!isMounted) return;
              animController.loadSeparateAnimations(animGltf, clonedScene);
            } catch (error) {
              console.error(`[DangerActorObject] Failed to load animation: ${url}`, error);
            }
          }
        }

        if (isMounted) {
          // 為所有動畫動作準備第一幀姿勢（讓角色在初始時就顯示姿勢）
          if (animControllerRef.current && animationActions.length > 0) {
            animationActions.forEach((action) => {
              const animConfig: any = {
                loop: action.loop ? THREE.LoopRepeat : THREE.LoopOnce,
                clampWhenFinished: action.clampWhenFinished ?? !action.loop,
              };

              if (action.timeScale !== undefined) animConfig.timeScale = action.timeScale;

              try {
                animControllerRef.current?.prepareToFirstFrame(action.name, animConfig);
                const animKey = `${action.name}_${action.time}`;
                preparedAnimationsRef.current.add(animKey);
                console.log(`[DangerActorObject] Prepared animation to first frame: ${action.name} for ${actor.id}`);
              } catch (error) {
                console.error(`[DangerActorObject] Failed to prepare animation: ${action.name}`, error);
              }
            });
          }

          setIsReady(true);
          // console.log(`[DangerActorObject] Successfully loaded: ${actor.id}`);
        }
      } catch (error) {
        if (isMounted) {
          const errorMsg = `Failed to load model: ${actor.model}`;
          console.error(`[DangerActorObject] ${errorMsg}`, error);
          setLoadError(errorMsg);
          setIsReady(false);
        }
      }
    };

    loadModelAndAnimations();

    // Cleanup
    return () => {
      isMounted = false;
      animControllerRef.current?.stopAll();
      animControllerRef.current = null;

      // 清空追蹤狀態
      playedAnimationsRef.current.clear();
      repeatCountRef.current.clear();
      lastPlayTimeRef.current.clear();
      startedMovementsRef.current.clear();
      completedMovementsRef.current.clear();
      preparedAnimationsRef.current.clear();

      // 清空重播狀態
      sequenceCompletedRef.current = false;

      if (modelSceneRef.current) {
        modelSceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        modelSceneRef.current = null;
      }
    };
  }, [actor]);

  // 當被找到時停止重播
  useEffect(() => {
    if (found) {
      sequenceCompletedRef.current = true;
      animControllerRef.current?.stopAll();
      // 確保物件可見(可能正在等待重播而被隱藏)
      setIsVisible(true);
    }
  }, [found]);


  // Handle external reset
  useEffect(() => {
    if (resetKey > 0) {
      resetSequence();
    }
  }, [resetKey]);

  // Handle actions based on elapsed time
  useFrame((_, delta) => {
    if (!groupRef.current || found || !isReady || !modelSceneRef.current) return;

    elapsedTimeRef.current += delta;
    const currentTime = elapsedTimeRef.current;

    // Update animations
    animControllerRef.current?.update(delta);

    // Check and start animation actions
    animationActions.forEach((action) => {
      // 創建唯一的動畫 key（避免重複播放）
      const animKey = `${action.name}_${action.time}`;
      const playCount = repeatCountRef.current.get(animKey) || 0;
      const lastPlayTime = lastPlayTimeRef.current.get(animKey) || 0;

      // 檢查是否應該播放（首次播放或重複播放）
      const shouldPlayFirst = currentTime >= action.time && playCount === 0;
      const shouldRepeat =
        action.repeatInterval &&
        playCount > 0 &&
        currentTime >= lastPlayTime + action.repeatInterval &&
        (!action.repeatCount || playCount < action.repeatCount);

      const shouldPlay = shouldPlayFirst || shouldRepeat;

      if (shouldPlay && animControllerRef.current) {
        const isRepeat = playCount > 0;
        const isPrepared = preparedAnimationsRef.current.has(animKey);

        // console.log(
        //   `[DangerActorObject] ${isRepeat ? 'Repeating' : 'Starting'} animation: ${action.name} for ${actor.id} at ${currentTime.toFixed(2)}s (play #${playCount + 1})`
        // );

        // 如果是首次播放且已準備好第一幀，則恢復播放
        if (!isRepeat && isPrepared) {
          animControllerRef.current.resumeAnimation(action.name);
          console.log(`[DangerActorObject] Resuming prepared animation: ${action.name} for ${actor.id}`);
        } else {
          // 重複播放或未準備的情況，使用正常播放
          const animConfig: any = {
            loop: action.loop ? THREE.LoopRepeat : THREE.LoopOnce,
            clampWhenFinished: action.clampWhenFinished ?? !action.loop,
          };

          // 可選參數
          if (action.fadeIn !== undefined) animConfig.fadeIn = action.fadeIn;
          if (action.fadeOut !== undefined) animConfig.fadeOut = action.fadeOut;
          if (action.timeScale !== undefined) animConfig.timeScale = action.timeScale;

          animControllerRef.current.play(action.name, animConfig);
        }

        // 更新追蹤狀態
        repeatCountRef.current.set(animKey, playCount + 1);
        lastPlayTimeRef.current.set(animKey, currentTime);
        playedAnimationsRef.current.add(animKey);
      }

      // TODO: 檢查是否應該停止（如果有設定 duration 或是所有移動動作已完成）
      const allMovementsCompleted = movementActions.length > 0 &&
        movementActions.every(m => {
          const mKey = `${m.actorId}_movement_${m.time}`;
          return m.duration ? (currentTime >= m.time + m.duration) : completedMovementsRef.current.has(mKey);
        });

      if (
        (action.duration && currentTime >= action.time + action.duration) ||
        (!action.duration && !action.loop && allMovementsCompleted)
      ) {
        if (animControllerRef.current && playedAnimationsRef.current.has(animKey)) {
          // console.log(`[DangerActorObject] Stopping animation: ${action.name} after duration or movement completion`);
          animControllerRef.current.stop(action.name);
        }
      }
    });

    // Check and start movement actions
    movementActions.forEach((action) => {
      const movementKey = `${action.actorId}_movement_${action.time}`;

      // 如果已經完成，不再次啟動（除非重播重置過）
      if (completedMovementsRef.current.has(movementKey)) return;

      // ✅ 改用狀態追蹤，不依賴單幀時間窗口
      if (
        currentTime >= action.time &&
        !startedMovementsRef.current.has(movementKey) &&
        (!activeMovement || activeMovement !== action)
      ) {
        console.log(`[DangerActorObject] Starting movement for ${actor.id} at ${currentTime.toFixed(2)}s`);
        setActiveMovement(action);
        pathProgressRef.current = 0;
        currentPathIndexRef.current = 0;

        // 標記為已啟動
        startedMovementsRef.current.add(movementKey);
      }

      // Check if movement should end
      // if (action.duration && currentTime >= action.time + action.duration) {
      //   if (activeMovement === action || !completedMovementsRef.current.has(movementKey)) {
      //     if (activeMovement === action) {
      //       console.log(`[DangerActorObject] Stopping movement after duration for ${actor.id}`);
      //       setActiveMovement(null);
      //     }
      //     completedMovementsRef.current.add(movementKey);
      //   }
      // }
    });

    // Handle active movement
    if (activeMovement && activeMovement.path && activeMovement.path.length >= 2) {
      const path = activeMovement.path;
      const speed = activeMovement.speed ?? 1;
      const loop = activeMovement.loop ?? false;

      // // 開發測試: 記錄 bus_1 移動開始時間
      // if (actor.id === 'bus_1' && movementStartTimeRef.current === null) {
      //   movementStartTimeRef.current = currentTime;
      //   console.log(`[DangerActorObject] bus_1 movement started at ${currentTime.toFixed(2)}s`);
      // }

      const currentIndex = currentPathIndexRef.current;
      const nextIndex = (currentIndex + 1) % path.length;

      // Stop if reached end without loop
      if (nextIndex === 0 && !loop) {
        const movementKey = `${activeMovement.actorId}_movement_${activeMovement.time}`;

        if (!activeMovement.duration) {
          completedMovementsRef.current.add(movementKey);
          console.log(`[DangerActorObject] Movement reached end for ${actor.id}`);
          setActiveMovement(null);
        } else {
          // and duration
          if (currentTime >= activeMovement.time + activeMovement.duration) {
            completedMovementsRef.current.add(movementKey);
            console.log(`[DangerActorObject] Movement reached end for ${actor.id}`);
            setActiveMovement(null);
          }
        }
        return;
      }

      const start = new THREE.Vector3(...path[currentIndex]);
      const end = new THREE.Vector3(...path[nextIndex]);
      const distance = start.distanceTo(end);
      const duration = distance / speed;

      pathProgressRef.current += delta / duration;

      if (pathProgressRef.current >= 1) {
        // Move to next segment
        pathProgressRef.current = 0;
        currentPathIndexRef.current = nextIndex;

        if (nextIndex === 0 && loop) {
          groupRef.current.position.set(...path[0]);
        }
      } else {
        // Interpolate position
        const newPos = start.clone().lerp(end, pathProgressRef.current);
        groupRef.current.position.copy(newPos);

        // Face movement direction
        const direction = end.clone().sub(start).normalize();
        if (direction.lengthSq() > 0.001) {
          const angle = Math.atan2(direction.x, direction.z);
          groupRef.current.rotation.y = angle;

          // // 開發測試: 檢測 bus_1 轉彎
          // if (actor.id === 'bus_1') { // && !hasDetectedTurnRef.current) {
          //   if (lastDirectionRef.current !== null) {
          //     // 計算方向改變的角度
          //     const dotProduct = lastDirectionRef.current.dot(direction);
          //     const angleChange = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
          //     const angleDegrees = (angleChange * 180) / Math.PI;

          //     // 如果角度變化超過 30 度，視為轉彎
          //     console.log('angleDegrees', angleDegrees);

          //     if (angleDegrees > 30 && movementStartTimeRef.current !== null) {
          //       const elapsedTime = currentTime - movementStartTimeRef.current;
          //       setTurnTime(elapsedTime);
          //       hasDetectedTurnRef.current = true;
          //       console.log(
          //         `[DangerActorObject] bus_1 turned at ${currentTime.toFixed(2)}s (elapsed: ${elapsedTime.toFixed(2)}s, angle change: ${angleDegrees.toFixed(1)}°)`
          //       );
          //     }
          //   }
          //   lastDirectionRef.current = direction.clone();
          // }
        }
      }
    }

    // 處理整個序列的重播邏輯
    // 改為外部控制：檢查是否完成，通知父組件
    if (onComplete && !sequenceCompletedRef.current) {
      // 檢測所有動作是否已完成
      const allActionsComplete = actions.every((action) => {
        if (action.type === ActionType.MOVEMENT) {
          const movementKey = `${action.actorId}_movement_${action.time}`;
          const movAction = action as MovementAction;

          // loop = true: 只要啟動就算完成（因為會一直循環）
          if (movAction.loop) {
            return startedMovementsRef.current.has(movementKey);
          }

          // loop = false: 必須完成路徑所有移動
          const pathCompleted = completedMovementsRef.current.has(movementKey);

          // 如果有設定 duration，則必須同時滿足：1) 路徑完成 2) duration 時間到達
          if (movAction.duration) {
            const durationReached = currentTime >= movAction.time + movAction.duration;
            return pathCompleted && durationReached;
          }

          // 沒有 duration：只需要路徑完成即可
          return pathCompleted;
        }

        if (action.type === ActionType.ANIMATION) {
          const animAction = action as AnimationAction;
          const animKey = `${animAction.name}_${animAction.time}`;

          // 如果有 duration，必須時間達成
          if (animAction.duration) {
            return currentTime >= animAction.time + animAction.duration;
          }

          // 沒有 duration：檢查是否已播放
          return playedAnimationsRef.current.has(animKey);
        }

        // 其他類型的動作：有 duration 檢查時間，沒有則檢查是否已開始
        if (action.duration) {
          return currentTime >= action.time + action.duration;
        }
        return currentTime >= action.time;
      });

      if (allActionsComplete && actions.length > 0) {
        sequenceCompletedRef.current = true;

        // 隱藏物件, 通知父組件
        setIsVisible(false);
        if (onComplete) {
          onComplete();
        }

        console.log(
          `[DangerActorObject] Sequence completed for ${actor.id} at ${currentTime.toFixed(2)}s`
        );
      }
    }
  });

  // Show error state
  if (loadError) {
    return (
      <group position={actor.initialPosition}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  // Don't render until ready
  if (!modelSceneRef.current || !isReady) {
    return null;
  }

  return (
    <>
      <group
        ref={groupRef}
        position={actor.initialPosition}
        rotation={actor.initialRotation || [0, 0, 0]}
        scale={actor.scale || [1, 1, 1]}
        visible={isVisible} // 控制可見性
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && !found && onClick && isVisible) {
            onClick(e.point);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (!disabled && !found && onClick && isVisible) {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <primitive object={modelSceneRef.current} />

        {/* Invisible hitbox for better clicking */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Visual indicator when found */}
        {found && (
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#4CAF50" transparent opacity={0.8} />
          </mesh>
        )}
      </group>
      {/* Debug: Show path */}
      {enableDebug &&
        movementActions.map((action, idx) =>
          action.path?.map((point, pIdx) => (
            <mesh
              key={`path-${actor.id}-${idx}-${pIdx}`}
              position={[point[0], point[1] + 0.5, point[2]]}
            >
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshBasicMaterial color="yellow" />
            </mesh>
          ))
        )}
    </>
  );
}
