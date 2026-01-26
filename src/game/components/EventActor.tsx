import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader, SkeletonUtils, DRACOLoader } from 'three-stdlib'
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
}

interface EventActorProps extends EventActorType {
    animationUrls?: string[]
    onComplete?: () => void
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
            enableDebug = false
        },
        ref
    ) => {
        const groupRef = useRef<THREE.Group>(null)
        const movementConfigRef = useRef<MovementConfig | null>(null)
        const currentPathIndex = useRef(0)
        const lightConfigRef = useRef<LightConfig | null>(null)
        const lightBlinkTime = useRef(0)

        // Light materials refs for blinking
        const lightMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([])

        // Animation controller
        const animationControllerRef = useRef<AnimationController | null>(null)

        // Loading state and model scene
        const [isLoading, setIsLoading] = useState(true)
        const modelSceneRef = useRef<THREE.Object3D | null>(null)
        const pendingAnimationRef = useRef<AnimationConfig | null>(null)

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

        // Expose imperative handle for action execution
        useImperativeHandle(ref, () => ({
            startMovement: (config: MovementConfig) => {
                // console.log(`[EventActor] 🎯 startMovement CALLED for actor ${id}`)
                // console.log(`[EventActor] 📍 Path:`, config.path)
                // console.log(`[EventActor] ⚡ Speed: ${config.speed}, Loop: ${config.loop}`)

                movementConfigRef.current = config
                currentPathIndex.current = 0

                // console.log(`[EventActor] ✅ Movement config set for actor ${id}`)
                // console.log(`[EventActor] 📌 Current position:`, groupRef.current?.position.toArray())
            },


            playAnimation: (config: AnimationConfig) => {
                if (!animationControllerRef.current) {
                    // console.log(`[EventActor] ⏳ Actor ${id} animation controller not ready, queuing animation: ${config.name}`)
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
                    // Turn off all lights
                    if (lightMaterialsRef.current) {
                        lightMaterialsRef.current.forEach(mat => {
                            mat.emissive.setHex(0x000000)
                            mat.emissiveIntensity = 0
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
                                const loader = new GLTFLoader()
                                const dracoLoader = new DRACOLoader()
                                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
                                loader.setDRACOLoader(dracoLoader)
                                loader.load(
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
            }
        }))

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

            // Handle light blinking
            if (lightConfigRef.current && lightConfigRef.current.enabled) {
                const config = lightConfigRef.current
                lightBlinkTime.current += delta

                const blinkInterval = 1 / (config.blinkRate || 2) // default 2Hz
                const isOn = Math.floor(lightBlinkTime.current / blinkInterval) % 2 === 0

                // Update light materials
                lightMaterialsRef.current.forEach(mat => {
                    if (isOn) {
                        // Orange/amber for hazard lights
                        mat.emissive.setHex(0xff8800)
                        mat.emissiveIntensity = 2
                    } else {
                        mat.emissive.setHex(0x000000)
                        mat.emissiveIntensity = 0
                    }
                })
            }
        })

        // Load model and animations
        useEffect(() => {
            let isMounted = true

            const loadModelAndAnimations = async () => {
                try {
                    // Load main model
                    const gltf = await new Promise<GLTF>((resolve, reject) => {
                        const loader = new GLTFLoader()
                        const dracoLoader = new DRACOLoader()
                        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
                        loader.setDRACOLoader(dracoLoader)
                        loader.load(
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

                    // Initialize animation controller
                    if (groupRef.current) {
                        const animController = new AnimationController(groupRef.current)

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
                                            const loader = new GLTFLoader()
                                            const dracoLoader = new DRACOLoader()
                                            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
                                            loader.setDRACOLoader(dracoLoader)
                                            loader.load(
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
                    }

                    // Look for light meshes

                    clonedScene.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            if (child.name.toLowerCase().includes('light') ||
                                child.name.toLowerCase().includes('lamp')) {
                                if (child.material instanceof THREE.MeshStandardMaterial) {
                                    lightMaterialsRef.current.push(child.material)
                                }
                            }
                        }
                    })

                    console.log(`Actor ${id} loaded model:`, clonedScene)
                    setIsLoading(false)

                } catch (error) {
                    console.error(`Actor ${id} failed to load model:`, error)
                    setIsLoading(false)
                }
            }

            loadModelAndAnimations()

            return () => {
                isMounted = false
            }
        }, [id, model, color])

        const rotationEuler: [number, number, number] = [
            initialRotation[0],
            initialRotation[1],
            initialRotation[2]
        ]

        // Don't render anything while loading
        if (isLoading || !modelSceneRef.current) {
            return null
        }

        return (
            <group ref={groupRef} position={initialPosition} rotation={rotationEuler} scale={scale}>
                <primitive object={modelSceneRef.current} />

                {/* Debug visualization */}
                {enableDebug && (
                    <>
                        {/* Actor position marker */}
                        <mesh position={[0, 2, 0]}>
                            <sphereGeometry args={[0.3, 16, 16]} />
                            <meshBasicMaterial color="red" transparent opacity={0.5} />
                        </mesh>

                        {/* Path visualization */}
                        {movementConfigRef.current && movementConfigRef.current.path.map((point, idx) => (
                            <mesh key={idx} position={point}>
                                <sphereGeometry args={[0.2, 8, 8]} />
                                <meshBasicMaterial color="yellow" />
                            </mesh>
                        ))}
                    </>
                )}
            </group>
        )
    }
)

EventActor.displayName = 'EventActor'
