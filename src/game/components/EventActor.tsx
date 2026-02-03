import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'
import { getSharedLoader } from '../utils/SharedLoader'
import type { GLTF } from 'three-stdlib'
import { EventActor as EventActorType, ActorType } from '../events/EventTypes'
import { AnimationController } from '../animations/AnimationController'
import { AnimationManager } from '../animations/AnimationManager'

/**
 * Movement configuration
 */
interface MovementConfig {
    path: [number, number, number][]
    speed: number
    loop: boolean
}

/**
 * Animation configuration
 */
interface AnimationConfig {
    name: string
    loop: boolean
    fadeIn: number
    fadeOut: number
}

/**
 * Light configuration
 */
interface LightConfig {
    type: 'hazard' | 'turnLeft' | 'turnRight' | 'brake'
    enabled: boolean
    blinkRate?: number
}

/**
 * Sound configuration
 */
interface SoundConfig {
    url: string
    volume: number
    loop: boolean
}

/**
 * Actor handle for imperative control
 */
export interface EventActorHandle {
    startMovement: (config: MovementConfig) => void
    playAnimation: (config: AnimationConfig) => void
    setLight: (config: LightConfig) => void
    playSound: (config: SoundConfig) => void
    getPosition: () => THREE.Vector3
    getRotation: () => number
    loadAnimations: (urls: string[]) => Promise<void>
    resumeAnimation: () => void
}

interface EventActorProps extends EventActorType {
    animationUrls?: string[]
    onComplete?: () => void
    onReady?: (actorId: string) => void
    initialLightAction?: LightConfig
    initialAnimationAction?: AnimationConfig
    enableDebug?: boolean
}

/**
 * Base event actor component
 * Supports vehicles, pedestrians, and objects with various behaviors
 */
