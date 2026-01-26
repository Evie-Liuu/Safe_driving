import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ModelLoader } from '../models/ModelLoader'
import { EventActor as EventActorType, ActorType } from '../events/EventTypes'
import { AnimationController } from '../animations/AnimationController'

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
}

interface EventActorProps extends EventActorType {
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
                    console.warn(`Actor ${id} has no animation controller initialized`)
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
                    lightMaterialsRef.current.forEach(mat => {
                        mat.emissive.setHex(0x000000)
                        mat.emissiveIntensity = 0
                    })
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

        // Helper to initialize model after loading
        const onModelLoaded = (gltf: any) => {
            const scene = gltf.scene
            console.log(`Actor ${id} loaded model:`, scene)

            // Initialize animation controller if animations exist
            if (gltf.animations && gltf.animations.length > 0 && groupRef.current) {
                animationControllerRef.current = new AnimationController(groupRef.current)
                animationControllerRef.current.loadAnimationsFromGLTF(gltf)

                const animationNames = animationControllerRef.current.getAnimationNames()
                console.log(`Actor ${id} loaded ${animationNames.length} animations:`, animationNames)
            }

            // Look for meshes with names containing "light" or "lamp"
            scene.traverse((child: any) => {
                if (child instanceof THREE.Mesh) {
                    if (child.name.toLowerCase().includes('light') ||
                        child.name.toLowerCase().includes('lamp')) {
                        if (child.material instanceof THREE.MeshStandardMaterial) {
                            lightMaterialsRef.current.push(child.material)
                        }
                    }
                }
            })
        }

        const rotationEuler: [number, number, number] = [
            initialRotation[0],
            initialRotation[1],
            initialRotation[2]
        ]

        return (
            <group ref={groupRef} position={initialPosition} rotation={rotationEuler} scale={scale}>
                {/* TODO */}
                <ModelLoader
                    url={model}
                    color={color}
                    onLoad={onModelLoaded}
                />

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
