import { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SafeObject } from '../types';
import { DangerActorObject } from './DangerActorObject';

interface SafeObjectGroupProps {
  safeObject: SafeObject;
  onClick: () => void;
  disabled?: boolean;
  enableDebug?: boolean;
}

/**
 * SafeObjectGroup - 渲染安全物件的所有角色
 * 與 DangerGroup 類似，但用於 SafeObject
 */
export function SafeObjectGroup({
  safeObject,
  onClick,
  disabled = false,
  enableDebug = false,
}: SafeObjectGroupProps) {
  const [misclickPoints, setMisclickPoints] = useState<{ id: number; position: THREE.Vector3 }[]>([]);
  const nextId = useRef(0);

  const handleSafeClick = (point?: THREE.Vector3) => {
    if (point && !disabled) {
      const id = nextId.current++;
      setMisclickPoints((prev) => [...prev, { id, position: point.clone() }]);

      // Remove after 1 second
      setTimeout(() => {
        setMisclickPoints((prev) => prev.filter((p) => p.id !== id));
      }, 1500);
    }

    if (onClick) {
      onClick();
    }
  };

  return (
    <>
      {safeObject.actors.map((actor) => {
        // 獲取該角色的所有 actions
        const actorActions = safeObject.actions.filter(action => action.actorId === actor.id);

        return (
          <DangerActorObject
            key={actor.id}
            actor={actor}
            actions={actorActions}
            onClick={handleSafeClick}
            disabled={disabled}
            found={false}
            enableDebug={enableDebug}
          />
        );
      })}

      {misclickPoints.map((p) => (
        <Html key={p.id} position={p.position} center style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            color: '#ff4d4f',
            fontSize: '28px',
            fontWeight: '900',
            whiteSpace: 'nowrap',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 16px',
            borderRadius: '50px',
            border: '3px solid #ff4d4f',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'floatUp 1.5s ease-out forwards',
            boxShadow: '0 4px 15px rgba(255, 77, 79, 0.3)',
            transform: 'scale(1)',
          }}>
            <span style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }}>♥️</span>
            <span style={{ fontFamily: 'Arial, sans-serif' }}>-1</span>
          </div>
          <style>{`
            @keyframes floatUp {
              0% { transform: translateY(0) scale(0.8); opacity: 0; }
              15% { transform: translateY(-10px) scale(1.1); opacity: 1; }
              30% { transform: translateY(-15px) scale(1); opacity: 1; }
              100% { transform: translateY(-60px) scale(1); opacity: 0; }
            }
          `}</style>
        </Html>
      ))}
    </>
  );
}