export const EventActor = forwardRef<EventActorHandle, EventActorProps>(
    (
        {
            id,
            type,
            model,
            animationUrls = [],
            initialPosition,
            initialRotation = [0, 0, 0],
            scale = [1, 1, 1],
            color,
            onComplete,
            onReady,
            initialLightAction,
            initialAnimationAction,
            enableDebug = false
        },
        ref
    ) => {
        const groupRef = useRef<THREE.Group>(null)
        const movementConfigRef = useRef<MovementConfig | null>(null)
        const currentPathIndex = useRef(0)
        const lightConfigRef = useRef<LightConfig | null>(initialLightAction || null)
        const lightBlinkTime = useRef(0)

        // Light materials refs for blinking
        // const lightMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([])
        const lightMaterialsRef = useRef<THREE.Mesh[]>([])

        // Animation controller
        const animationControllerRef = useRef<AnimationController | null>(null)

        // Loading state and model scene
        const [isLoading, setIsLoading] = useState(true)
        const modelSceneRef = useRef<THREE.Object3D | null>(null)
        const pendingAnimationRef = useRef<AnimationConfig | null>(null)
        const pendingMovementRef = useRef<MovementConfig | null>(null)

        // Debug path visualization state
        const [debugPath, setDebugPath] = useState<[number, number, number][] | null>(null)

        useEffect(() => {
            if (groupRef.current) {
                console.log(`EventActor ${id} (${type}) initialized at`, initialPosition)
            }
        }, [id, type, initialPosition])

        // Cleanup animation controller on unmount
        useEffect(() => {
            return () => {
                if (animationControllerRef.current) {
                    animationControllerRef.current.dispose()
                    animationControllerRef.current = null
                }
            }
        }, [])

        // Debug: Monitor debugPath changes
        // useEffect(() => {
        //     if (enableDebug) {
        //         console.log(`[EventActor] 🔍 debugPath changed for actor ${id}:`, debugPath ? `${debugPath.length} points` : 'null')
        //     }
        // }, [debugPath, id, enableDebug])

        // Expose imperative handle for action execution
        useImperativeHandle(ref, () => ({
            startMovement: (config: MovementConfig) => {
                // If still loading, queue the movement
                if (isLoading) {
                    console.log(`[EventActor] ⏳ Actor ${id} still loading, queuing movement`)
                    pendingMovementRef.current = config
                    return
                }

                movementConfigRef.current = config
                currentPathIndex.current = 0

                // Update debug path visualization
                if (enableDebug) {
                    // console.log(`[EventActor] 🎨 Setting debugPath for actor ${id}, path length: ${config.path.length}`, config.path)
                    setDebugPath(config.path)
                } else {
                    // console.log(`[EventActor] ⚠️ enableDebug is false for actor ${id}`)
                }

                console.log(`[EventActor] ✅ Movement started for actor ${id}`)
            },


            playAnimation: (config: AnimationConfig) => {
                // If still loading or controller not ready, queue the animation
                if (isLoading || !animationControllerRef.current) {
                    console.log(`[EventActor] ⏳ Actor ${id} not ready, queuing animation: ${config.name}`)
                    pendingAnimationRef.current = config
                    return
                }

                const loopMode = config.loop ? THREE.LoopRepeat : THREE.LoopOnce

                animationControllerRef.current.play(config.name, {
                    loop: loopMode,
                    clampWhenFinished: !config.loop
                })

                console.log(`Actor ${id} playing animation: ${config.name} (loop: ${config.loop})`)
            },

            setLight: (config: LightConfig) => {
                lightConfigRef.current = config
                lightBlinkTime.current = 0
                console.log(`Actor ${id} light ${config.type}: ${config.enabled}`)

                if (!config.enabled) {
                    // Turn off all lights - restore original materials
                    if (lightMaterialsRef.current) {
                        lightMaterialsRef.current.forEach(light => {
                            const mesh = light as any
                            if (mesh.original_material) {
                                mesh.material = mesh.original_material
                            }
                        })
                    }
                }
            },

            playSound: (config: SoundConfig) => {
                // TODO: Implement sound system
                console.log(`Actor ${id} playing sound: ${config.url}`)
            },

            getPosition: () => {
                return groupRef.current?.position.clone() || new THREE.Vector3()
            },

            getRotation: () => {
                return groupRef.current?.rotation.y || 0
            },

            loadAnimations: async (urls: string[]) => {
                if (!animationControllerRef.current || !modelSceneRef.current) {
                    console.warn(`Cannot load animations for actor ${id}: Controller or scene not ready`)
                    return
                }

                console.log(`[EventActor] 📥 Loading ${urls.length} animations for actor ${id}...`)

                for (const animUrl of urls) {
                    try {
                        const animManager = AnimationManager.getInstance()
                        let animGltf = animManager.getAnimation(animUrl)

                        if (!animGltf) {
                            console.log(`[EventActor] ⚠️ Animation not in cache, loading: ${animUrl}`)
                            animGltf = await new Promise<GLTF>((resolve, reject) => {
                                getSharedLoader().load(
                                    animUrl,
                                    (result) => resolve(result),
                                    undefined,
                                    reject
                                )
                            })
                        }

                        if (!groupRef.current) return // Component unmounted

                        // Load separate animations
                        if (animGltf && modelSceneRef.current) {
                            animationControllerRef.current.loadSeparateAnimations(animGltf, modelSceneRef.current)
                            console.log(`[EventActor] ✅ Actor ${id} loaded external animation from: ${animUrl}`)
                        }
                    } catch (error) {
                        console.error(`[EventActor] ❌ Actor ${id} failed to load animation from ${animUrl}:`, error)
                    }
                }
            },

            resumeAnimation: () => {
                if (animationControllerRef.current) {
                    animationControllerRef.current.mixer.timeScale = 1
                    console.log(`[EventActor] ▶️ Actor ${id} resumed animation`)
                }
            }
        }), [id, isLoading, onComplete, enableDebug])

        // Update movement and lights
        useFrame((state, delta) => {
            if (!groupRef.current) return

            // Update animation mixer
            if (animationControllerRef.current) {
                animationControllerRef.current.update(delta)
            }

            // Handle movement
            if (movementConfigRef.current) {
                const config = movementConfigRef.current
                const path = config.path

                if (currentPathIndex.current < path.length) {
                    const targetPoint = new THREE.Vector3(...path[currentPathIndex.current])
                    const currentPos = groupRef.current.position.clone()
                    const direction = targetPoint.clone().sub(currentPos)

                    // Ignore Y axis for distance calculation
                    const flatDirection = new THREE.Vector3(direction.x, 0, direction.z)
                    const distance = flatDirection.length()

                    // Debug: Log movement progress (throttled by logging every 60 frames)
                    if (Math.random() < 0.016) { // ~1 fps logging
                        console.log(`[EventActor] 🚶 Actor ${id} moving: waypoint ${currentPathIndex.current}/${path.length}, distance: ${distance.toFixed(2)}`)
                    }

                    if (distance < 0.3) {
                        // Reached waypoint
                        currentPathIndex.current++

                        if (currentPathIndex.current >= path.length) {
                            if (config.loop) {
                                currentPathIndex.current = 0
                            } else {
                                // Movement complete
                                movementConfigRef.current = null
                                if (onComplete) {
                                    onComplete()
                                }
                            }
                        }
                    } else {
                        // Move towards waypoint
                        const moveSpeed = config.speed * delta

                        if (flatDirection.lengthSq() > 0.0001) {
                            flatDirection.normalize()

                            // Update rotation to face movement direction
                            const targetRotation = Math.atan2(flatDirection.x, flatDirection.z)
                            groupRef.current.rotation.y = targetRotation

                            // Move
                            groupRef.current.position.x += flatDirection.x * moveSpeed
                            groupRef.current.position.z += flatDirection.z * moveSpeed
                        }
                    }
                }
            }

            // Handle light blinking and material updates
            if (lightConfigRef.current && lightConfigRef.current.enabled) {
                const config = lightConfigRef.current
                lightBlinkTime.current += delta

                const blinkInterval = 1 / (config.blinkRate || 2) // default 2Hz
                const isOn = Math.floor(lightBlinkTime.current / blinkInterval) % 2 === 0

                // Brake lights don't blink
                const isBrakeActive = config.type === 'brake'
                const isActive = isBrakeActive ? true : isOn

                // Update light materials
                lightMaterialsRef.current.forEach(light => {
                    const mesh = light as any
                    if (mesh.original_material && mesh.active_material) {
                        const name = mesh.name.toLowerCase()
                        let isMatched = false
                        let emissiveColor = 0xff8800 // Default orange/amber for signals

                        switch (config.type) {
                            case 'hazard':
                                // All indicator/turn signal lights
                                if (name.includes('left') || name.includes('right')) {
                                    isMatched = true
                                }
                                break
                            case 'turnLeft':
                                if (name.includes('left')) {
                                    isMatched = true
                                }
                                break
                            case 'turnRight':
                                if (name.includes('right')) {
                                    isMatched = true
                                }
                                break
                            case 'brake':
                                isMatched = true
                                emissiveColor = 0xff0000 // Red for brake
                                break
                        }

                        if (isMatched && isActive) {
                            // Use the pre-cloned active material
                            const mat = mesh.active_material as THREE.MeshStandardMaterial
                            mat.emissive.set(emissiveColor)
                            mat.emissiveIntensity = 5
                            if (mesh.material !== mat) {
                                mesh.material = mat
                            }
                        } else {
                            // Restore original (off) material
                            if (mesh.material !== mesh.original_material) {
                                mesh.material = mesh.original_material
                            }
                        }
                    }
                })
            }
        })

        // Load model and animations
        useEffect(() => {
            let isMounted = true

            const loadModelAndAnimations = async () => {
                try {
                    // Load main model using shared loader
                    const gltf = await new Promise<GLTF>((resolve, reject) => {
                        getSharedLoader().load(
                            model,
                            (result) => resolve(result),
                            undefined,
                            reject
                        )
                    })

                    if (!isMounted) return

                    // Clone the scene for independent instances
                    const clonedScene = SkeletonUtils.clone(gltf.scene)
                    modelSceneRef.current = clonedScene

                    // Apply color if specified
                    if (color) {
                        clonedScene.traverse((child) => {
                            if (child instanceof THREE.Mesh && child.name === 'body') {
                                if (Array.isArray(child.material)) {
                                    child.material = child.material.map(m => m.clone())
                                    child.material.forEach(m => (m as THREE.MeshStandardMaterial).color.set(color))
                                } else {
                                    child.material = child.material.clone()
                                    if ((child.material as THREE.MeshStandardMaterial).color) {
                                        (child.material as THREE.MeshStandardMaterial).color.set(color)
                                    }
                                }
                            }
                        })
                    }

                    // Add clonedScene to the group first, so AnimationMixer can find all nodes
                    if (groupRef.current) {
                        groupRef.current.add(clonedScene)
                    }

                    // Initialize animation controller with clonedScene (not groupRef)
                    // This ensures the mixer root contains all the bones for retargeting
                    const animController = new AnimationController(clonedScene)

                    // Load animations from main model
                    animController.loadAnimationsFromGLTF(gltf)

                    // Load external animations if provided
                    if (animationUrls.length > 0) {
                        // Reuse the logic we just implemented in the imperative handle, but we can't call it directly from here easily without refactoring more.
                        // So we'll validly duplicate the logic slightly or better yet, we can't access the ref current handle easily.
                        // Let's just keep the loop here for distinct initial loading.
                        for (const animUrl of animationUrls) {
                            try {
                                const animManager = AnimationManager.getInstance()
                                let animGltf = animManager.getAnimation(animUrl)

                                if (!animGltf) {
                                    console.log(`[EventActor] ⚠️ Animation not in cache, loading: ${animUrl}`)
                                    animGltf = await new Promise<GLTF>((resolve, reject) => {
                                        getSharedLoader().load(
                                            animUrl,
                                            (result) => resolve(result),
                                            undefined,
                                            reject
                                        )
                                    })
                                }

                                if (!isMounted) return

                                // Load separate animations
                                if (animGltf) {
                                    animController.loadSeparateAnimations(animGltf, clonedScene)
                                    console.log(`Actor ${id} loaded external animation from: ${animUrl}`)
                                }
                            } catch (error) {
                                console.error(`Actor ${id} failed to load animation from ${animUrl}:`, error)
                            }
                        }
                    }

                    animationControllerRef.current = animController

                    const animationNames = animController.getAnimationNames()
                    console.log(`Actor ${id} loaded ${animationNames.length} total animations:`, animationNames)

                    // Check for pending animation
                    if (pendingAnimationRef.current) {
                        console.log(`[EventActor] ▶️ Playing queued animation for ${id}: ${pendingAnimationRef.current.name}`)
                        const config = pendingAnimationRef.current
                        const loopMode = config.loop ? THREE.LoopRepeat : THREE.LoopOnce
                        animController.play(config.name, {
                            loop: loopMode,
                            clampWhenFinished: !config.loop
                        })
                        pendingAnimationRef.current = null
                    }

                    // Handle initial animation for PEDESTRIAN (pause at initial pose)
                    if (initialAnimationAction && type === ActorType.PEDESTRIAN) {
                        const availableAnims = animController.getAnimationNames()
                        // console.log(`[EventActor] 🎭 Setting initial animation pose for ${id}: ${initialAnimationAction.name}`)
                        // console.log(`[EventActor] 📋 Available animations:`, availableAnims)

                        if (availableAnims.includes(initialAnimationAction.name)) {
                            animController.play(initialAnimationAction.name, {
                                loop: THREE.LoopRepeat,
                                clampWhenFinished: true,
                                fadeIn: 0
                            })
                            // Advance to a visible pose (0.1 seconds into animation)
                            animController.mixer.update(0.1)
                            // Then pause
                            animController.mixer.timeScale = 0
                            // console.log(`[EventActor] ✅ Initial animation pose applied for ${id}`)
                        } else {
                            // console.warn(`[EventActor] ⚠️ Animation '${initialAnimationAction.name}' not found for ${id}`)
                        }
                    }

                    // Look for light meshes
                    let activeLight = null;
                    clonedScene.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const name = child.name.toLowerCase()
                            if (name.includes('light')) {
                                activeLight = child.material.clone()
                            }
                        }
                    })
                    // console.log(activeLight);
                    clonedScene.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const name = child.name.toLowerCase()
                            if (name.includes('right') ||
                                name.includes('left')) {
                                if (child.material instanceof THREE.MeshStandardMaterial) {
                                    // Pre-clone materials to avoid per-frame allocations and shared material issues
                                    const originalMat = child.material.clone()
                                    const activeMat = child.material.clone()

                                        // Store on the mesh for easy access in useFrame
                                        ; (child as any).original_material = originalMat
                                        ; (child as any).active_material = activeLight ? activeLight : activeMat

                                    // Initialize with original (off) state
                                    child.material = originalMat

                                    lightMaterialsRef.current.push(child)
                                }
                            }
                        }
                    })

                    console.log(`Actor ${id} loaded model:`, clonedScene)
                    setIsLoading(false)

                    // Process pending movement if any
                    if (pendingMovementRef.current) {
                        console.log(`[EventActor] ▶️ Starting queued movement for ${id}`)
                        movementConfigRef.current = pendingMovementRef.current
                        currentPathIndex.current = 0

                        // Update debug path visualization
                        if (enableDebug) {
                            setDebugPath(pendingMovementRef.current.path)
                        }

                        pendingMovementRef.current = null
                    }

                    // Notify parent that this actor is ready
                    if (onReady) {
                        onReady(id)
                    }

                } catch (error) {
                    console.error(`Actor ${id} failed to load model:`, error)
                    setIsLoading(false)
                }
            }

            loadModelAndAnimations()

            return () => {
                isMounted = false
            }
        }, [id, model, color, animationUrls, onReady, initialAnimationAction, type])

        const rotationEuler: [number, number, number] = [
            initialRotation[0],
            initialRotation[1],
            initialRotation[2]
        ]

        // Always render the group so ref is available
        // Model is added to group in useEffect, not rendered here
        return (
            <>
                <group ref={groupRef} position={initialPosition} rotation={rotationEuler} scale={scale}>
                    {/* Debug visualization */}
                    {enableDebug && (
                        <>
                            {/* Actor position marker - show even during loading */}
                            <mesh position={[0, 2, 0]}>
                                <sphereGeometry args={[0.3, 16, 16]} />
                                <meshBasicMaterial
                                    color={isLoading ? 'orange' : 'red'}
                                    transparent
                                    opacity={0.5}
                                />
                            </mesh>
                        </>
                    )}
                </group>

                {/* Path visualization - rendered in world space (outside group) */}
                {enableDebug && debugPath && debugPath.map((point, idx) => (
                    <mesh key={`path-${id}-${idx}`} position={point}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshBasicMaterial color="yellow" />
                    </mesh>
                ))}
            </>
        )
    }
)

EventActor.displayName = 'EventActor'
