# Dynamic Hitbox Design for DangerActorObject

**Date:** 2026-02-15
**Component:** `src/games/behavior-patrol/components/DangerActorObject.tsx`

## Problem Statement

The current invisible hitbox implementation has two main issues:
1. Fixed size `[2, 2, 2]` doesn't match the visual models of different actor types
2. All actor types (pedestrians, vehicles, scooters, bicycles) are difficult to click accurately

Current implementation (L677-681):
```tsx
{/* Invisible hitbox for better clicking */}
<mesh position={[0, 1, 0]}>
  <boxGeometry args={[2, 2, 2]} />
  <meshBasicMaterial transparent opacity={100} depthWrite={false} />
</mesh>
```

Additional bug: `opacity={100}` should be `opacity={0}` for truly invisible hitbox.

## Solution Overview

Replace the fixed-size hitbox with a dynamic bounding-box-based hitbox that:
- Automatically calculates size based on each actor model's actual dimensions
- Applies configurable padding (1.3x multiplier) for easier clicking
- Adapts to all actor types without manual configuration

## Implementation Approach

### Approach Selected: Padded Bounding Box

Calculate the model's bounding box and apply a padding multiplier to create a larger clickable area while maintaining reasonable accuracy.

**Trade-offs:**
- ✅ Easier to click - larger target area
- ✅ Still reasonably accurate to visual model
- ✅ Can adjust padding per actor type if needed
- ⚠️ May cause overlap for very closely positioned objects
- ⚠️ Less visually accurate than exact bounding box

### Technical Design

**1. Bounding Box Calculation**
- Use `THREE.Box3().setFromObject(modelScene)` when model loads
- Calculate dimensions: `size = boundingBox.getSize(new THREE.Vector3())`
- Calculate center offset: `center = boundingBox.getCenter(new THREE.Vector3())`
- Apply padding: `paddedSize = size.multiplyScalar(PADDING_MULTIPLIER)`

**2. State Management**
Add new state variables:
```tsx
const [hitboxSize, setHitboxSize] = useState<[number, number, number]>([2, 2, 2]);
const [hitboxCenter, setHitboxCenter] = useState<[number, number, number]>([0, 1, 0]);
```

Update in model load `useEffect` after model is ready.

**3. Constants**
```tsx
const PADDING_MULTIPLIER = 1.3; // Configurable, can be adjusted later
const DEBUG_HITBOX = false;     // Optional development visualization
```

**4. Updated Hitbox Mesh**
```tsx
<mesh position={hitboxCenter}>
  <boxGeometry args={hitboxSize} />
  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
</mesh>
```

## Changes Summary

**File:** `DangerActorObject.tsx`

1. Add state for dynamic hitbox sizing
2. Calculate bounding box in model load useEffect
3. Update hitbox mesh to use dynamic size and position
4. Fix opacity bug (100 → 0)
5. Add configurable padding multiplier constant

## Benefits

- **Automatic adaptation:** Works for all actor types without manual configuration
- **Better UX:** Easier clicking with padded hitbox
- **Maintainable:** Single implementation for all models
- **Debuggable:** Can add visual debug mode if needed
- **Flexible:** Padding multiplier can be tuned per actor type if needed

## Future Enhancements

- Per-actor-type padding multipliers (e.g., smaller padding for vehicles, larger for pedestrians)
- Debug visualization mode to see hitboxes during development
- Optional minimum hitbox size guarantee for very small objects
