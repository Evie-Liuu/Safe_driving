import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface MaleCharacterProps {
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
}

export function MaleCharacter({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1]
}: MaleCharacterProps) {
    const group = useRef<THREE.Group>(null)

    // Load model and animation
    const gltf = useGLTF('/src/assets/models/Male1_Rigged.glb')
    // const { animations } = useGLTF('/src/assets/models/Male_Walking_Animation.glb')

    // Bind animations to the group
    // const { actions } = useAnimations(animations, group)

    // useEffect(() => {
    //     // There should be only one animation in the file usually, or we can look for "Walk"
    //     // Since the file is named Male_Walking_Animation, we try to play the first one.
    //     if (actions && animations.length > 0) {
    //         const action = actions[animations[0].name]
    //         // action?.reset().fadeIn(0.5).play()
    //     }

    //     return () => {
    //         actions && Object.values(actions).forEach(action => action?.fadeOut(0.5))
    //     }
    // }, [actions, animations])

    return (
        <group ref={group} position={position} rotation={rotation} scale={scale} dispose={null}>
            <primitive object={gltf.scene} />
        </group>
    )
}

useGLTF.preload('/src/assets/models/Male1_Rigged.glb')
// useGLTF.preload('/src/assets/models/Male_Walking_Animation.glb')
