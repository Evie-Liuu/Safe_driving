import { useRef } from 'react'
import * as THREE from 'three'
import { ModelLoader } from '../models/ModelLoader'
import { AnimatedModel } from '../animations/AnimatedModel'

interface EnvironmentProps {
  skyColor?: string
  groundColor?: string
  fogColor?: string
  fogNear?: number
  fogFar?: number
}

/**
 * 環境組件
 * 包含天空、地面、霧效果等
 */
export function Environment({
  skyColor = '#87CEEB',
  groundColor = '#228B22',
  fogColor = '#ffffff',
  fogNear = 10,
  fogFar = 100
}: EnvironmentProps) {
  return (
    <>
      {/* 天空顏色 */}
      <color attach="background" args={[skyColor]} />

      {/* 霧效果 */}
      {/* <fog attach="fog" args={[fogColor, fogNear, fogFar]} /> */}

      {/* 環境光 */}
      <ambientLight intensity={0.5} />

      {/* 主光源（太陽光） */}
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* 地面 */}
      {/* <mesh name='ground' rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color={groundColor} />
      </mesh> */}
      {/* <ModelLoader url="/src/assets/models/Floor.glb" position={[0, -1.55, 0]} /> */}
      <ModelLoader url="/src/assets/models/Map_city.glb" position={[0, -1.55, 0]} onLoad={(gltf) => {
        console.log(gltf)
      }} />

      {/* <ModelLoader url="/src/assets/models/TrafficLight.glb" position={[0, 0, 0]} onLoad={(gltf) => {
        console.log(gltf)
      }} /> */}
      {/* <AnimatedModel modelUrl="/src/assets/models/Male1_Rigged.glb"
        animationUrls={[
          "/src/assets/models/animations/Male_Walking_Animation.glb",
        ]}
        position={[0, 0, 0]}
        autoPlay="idle"
        onLoad={(controller) => {
          // 獲取所有可用動畫
          const animations = controller.getAnimationNames()
          console.log('可用動畫:', animations)
        }} /> */}

      {/* 網格輔助線（開發用） */}
      <gridHelper args={[500, 50, '#444444', '#888888']} />
    </>
  )
}

/**
 * 簡單的天空盒
 */
export function SkyBox({ color = '#87CEEB' }: { color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial color={color} side={THREE.BackSide} />
    </mesh>
  )
}

/**
 * 基礎光照設置
 */
export function BasicLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <hemisphereLight
        color="#ffffff"
        groundColor="#444444"
        intensity={0.5}
      />
    </>
  )
}
