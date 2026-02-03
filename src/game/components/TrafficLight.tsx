import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SceneObjectRegistry, TrafficLightHandle, TrafficLightState } from '../registry/SceneObjectRegistry'

interface TrafficLightProps {
    id: string
    url?: string
    position: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
    initialState?: TrafficLightState
    nodeNames?: {
        red: string
        yellow: string
        green: string
    }
}

/**
 * Traffic Light Component
 * Registers itself to SceneObjectRegistry and can be controlled by events
 * Uses GLB model from /src/assets/models/TrafficLight.glb
 */
export function TrafficLight({
    id,
    url = '/src/assets/models/TrafficLight.glb',
    position,
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    initialState = 'off',
    nodeNames = {
        red: 'Red',
        yellow: 'Yellow',
        green: 'Green'
    }
}: TrafficLightProps) {
    const { scene } = useGLTF(url)
    const [currentState, setCurrentState] = useState<TrafficLightState>(initialState)
    const blinkTimeRef = useRef(0)
    const [isBlinkOn, setIsBlinkOn] = useState(true)

    // Refs for light materials
    const redMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
    const yellowMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
    const greenMatRef = useRef<THREE.MeshStandardMaterial | null>(null)

    // Clone scene for each instance and setup materials
    const clone = useMemo(() => {
        const clonedScene = scene.clone()

        // Find lights and setup materials
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh
                // Clone material to ensure independent control per instance
                const material = (mesh.material as THREE.Material).clone() as THREE.MeshStandardMaterial
                mesh.material = material

                // Identify lights by name (case-insensitive check)
                const name = child.name.toLowerCase()

                // Debug log to help identify node names if needed
                // console.log(`[TrafficLight] Node found: ${child.name}`)

                if (name.includes(nodeNames.red.toLowerCase())) {
                    redMatRef.current = material
                    // console.log(`[TrafficLight] Linked Red light to ${child.name}`)
                } else if (name.includes(nodeNames.yellow.toLowerCase())) {
                    yellowMatRef.current = material
                    // console.log(`[TrafficLight] Linked Yellow light to ${child.name}`)
                } else if (name.includes(nodeNames.green.toLowerCase())) {
                    greenMatRef.current = material
                    // console.log(`[TrafficLight] Linked Green light to ${child.name}`)
                }
            }
        })

        return clonedScene
    }, [scene, nodeNames])

    // Register to SceneObjectRegistry
    useEffect(() => {
        const handle: TrafficLightHandle = {
            id,
            type: 'traffic_light',
            setState: (state: TrafficLightState) => {
                setCurrentState(state)
                console.log(`[TrafficLight] ${id} state changed to: ${state}`)
            },
            getState: () => currentState,
            executeCommand: (command: string, params?: Record<string, any>) => {
                if (command === 'setState' && params?.state) {
                    setCurrentState(params.state as TrafficLightState)
                }
            }
        }

        SceneObjectRegistry.register(handle)

        return () => {
            SceneObjectRegistry.unregister(id)
        }
    }, [id])

    // Update registry when state changes
    useEffect(() => {
        const existingHandle = SceneObjectRegistry.getObject<TrafficLightHandle>(id)
        if (existingHandle) {
            existingHandle.getState = () => currentState
        }
    }, [currentState, id])

    // Handle blinking animation
    useFrame((_, delta) => {
        if (currentState === 'flashing_yellow') {
            blinkTimeRef.current += delta
            const blinkInterval = 0.5 // 0.5 second interval (1Hz)
            const shouldBeOn = Math.floor(blinkTimeRef.current / blinkInterval) % 2 === 0
            if (shouldBeOn !== isBlinkOn) {
                setIsBlinkOn(shouldBeOn)
            }
        } else {
            blinkTimeRef.current = 0
            if (!isBlinkOn) setIsBlinkOn(true)
        }
    })

    // Update material properties based on state
    useEffect(() => {
        const offColor = new THREE.Color('#333333')
        const redOn = new THREE.Color('#ff0000')
        const yellowOn = new THREE.Color('#ffcc00')
        const greenOn = new THREE.Color('#00ff00')

        const updateMaterial = (mat: THREE.MeshStandardMaterial | null, color: THREE.Color, isOn: boolean) => {
            if (mat) {
                mat.color = color
                mat.emissive = color
                mat.emissiveIntensity = isOn ? 3 : 0
            }
        }

        switch (currentState) {
            case 'red':
                updateMaterial(redMatRef.current, redOn, true)
                updateMaterial(yellowMatRef.current, offColor, false)
                updateMaterial(greenMatRef.current, offColor, false)
                break
            case 'yellow':
                updateMaterial(redMatRef.current, offColor, false)
                updateMaterial(yellowMatRef.current, yellowOn, true)
                updateMaterial(greenMatRef.current, offColor, false)
                break
            case 'green':
                updateMaterial(redMatRef.current, offColor, false)
                updateMaterial(yellowMatRef.current, offColor, false)
                updateMaterial(greenMatRef.current, greenOn, true)
                break
            case 'flashing_yellow':
                updateMaterial(redMatRef.current, offColor, false)
                updateMaterial(yellowMatRef.current, isBlinkOn ? yellowOn : offColor, isBlinkOn)
                updateMaterial(greenMatRef.current, offColor, false)
                break
            case 'off':
            default:
                updateMaterial(redMatRef.current, offColor, false)
                updateMaterial(yellowMatRef.current, offColor, false)
                updateMaterial(greenMatRef.current, offColor, false)
                break
        }
    }, [currentState, isBlinkOn])

    return (
        <primitive
            object={clone}
            position={position}
            rotation={rotation}
            scale={scale}
        />
    )
}
