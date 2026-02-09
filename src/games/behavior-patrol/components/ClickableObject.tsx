import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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
  enableDebug?: boolean;
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
  enableDebug = true,
}: ClickableObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const modelSceneRef = useRef<THREE.Object3D | null>(null);
  const animControllerRef = useRef<AnimationController | null>(null);
  const pathProgressRef = useRef(0);
  const currentPathIndexRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hitBoxArgs, setHitBoxArgs] = useState<{ size: [number, number, number]; center: [number, number, number] } | null>(null);

  // Debug path visualization state
  const [debugPath, setDebugPath] = useState<[number, number, number][] | null>(null)


  // Extract behaviors with useMemo to avoid recalculation
  const animBehavior = useMemo(
    () => behaviors.find(b => b.type === 'animation'),
    [behaviors]
  );

  const movementBehavior = useMemo(
    () => behaviors.find(b => b.type === 'movement'),
    [behaviors]
  );

  // Load model and animations
  useEffect(() => {
    let isMounted = true;
    const loader = getSharedLoader();

    const loadModelAndAnimations = async () => {
      try {
        setIsReady(false);
        setLoadError(null);

        // Load model
        const gltf = await loader.loadAsync(model);
        if (!isMounted) return;

        // Clone scene with skeleton support
        const clonedScene = SkeletonUtils.clone(gltf.scene);
        modelSceneRef.current = clonedScene;

        // Configure accessories and shadows
        clonedScene.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }

            // Handle accessory visibility
            const childAccessoryName = child.name.toLocaleLowerCase().split('_')[1];
            console.log(childAccessoryName);

            if (accessoryNames && childAccessoryName && child.name.includes('Accessory')) {
              child.visible = accessoryNames.includes(childAccessoryName);
            }
          }
        });

        // Load animations if specified
        if (animationUrls && animationUrls.length > 0) {
          const animController = new AnimationController(clonedScene);
          animControllerRef.current = animController;

          // Load all animations
          for (const url of animationUrls) {
            try {
              const animGltf = await loader.loadAsync(url);
              if (!isMounted) return;
              animController.loadSeparateAnimations(animGltf, clonedScene);
            } catch (error) {
              console.error(`[ClickableObject] Failed to load animation: ${url}`, error);
            }
          }

          // Start initial animation if specified
          if (animBehavior?.animation) {
            animController.play(animBehavior.animation, {
              loop: animBehavior.animationLoop ? THREE.LoopRepeat : THREE.LoopOnce,
            });
          }
        }

        if (isMounted) {
          setIsReady(true);
          console.log(`[ClickableObject] Successfully loaded: ${id}`);

          if (enableDebug && movementBehavior?.path) {
            setDebugPath(movementBehavior.path)
          }
        }
      } catch (error) {
        if (isMounted) {
          const errorMsg = `Failed to load model: ${model}`;
          console.error(`[ClickableObject] ${errorMsg}`, error);
          setLoadError(errorMsg);
          setIsReady(false);
        }
      }
    };

    loadModelAndAnimations();

    // Cleanup
    return () => {
      isMounted = false;

      // Stop all animations
      animControllerRef.current?.stopAll();
      animControllerRef.current = null;

      // Clean up model scene
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
  }, [model, animationUrls, accessoryNames, animBehavior, id]);

  // Handle click with useCallback
  const handleClick = useCallback((e: THREE.Event) => {
    e.stopPropagation();
    if (!disabled && !found) {
      onClick();
    }
  }, [disabled, found, onClick]);

  // Handle pointer over with useCallback
  const handlePointerOver = useCallback((e: THREE.Event) => {
    e.stopPropagation();
    if (!disabled && !found) {
      document.body.style.cursor = 'pointer';
    }
  }, [disabled, found]);

  // Handle pointer out with useCallback
  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'default';
  }, []);

  // Update animations and movement
  useFrame((_, delta) => {
    if (!groupRef.current || found || !isReady || !modelSceneRef.current) return;

    // Update animation
    animControllerRef.current?.update(delta);

    // Handle movement behavior
    if (movementBehavior?.path && movementBehavior.path.length >= 2) {
      const path = movementBehavior.path;
      const speed = movementBehavior.speed ?? 1;
      const loop = movementBehavior.loop ?? false;

      const currentIndex = currentPathIndexRef.current;
      const nextIndex = (currentIndex + 1) % path.length;

      // Stop if reached end without loop
      if (nextIndex === 0 && !loop) {
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
        if (direction.lengthSq() > 0.001) { // Use lengthSq for performance
          const angle = Math.atan2(direction.x, direction.z);
          groupRef.current.rotation.y = angle;
        }
      }
    }
  });

  // Show error state
  if (loadError) {
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
        </mesh>
      </group>
    );
  }

  // Calculate hit box when scene changes
  useEffect(() => {
    if (!modelSceneRef.current) return;

    // Ensure matrices are up to date for accurate box calculation
    modelSceneRef.current.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(modelSceneRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Ensure minimum size for clickability
    size.max(new THREE.Vector3(1, 1, 1));

    // Scale up slightly for better UX
    size.multiplyScalar(1.2);

    setHitBoxArgs({
      size: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z]
    });
  }, [modelSceneRef]);

  // Don't render until ready
  if (!modelSceneRef.current || !isReady) {
    return null;
  }

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
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

      {/* Path visualization - rendered in world space (outside group) */}
      {
        enableDebug && debugPath && debugPath.map((point, idx) => (
          <mesh key={`path-${id}-${idx}`} position={[point[0], point[1] + 0.5, point[2]]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
        ))
      }
    </>
  );
}
