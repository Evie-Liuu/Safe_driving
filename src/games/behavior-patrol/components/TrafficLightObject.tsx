import { useRef, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Group, Object3D } from 'three';
import { TrafficLight, TrafficLightState } from '../types';

interface TrafficLightObjectProps {
  trafficLight: TrafficLight;
  currentTime: number;              // 當前遊戲時間
  manualState?: TrafficLightState;  // 手動控制狀態（開發者工具）
  onStateChange?: (state: TrafficLightState) => void;
}

export function TrafficLightObject({
  trafficLight,
  currentTime,
  manualState,
  onStateChange
}: TrafficLightObjectProps) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(trafficLight.model);
  const [currentState, setCurrentState] = useState<TrafficLightState>(
    TrafficLightState.OFF
  );

  // 網格名稱配置（使用默認值或自定義）
  const meshNames = {
    red: trafficLight.meshNames?.red || 'RedLight',
    yellow: trafficLight.meshNames?.yellow || 'YellowLight',
    green: trafficLight.meshNames?.green || 'GreenLight'
  };

  // 計算當前應該顯示的燈號狀態
  useEffect(() => {
    // 如果有手動狀態，優先使用
    if (manualState) {
      setCurrentState(manualState);
      onStateChange?.(manualState);
      return;
    }

    // 否則根據時間表計算
    const { lightSchedule, loopSchedule = true } = trafficLight;

    if (lightSchedule.length === 0) {
      setCurrentState(TrafficLightState.OFF);
      return;
    }

    // 計算總時長
    let totalDuration = 0;
    lightSchedule.forEach(change => {
      totalDuration += change.duration || 0;
    });

    // 如果循環且有總時長，使用模運算
    const effectiveTime = loopSchedule && totalDuration > 0
      ? currentTime % totalDuration
      : currentTime;

    // 找到當前時間對應的燈號
    let newState = lightSchedule[0].state;

    for (const change of lightSchedule) {
      if (effectiveTime >= change.time) {
        newState = change.state;
      } else {
        break;
      }
    }

    setCurrentState(newState);
    onStateChange?.(newState);
  }, [currentTime, manualState, trafficLight, onStateChange]);

  // 更新模型中的網格可見性
  useEffect(() => {
    if (!groupRef.current) return;

    const redMesh = groupRef.current.getObjectByName(meshNames.red);
    const yellowMesh = groupRef.current.getObjectByName(meshNames.yellow);
    const greenMesh = groupRef.current.getObjectByName(meshNames.green);

    // 設置可見性
    if (redMesh) redMesh.visible = currentState === TrafficLightState.RED;
    if (yellowMesh) yellowMesh.visible = currentState === TrafficLightState.YELLOW;
    if (greenMesh) greenMesh.visible = currentState === TrafficLightState.GREEN;

    // OFF 狀態：全部隱藏
    if (currentState === TrafficLightState.OFF) {
      if (redMesh) redMesh.visible = false;
      if (yellowMesh) yellowMesh.visible = false;
      if (greenMesh) greenMesh.visible = false;
    }
  }, [currentState, meshNames]);

  return (
    <group
      ref={groupRef}
      position={trafficLight.position}
      rotation={trafficLight.rotation}
      scale={trafficLight.scale || [1, 1, 1]}
    >
      <primitive object={scene.clone()} />
    </group>
  );
}
