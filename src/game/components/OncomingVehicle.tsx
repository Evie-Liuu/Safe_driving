import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ModelLoader } from '../models/ModelLoader'

interface OncomingVehicleProps {
    startPosition: [number, number, number]
    endPosition: [number, number, number]
    speed?: number
    modelUrl?: string
    color?: string | THREE.Color
    onComplete?: () => void
}

/**
 * 對向車輛組件
 * 從起點移動到終點，到達後觸發完成回調
 */
export function OncomingVehicle({
    startPosition,
    endPosition,
    speed = 20,
    modelUrl = '/src/assets/models/ferrari.glb',
    color,
    onComplete
}: OncomingVehicleProps) {
    const groupRef = useRef<THREE.Group>(null)
    const hasCompleted = useRef(false)

    // 初始化位置和朝向
    useEffect(() => {
        if (!groupRef.current) return

        // 設置初始位置
        groupRef.current.position.set(...startPosition)

        // 計算朝向（面向終點）
        const start = new THREE.Vector3(...startPosition)
        const end = new THREE.Vector3(...endPosition)
        const direction = end.clone().sub(start)

        // 只在XZ平面上計算旋轉（忽略Y軸高度差異）
        const flatDirection = new THREE.Vector3(direction.x, 0, direction.z)
        if (flatDirection.lengthSq() > 0.0001) {
            const targetRotation = Math.atan2(flatDirection.x, flatDirection.z)
            groupRef.current.rotation.y = targetRotation
        }
    }, [startPosition, endPosition])

    // 更新位置
    useFrame((state, delta) => {
        if (!groupRef.current || hasCompleted.current) return

        const currentPos = groupRef.current.position.clone()
        const targetPos = new THREE.Vector3(...endPosition)
        const direction = targetPos.clone().sub(currentPos)

        // 忽略Y軸，只在XZ平面移動
        const flatDirection = new THREE.Vector3(direction.x, 0, direction.z)
        const distance = flatDirection.length()

        if (distance < 0.5) {
            // 到達終點
            hasCompleted.current = true
            if (onComplete) {
                onComplete()
            }
        } else {
            // 繼續移動
            const moveSpeed = speed * delta
            if (flatDirection.lengthSq() > 0.0001) {
                flatDirection.normalize()
                groupRef.current.position.x += flatDirection.x * moveSpeed
                groupRef.current.position.z += flatDirection.z * moveSpeed
            }
        }
    })

    return (
        <group ref={groupRef}>
            <ModelLoader url={modelUrl} rotation={[0, Math.PI, 0]} color={color} />
        </group>
    )
}
