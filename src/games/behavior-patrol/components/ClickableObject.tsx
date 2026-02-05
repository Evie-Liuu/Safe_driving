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
  onClick,
  disabled = false,
  found = false,
}: ClickableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(model);
  const [clonedScene, setClonedScene] = useState<THREE.Group | null>(null);
  const animControllerRef = useRef<AnimationController | null>(null);
  const pathProgressRef = useRef(0);
  const currentPathIndexRef = useRef(0);

  // Clone the scene and update to data pose
  useEffect(() => {
    // 使用 SkeletonUtils.clone 以正確複製 SkinnedMesh 骨架
    const clone = SkeletonUtils.clone(scene) as THREE.Group;

    // 更新成資料姿態 (Rest Pose / Bind Pose)
    clone.traverse((child) => {
      if ((child as any).isSkinnedMesh) {
        (child as any).skeleton.pose();
      }
    });

    setClonedScene(clone);

    return () => {
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
    };
  }, [scene]);

  // Load animations
  useEffect(() => {
    if (!clonedScene || !animationUrls || animationUrls.length === 0) return;

    const loadAnimations = async () => {
      const loader = getSharedLoader();
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
    };

    loadAnimations();

    return () => {
      animControllerRef.current?.stopAll();
    };
  }, [clonedScene, animationUrls, behaviors]);

  // Update animations and movement
  useFrame((_, delta) => {
    if (!groupRef.current || found) return;

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

  if (!clonedScene) return null;

  return (
    <group
      ref={groupRef}
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
      <primitive object={clonedScene} />
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
