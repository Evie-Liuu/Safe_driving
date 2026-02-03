import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface MaleCharacterProps {
    position?: [number, number, number]
    rotation?: [number, number, number]
    scale?: [number, number, number]
}

const test_name = 'Car_Main_LeftDoor_Opening_Animation_N.glb'

export function MaleCharacter({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1]
}: MaleCharacterProps) {
    const group = useRef<THREE.Group>(null)

    // Load model and animation
    const gltf = useGLTF('/src/assets/models/Car_Main_Rigged.glb')
    const { animations } = useGLTF(`/src/assets/animations/car/${test_name}`)
    // const { animations } = useGLTF('/src/assets/animations/car/Car_Main_RightDoor_Opening_Anim/ation.glb')
    // const gltf = useGLTF('/src/assets/models/Scooter1_Rigged.glb')
    // const { animations } = useGLTF('/src/assets/animations/car/Scooter_Moving_Animation.glb')
    // const gltf = useGLTF('/src/assets/models/Male1_Rigged.glb')
    // const { animations } = useGLTF('/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb')

    // Bind animations to the group
    const { actions } = useAnimations(animations, group)

    useFrame(() => {
        // 遍歷場景找出所有骨骼
        gltf.scene.traverse((child) => {
            if (child.type === 'Bone' ||
                child.name.includes('Armature') ||
                child.name.includes('Root')) {
                const worldPos = new THREE.Vector3();

                child.getWorldPosition(worldPos);
                if (worldPos.y < -0.01) { // 
                    //偵測下沉
                    // console.log(`骨骼 ${child.name} 下沉至: ${worldPos.y}`);


                    // if (child.name.includes('Car_Main_1')) {
                    //     child.position.y = 0;
                    //     // child.updateWorldMatrix(true, true);
                    //     // child.updateMatrixWorld(true);
                    //     console.log(`骨骼 ${child.name} 下沉至: ${worldPos.y}`);
                    // }
                }
            }
        });
    });

    // useFrame(() => {
    //     const target =
    //         gltf.scene.getObjectByName('Car_Main_1');
    //     if (target) {
    //         target.position.y = 0; //        
    //         // 或設定你需要的高度
    //     }
    // });

    useEffect(() => {
        console.log('Available actions:', actions);
        console.log('Available animations:', animations);

        if (actions) {
            const actionName = 'Car_Main_LeftDoor_Opening_Animation_N';
            // const actionName = 'Take 001';
            const action = actions[actionName];

            if (action) {
                const clip = action.getClip();

                // 更嚴格地過濾位置和位移軌道
                // clip.tracks = clip.tracks.filter(track => {
                //     //     const name = track.name.toLowerCase();
                //     //     const shouldKeep = name.includes('door') && name.includes('quaternion');

                //     //     if (!shouldKeep) {
                //     //         console.log('移除軌道:', track.name);
                //     //     }
                //     //     return shouldKeep;
                //     // });
                //     if (track.name.includes('Car_Main_1')
                //         && (track.name.includes('position') || track.name.includes('scale') || track.name.includes('quaternion'))) {
                //         console.log('移除:', track.name);
                //         return false;
                //     }
                //     return true;
                // });

                action.reset().fadeIn(0.5).play();
                action.setLoop(THREE.LoopRepeat, Infinity);

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

    useEffect(() => {
        if (animations && animations.length > 0) {
            animations.forEach(clip => {
                console.log(`動畫名稱: ${clip.name}`);
                clip.tracks.forEach(track => {
                    // 如果看到類似 "Armature.position" 或 "RootNode.position" 且包含 Y 軸變化，就是下沉來源
                    // if (track.name.includes('position')) {
                    //     console.log(`發現位移軌道: ${track.name}`, track.values);
                    // }
                    // // 檢查 scale
                    // if (track.name.includes('scale')) {
                    //     console.log('縮放軌道值: ', track.values);
                    // }
                    // // 檢查 quaternion       
                    // if (track.name.includes('quaternion')) {
                    //     console.log('旋轉軌道', track.values);
                    // }
                });
            });
        }
    }, [animations]);

    return (
        <group ref={group} position={position} rotation={rotation} scale={scale} dispose={null}>
            <primitive object={gltf.scene} />
        </group>
    )
}

// useGLTF.preload('/src/assets/models/Male1_Rigged.glb')
// useGLTF.preload('/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb')

// useGLTF.preload('/src/assets/models/Scooter1_Rigged.glb')
// useGLTF.preload('/src/assets/animations/car/Scooter_Moving_Animation.glb')

useGLTF.preload('/src/assets/models/Car_Main_Rigged.glb')
useGLTF.preload(`/src/assets/animations/car/${test_name}`)
// useGLTF.preload('/src/assets/animations/car/Car_Main_RightDoor_Opening_Animation.glb')
