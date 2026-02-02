import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneObjectRegistry, TrafficLightHandle, TrafficLightState } from '../registry/SceneObjectRegistry'

interface TrafficLightProps {
    id: string
    position: [number, number, number]
    rotation?: [number, number, number]
    initialState?: TrafficLightState
}

/**
 * Traffic Light Component
 * Registers itself to SceneObjectRegistry and can be controlled by events
 */
export function TrafficLight({
    id,
    position,
    rotation = [0, 0, 0],
    initialState = 'off'
}: TrafficLightProps) {
    const groupRef = useRef<THREE.Group>(null)
    const [currentState, setCurrentState] = useState<TrafficLightState>(initialState)
    const blinkTimeRef = useRef(0)
    const [isBlinkOn, setIsBlinkOn] = useState(true)

    // Light material refs
    const redLightRef = useRef<THREE.Mesh>(null)
    const yellowLightRef = useRef<THREE.Mesh>(null)
    const greenLightRef = useRef<THREE.Mesh>(null)

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

    // Determine light colors based on state
    const getLightColors = () => {
        const offColor = '#333333'
        const redOn = '#ff0000'
        const yellowOn = '#ffcc00'
        const greenOn = '#00ff00'

        switch (currentState) {
            case 'red':
                return { red: redOn, yellow: offColor, green: offColor }
            case 'yellow':
                return { red: offColor, yellow: yellowOn, green: offColor }
            case 'green':
                return { red: offColor, yellow: offColor, green: greenOn }
            case 'flashing_yellow':
                return {
                    red: offColor,
                    yellow: isBlinkOn ? yellowOn : offColor,
                    green: offColor
                }
            case 'off':
            default:
                return { red: offColor, yellow: offColor, green: offColor }
        }
    }

    const colors = getLightColors()

    // Emissive intensity for lit lights
    const getEmissive = (isOn: boolean) => isOn ? 2 : 0

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Traffic light housing */}
            <mesh position={[0, 2, 0]}>
                <boxGeometry args={[0.4, 1.2, 0.3]} />
                <meshStandardMaterial color="#222222" />
            </mesh>

            {/* Pole */}
            <mesh position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
                <meshStandardMaterial color="#444444" />
            </mesh>

            {/* Red light (top) */}
            <mesh ref={redLightRef} position={[0, 2.35, 0.16]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                    color={colors.red}
                    emissive={colors.red}
                    emissiveIntensity={getEmissive(colors.red !== '#333333')}
                />
            </mesh>

            {/* Yellow light (middle) */}
            <mesh ref={yellowLightRef} position={[0, 2, 0.16]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                    color={colors.yellow}
                    emissive={colors.yellow}
                    emissiveIntensity={getEmissive(colors.yellow !== '#333333')}
                />
            </mesh>

            {/* Green light (bottom) */}
            <mesh ref={greenLightRef} position={[0, 1.65, 0.16]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                    color={colors.green}
                    emissive={colors.green}
                    emissiveIntensity={getEmissive(colors.green !== '#333333')}
                />
            </mesh>
        </group>
    )
}
