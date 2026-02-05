import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { DangerBehavior } from '../types';
import { AnimationController } from '../../../game/animations/AnimationController';
import { getSharedLoader } from '../../../game/utils/SharedLoader';

interface ClickableObjectProps {
  id: string;
  model: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  behaviors: DangerBehavior[];
  animationUrls?: string[];
  accessoryNames?: string[];
  onClick: () => void;
  disabled?: boolean;
  found?: boolean;
}

export function ClickableObject({
  id,
  model,
  position,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  behaviors,
  animationUrls,
  accessoryNames,
  onClick,
  disabled = false,
  found = false,
}: ClickableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  // const { scene } = useGLTF(model);
  const modelSceneRef = useRef<THREE.Object3D | null>(null)
  const animControllerRef = useRef<AnimationController | null>(null);
  const pathProgressRef = useRef(0);
  const currentPathIndexRef = useRef(0);
  const [hitBoxArgs, setHitBoxArgs] = useState<{ size: [number, number, number], center: [number, number, number] } | null>(null);



  const [isReady, setIsReady] = useState(false);

  // Load animations
  useEffect(() => {
    // if (!modelSceneRef.current) return;

    const loadModelAndAnimations = async () => {
      setIsReady(false);

      const loader = getSharedLoader();
      const gltf = await loader.loadAsync(model);
      // 使用 SkeletonUtils.clone 以正確複製 SkinnedMesh 骨架
      const clonedScene = SkeletonUtils.clone(gltf.scene)
      modelSceneRef.current = clonedScene

      // console.log(model);
      // console.log(clonedScene);

      // 配件
      if (accessoryNames && accessoryNames.length > 0) {
        modelSceneRef.current?.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (!child.name.includes('Accessory')) return
            if (accessoryNames.includes(child.name)) {
              child.visible = false;
            } else {
              child.visible = true;
            }
          }
        });
      }

      // TODO: Add clonedScene to the group first, so AnimationMixer can find all nodes
      // if (groupRef.current) {
      //   groupRef.current.add(clonedScene)
      // }

      if (animationUrls && animationUrls.length > 0) {
        for (const url of animationUrls) {
          try {
            const gltf = await loader.loadAsync(url);
            if (!animControllerRef.current) {
              animControllerRef.current = new AnimationController(clonedScene);
            }
            animControllerRef.current.loadSeparateAnimations(gltf, clonedScene);
          } catch (error) {
            console.error(`Failed to load animation: ${url}`, error);
          }
        }

        // Start animation behaviors
        const animBehavior = behaviors.find(b => b.type === 'animation');
        if (animBehavior?.animation && animControllerRef.current) {
          animControllerRef.current.play(animBehavior.animation, {
            loop: animBehavior.animationLoop ? THREE.LoopRepeat : THREE.LoopOnce,
          });
        }
      }

      setIsReady(true);
    };

    loadModelAndAnimations();

    return () => {
      animControllerRef.current?.stopAll();
    };
  }, [model, animationUrls]);

  // Update animations and movement
  useFrame((_, delta) => {
    if (!groupRef.current || found || !isReady) return;

    // Update animation
    animControllerRef.current?.update(delta);

    // Handle movement behavior
    const movementBehavior = behaviors.find(b => b.type === 'movement');
    if (movementBehavior?.path && movementBehavior.path.length >= 2) {
      const path = movementBehavior.path;
      const speed = movementBehavior.speed ?? 1;
      const loop = movementBehavior.loop ?? false;

      const currentIndex = currentPathIndexRef.current;
      const nextIndex = (currentIndex + 1) % path.length;

      if (nextIndex === 0 && !loop) {
        // Reached end, stop
        return;
      }

      const start = new THREE.Vector3(...path[currentIndex]);
      const end = new THREE.Vector3(...path[nextIndex]);
      const distance = start.distanceTo(end);
      const duration = distance / speed;

      pathProgressRef.current += delta / duration;

      if (pathProgressRef.current >= 1) {
        pathProgressRef.current = 0;
        currentPathIndexRef.current = nextIndex;
        if (nextIndex === 0 && loop) {
          groupRef.current.position.set(...path[0]);
        }
      } else {
        const newPos = start.clone().lerp(end, pathProgressRef.current);
        groupRef.current.position.copy(newPos);

        // Face movement direction
        const direction = end.clone().sub(start).normalize();
        if (direction.length() > 0) {
          const angle = Math.atan2(direction.x, direction.z);
          groupRef.current.rotation.y = angle;
        }
      }
    }
  });

  // Calculate hit box when scene changes
  // useEffect(() => {
  //   if (!modelSceneRef.current) return;

  //   // Ensure matrices are up to date for accurate box calculation
  //   modelSceneRef.current.updateWorldMatrix(true, true);

  //   const box = new THREE.Box3().setFromObject(modelSceneRef.current);
  //   const size = new THREE.Vector3();
  //   box.getSize(size);
  //   const center = new THREE.Vector3();
  //   box.getCenter(center);

  //   // Ensure minimum size for clickability
  //   size.max(new THREE.Vector3(1, 1, 1));

  //   // Scale up slightly for better UX
  //   size.multiplyScalar(1.2);

  //   setHitBoxArgs({
  //     size: [size.x, size.y, size.z],
  //     center: [center.x, center.y, center.z]
  //   });
  // }, [modelSceneRef]);

  if (!modelSceneRef.current) return null;

  return (
    <group
      ref={groupRef}
      visible={isReady}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !found) {
          onClick();
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!disabled && !found) {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <primitive object={modelSceneRef.current} />

      {/* HitBox for better clicking */}
      {/* {hitBoxArgs && (
        <mesh position={hitBoxArgs.center}>
          <boxGeometry args={hitBoxArgs.size} />
          <meshBasicMaterial transparent opacity={2} depthWrite={false} />
        </mesh>
      )} */}
      {/* Visual indicator when found */}
      {found && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#4CAF50" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
