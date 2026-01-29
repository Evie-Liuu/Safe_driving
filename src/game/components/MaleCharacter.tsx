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
    const gltf = useGLTF('/src/assets/models/Car_Main_Rigged.glb')
    const { animations } = useGLTF('/src/assets/animations/car/Car_Main_LeftDoor_Opening_Animation.glb')
    // const gltf = useGLTF('/src/assets/models/Scooter1_Rigged.glb')
    // const { animations } = useGLTF('/src/assets/animations/car/Scooter_Moving_Animation.glb')
    // const gltf = useGLTF('/src/assets/models/Male1_Rigged.glb')
    // const { animations } = useGLTF('/src/assets/animations/character/Male_OpenCarRightDoor_Inside_Animation.glb')

    // Bind animations to the group
    const { actions } = useAnimations(animations, group)

    useEffect(() => {
        console.log('Available actions:', actions);
        console.log('Available animations:', animations);

        if (actions) {
            const actionName = 'Car_Main_LeftDoor_Opening_Animation';
            // const actionName = 'Take 001.009';
            const action = actions[actionName];

            if (action) {
                // setTimeout(() => {
                //     action.reset().fadeIn(0.5).play();
                //     action.setLoop(THREE.LoopRepeat, Infinity);
                // }, 1000)
            } else {
                console.warn(`Animation "${actionName}" not found in`, Object.keys(actions));
                // Fallback to first animation if specific one is missing
                if (animations.length > 0) {
                    const firstAction = actions[animations[0].name];
                    firstAction?.reset().fadeIn(0.5).play();
                    firstAction?.setLoop(THREE.LoopRepeat, Infinity);
                }
            }
        }

        return () => {
            actions && Object.values(actions).forEach(action => action?.fadeOut(0.5))
        }
    }, [actions, animations])

    return (
        <group ref={group} position={position} rotation={rotation} scale={scale} dispose={null}>
            <primitive object={gltf.scene} />
        </group>
    )
}

// useGLTF.preload('/src/assets/models/Male1_Rigged.glb')
// useGLTF.preload('/src/assets/animations/character/Male_OpenCarRightDoor_Inside_Animation.glb')

// useGLTF.preload('/src/assets/models/Scooter1_Rigged.glb')
// useGLTF.preload('/src/assets/animations/car/Scooter_Moving_Animation.glb')

useGLTF.preload('/src/assets/models/Car_Main_Rigged.glb')
useGLTF.preload('/src/assets/animations/car/Car_Main_LeftDoor_Opening_Animation.glb')
