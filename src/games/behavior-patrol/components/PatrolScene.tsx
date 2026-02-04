import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Environment } from '../../../game/components/Environment';
import { ClickableObject } from './ClickableObject';
import { PatrolScenario, DangerFactor } from '../types';

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
  return (
    <Canvas shadows>
      <PerspectiveCamera
        makeDefault
        position={scenario.scene.cameraPosition}
        fov={60}
      />
      <OrbitControls
        target={scenario.scene.cameraLookAt}
        enablePan={false}
        enableZoom={true}
        minDistance={15}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.2}
      />

      <Environment />

      {/* 危險因子 */}
      {scenario.dangers.map((danger) => (
        <ClickableObject
          key={danger.id}
          id={danger.id}
          model={danger.model}
          position={danger.position}
          rotation={danger.rotation}
          scale={danger.scale}
          behaviors={danger.behaviors}
          animationUrls={danger.animationUrls}
          onClick={() => onDangerClick(danger)}
          disabled={disabled}
          found={foundDangerIds.has(danger.id)}
        />
      ))}

      {/* 安全物件 */}
      {scenario.safeObjects.map((obj) => (
        <ClickableObject
          key={obj.id}
          id={obj.id}
          model={obj.model}
          position={obj.position}
          rotation={obj.rotation}
          scale={obj.scale}
          behaviors={obj.behaviors}
          animationUrls={obj.animationUrls}
          onClick={onSafeClick}
          disabled={disabled}
        />
      ))}
    </Canvas>
  );
}
