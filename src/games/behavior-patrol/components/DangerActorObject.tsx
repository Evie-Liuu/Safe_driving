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
  onClick?: () => void;
  disabled?: boolean;
  found?: boolean;
  enableDebug?: boolean;
}

export function DangerActorObject({
  actor,
  actions,
  onClick,
  disabled = false,
  found = false,
  enableDebug = false,
}: DangerActorObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelSceneRef = useRef<THREE.Object3D | null>(null);
  const animControllerRef = useRef<AnimationController | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const elapsedTimeRef = useRef(0);

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
          setIsReady(true);
          console.log(`[DangerActorObject] Successfully loaded: ${actor.id}`);
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

      // 檢查是否應該開始播放（時間已到且尚未播放）
      if (currentTime >= action.time && !playedAnimationsRef.current.has(animKey)) {
        if (animControllerRef.current) {
          console.log(`[DangerActorObject] Starting animation: ${action.name} for ${actor.id} at ${currentTime.toFixed(2)}s`);

          // 構建動畫配置
          const animConfig: any = {
            loop: action.loop ? THREE.LoopRepeat : THREE.LoopOnce,
            clampWhenFinished: action.clampWhenFinished ?? !action.loop, // 默認：非循環動畫保持最後姿勢
          };

          // 可選參數
          if (action.fadeIn !== undefined) animConfig.fadeIn = action.fadeIn;
          if (action.fadeOut !== undefined) animConfig.fadeOut = action.fadeOut;
          if (action.timeScale !== undefined) animConfig.timeScale = action.timeScale;

          animControllerRef.current.play(action.name, animConfig);

          // 標記為已播放
          playedAnimationsRef.current.add(animKey);
        }
      }

      // 檢查是否應該停止（如果有設定 duration）
      if (action.duration && currentTime >= action.time + action.duration) {
        if (animControllerRef.current && playedAnimationsRef.current.has(animKey)) {
          console.log(`[DangerActorObject] Stopping animation: ${action.name} after duration`);
          animControllerRef.current.stop(action.name);
        }
      }
    });

    // Check and start movement actions
    movementActions.forEach((action) => {
      if (
        currentTime >= action.time &&
        currentTime < action.time + delta &&
        (!activeMovement || activeMovement !== action)
      ) {
        console.log(`[DangerActorObject] Starting movement for ${actor.id}`);
        setActiveMovement(action);
        pathProgressRef.current = 0;
        currentPathIndexRef.current = 0;
      }

      // Check if movement should end
      if (action.duration && currentTime >= action.time + action.duration) {
        if (activeMovement === action) {
          setActiveMovement(null);
        }
      }
    });

    // Handle active movement
    if (activeMovement && activeMovement.path && activeMovement.path.length >= 2) {
      const path = activeMovement.path;
      const speed = activeMovement.speed ?? 1;
      const loop = activeMovement.loop ?? false;

      const currentIndex = currentPathIndexRef.current;
      const nextIndex = (currentIndex + 1) % path.length;

      // Stop if reached end without loop
      if (nextIndex === 0 && !loop) {
        setActiveMovement(null);
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
        }
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
    <group
      ref={groupRef}
      position={actor.initialPosition}
      rotation={actor.initialRotation || [0, 0, 0]}
      scale={actor.scale || [1, 1, 1]}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !found && onClick) {
          onClick();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!disabled && !found && onClick) {
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
    </group>
  );
}
