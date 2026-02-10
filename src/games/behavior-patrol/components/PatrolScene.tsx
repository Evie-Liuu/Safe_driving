import { useState, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three'
import { Environment } from '@/game/components/Environment';
import { PatrolScenario, DangerFactor } from '@/games/behavior-patrol/types';
import { DangerGroup } from './DangerGroup';
import { SafeObjectGroup } from './SafeObjectGroup';

interface PatrolSceneProps {
  scenario: PatrolScenario;
  foundDangerIds: Set<string>;
  disabled: boolean;
  onDangerClick: (danger: DangerFactor) => void;
  onSafeClick: () => void;
}

export function PatrolScene({
  scenario,
  foundDangerIds,
  disabled,
  onDangerClick,
  onSafeClick,
}: PatrolSceneProps) {
  const [clickPoints, setClickPoints] = useState<THREE.Vector3[]>([])
  const [currentClick, setCurrentClick] = useState<THREE.Vector3 | null>(null)

  return (
    <>
      <Canvas shadows>
        <PerspectiveCamera
          makeDefault
          position={scenario.scene.cameraPosition}
          fov={60}
        />
        <OrbitControls
          target={scenario.scene.cameraLookAt}
          // enablePan={false}
          // enableZoom={true}
          minDistance={15}
          // maxDistance={100}
          maxDistance={400}
          maxPolarAngle={Math.PI / 2.2}
        // mouseButtons={{
        //   LEFT: THREE.MOUSE.PAN,
        //   MIDDLE: THREE.MOUSE.DOLLY,
        //   RIGHT: THREE.MOUSE.ROTATE
        // }}
        />

        <Environment />

        {/* 危險因子 */}
        {scenario.dangers.map((danger) => (
          <DangerGroup
            key={danger.id}
            danger={danger}
            onClick={() => onDangerClick(danger)}
            disabled={disabled || foundDangerIds.has(danger.id)}
            enableDebug={true}
          />
        ))}

        {/* 安全物件 */}
        {scenario.safeObjects.map((obj) => (
          <SafeObjectGroup
            key={obj.id}
            safeObject={obj}
            onClick={onSafeClick}
            disabled={disabled}
            enableDebug={true}
          />
        ))}

        {/* 點擊處理器 */}
        <ClickHandler
          onClick={(point) => {
            setCurrentClick(point)
            setClickPoints(prev => [...prev, point])
          }}
        />

        {/* 點可視化 */}
        <PointVisualization currentClick={currentClick} clickPoints={clickPoints} />
      </Canvas>

      <div className='absolute bottom-0 left-0 z-[100] text-white bg-black bg-opacity-50 p-2'>
        <p>當前點擊: X: {currentClick?.x.toFixed(2)}, Y: {currentClick?.y.toFixed(2)}, Z: {currentClick?.z.toFixed(2)}</p>
      </div>
    </>
  );
}

/**
 * 點擊處理器
 */
function ClickHandler({ onClick }: { onClick: (point: THREE.Vector3) => void }) {
  const { camera, gl, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  const handleClick = useCallback((event: MouseEvent) => {
    event.preventDefault() // 阻止右鍵菜單

    const canvas = gl.domElement
    const rect = canvas.getBoundingClientRect()

    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.current.setFromCamera(mouse.current, camera)

    // 創建一個地面平面來檢測點擊
    // const planeGeometry = new THREE.PlaneGeometry(1000, 1000)
    // const planeMaterial = new THREE.MeshBasicMaterial({ visible: false })
    // const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    // plane.rotation.x = -Math.PI / 2 // 水平放置
    // scene.add(plane)
    const target = scene.getObjectByName('Base')

    if (!target) return

    const intersects = raycaster.current.intersectObject(target)

    if (intersects.length > 0) {
      const point = intersects[0].point
      onClick(point)
    }

    // scene.remove(plane)
  }, [camera, gl, scene, onClick])

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('contextmenu', handleClick)
    return () => canvas.removeEventListener('contextmenu', handleClick)
  }, [gl, handleClick])

  return null
}

/**
 * 點可視化
 */
function PointVisualization({
  currentClick,
  clickPoints,
  cruisePoints
}: {
  currentClick: THREE.Vector3 | null
  clickPoints: THREE.Vector3[]
  cruisePoints?: [number, number, number][]
}) {
  return (
    <group>
      {/* 當前點擊點 - 紅色 */}
      {currentClick && (
        <mesh position={[currentClick.x, currentClick.y, currentClick.z]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      {/* 歷史點擊點 - 黃色 */}
      {clickPoints.map((point, index) => (
        <mesh key={`click - ${index} `} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="yellow" />
        </mesh>
      ))}

      {/* 巡航點 - 藍色 */}
      {/* {cruisePoints.map((point, index) => (
        <mesh key={`cruise - ${index} `} position={[point[0], point[1], point[2]]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="blue" />
        </mesh>
      ))} */}
    </group>
  )
}

