# Hitbox Refinement Design - Type-Based Strategy

**Date:** 2026-02-15
**Status:** Approved
**Author:** User + Claude Sonnet 4.5

## Problem Statement

The current dynamic hitbox implementation using `Box3().setFromObject()` fails for pedestrian models with skeletal animations. The bounding box only captures the base mesh geometry (feet area), resulting in hitboxes that are too short and fat, positioned only at the pedestrian's feet level. This makes pedestrians difficult to click.

**Current behavior:**
- ✅ Vehicles: Hitbox correctly matches model size
- ✅ Scooters: Hitbox correctly matches model size
- ❌ Pedestrians: Hitbox only around feet, too short and wide

**Root cause:** `Box3().setFromObject()` on rigged character models doesn't account for skeletal animation bounds.

## Solution Overview

Implement a **type-based hitbox strategy** that uses preset sizes for pedestrians while maintaining dynamic calculation for other actor types.

## Architecture

### Core Concept

```typescript
// Strategy branching in model loading
if (actor.type === ActorType.PEDESTRIAN) {
  // Strategy A: Use preset humanoid dimensions
  applyPedestrianPresetHitbox();
} else {
  // Strategy B: Dynamic calculation (existing logic)
  calculateDynamicHitbox();
}
```

### Preset Values

**Pedestrian Hitbox (with 1.3x padding included):**
- **Size:** `[1.5, 4.0, 1.5]`
  - X (width): 1.5 units - comfortable left/right margin
  - Y (height): 4.0 units - covers head to feet
  - Z (depth): 1.5 units - comfortable front/back margin

- **Center:** `[0, 2.0, 0]`
  - Y = 2.0 - half of height, centers hitbox on pedestrian

**Dynamic Calculation Maintained For:**
- `ActorType.VEHICLE` - high size variance
- `ActorType.SCOOTER` - varies by model
- `ActorType.BICYCLE` - varies by model
- Future actor types - defaults to dynamic

## Implementation Details

### File Location

**File:** `src/games/behavior-patrol/components/DangerActorObject.tsx`

**Modification Point:** Model loading `useEffect` (~line 272-295)

### Code Structure

**1. Add constants** (after line 40):

```typescript
const HITBOX_PADDING_MULTIPLIER = 1.3;
const DEBUG_HITBOX = true;

// Pedestrian preset hitbox (padding already included)
const PEDESTRIAN_HITBOX_SIZE: [number, number, number] = [1.5, 4.0, 1.5];
const PEDESTRIAN_HITBOX_CENTER: [number, number, number] = [0, 2.0, 0];
```

**2. Modify hitbox calculation** (replace lines 272-295):

```typescript
// Calculate hitbox based on actor type
if (actor.type === ActorType.PEDESTRIAN) {
  // Pedestrians: Use preset dimensions
  setHitboxSize(PEDESTRIAN_HITBOX_SIZE);
  setHitboxCenter(PEDESTRIAN_HITBOX_CENTER);

  console.log(`[DangerActorObject] Using preset hitbox for pedestrian ${actor.id}`);
} else {
  // Other types: Dynamic calculation (existing logic)
  const boundingBox = new THREE.Box3().setFromObject(clonedScene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  boundingBox.getSize(size);
  boundingBox.getCenter(center);

  const paddedSize: [number, number, number] = [
    size.x * HITBOX_PADDING_MULTIPLIER,
    size.y * HITBOX_PADDING_MULTIPLIER,
    size.z * HITBOX_PADDING_MULTIPLIER,
  ];

  const centerOffset: [number, number, number] = [
    center.x,
    center.y,
    center.z,
  ];

  setHitboxSize(paddedSize);
  setHitboxCenter(centerOffset);

  console.log(`[DangerActorObject] Dynamic hitbox for ${actor.type} ${actor.id}`);
}
```

### Unchanged Components

- Hitbox mesh rendering - already uses state
- Debug visualization - already implemented
- Other actor types - unaffected

## Testing & Validation

### Test Plan

**1. Debug Mode Verification (DEBUG_HITBOX = true)**

Visual inspection of green hitboxes:
- ✅ Pedestrian hitbox - tall narrow box from feet to above head
- ✅ Vehicle hitbox - maintains original accuracy
- ✅ Scooter hitbox - maintains original accuracy

**2. Click Testing**

- ✅ Click pedestrian head, body, feet - all trigger correctly
- ✅ Click near pedestrian - should not trigger
- ✅ Vehicle clicking - maintains accuracy
- ✅ Multiple nearby pedestrians - no mis-clicks

**3. Console Log Validation**

Expected output:
```
[DangerActorObject] Using preset hitbox for pedestrian pedestrian_1
[DangerActorObject] Dynamic hitbox for vehicle bus_1
```

### Tuning Parameters (if needed)

If testing reveals adjustments needed:

- **Too hard to click** → Increase size: `[2.0, 4.5, 2.0]`
- **Too easy to mis-click** → Decrease size: `[1.2, 3.5, 1.2]`
- **Height misaligned** → Adjust Y and center (maintain center.y = size.y / 2)

### Success Criteria

- ✅ Pedestrians clickable from any angle
- ✅ Hitbox visually aligned with pedestrian body
- ✅ No impact on vehicle/other object click precision
- ✅ No performance degradation (presets require no calculation)

## Future Extensibility

### Potential Enhancements

**1. Subdivide Pedestrian Types (if needed)**

For different body sizes (children, tall adults):

```typescript
const HITBOX_PRESETS = {
  PEDESTRIAN_ADULT: { size: [1.5, 4.0, 1.5], center: [0, 2.0, 0] },
  PEDESTRIAN_CHILD: { size: [1.2, 2.5, 1.2], center: [0, 1.25, 0] },
};
```

**2. Per-Actor Override (optional)**

Allow specific actors to override hitbox:

```typescript
// In actor definition
{
  id: 'special_pedestrian',
  type: ActorType.PEDESTRIAN,
  customHitbox: { size: [2, 5, 2], center: [0, 2.5, 0] }
}
```

**3. Additional Animated Character Types**

For cyclists, motorcyclists, etc.:
- Add `ActorType.CYCLIST` with dedicated preset
- Or detect animated characters by checking `actor.animationUrls`

### Out of Scope (YAGNI)

❌ Real-time hitbox updates during animation
❌ Pose-based hitbox adjustment
❌ Automatic hitbox learning/optimization

## Technical Notes

**Why this approach wins:**

1. **Pragmatic** - Limited actor types, simple preset configuration
2. **Precise** - Can fine-tune for perfect visual match
3. **Performant** - No complex calculations for pedestrians
4. **Maintainable** - Clear, readable code

**Trade-offs accepted:**

- Manual tuning required for new pedestrian model types
- Not truly "dynamic" for pedestrians (acceptable given limited model variety)

## Implementation Checklist

- [ ] Add pedestrian hitbox constants
- [ ] Implement type-based branching logic
- [ ] Test with debug visualization enabled
- [ ] Test clicking on all actor types
- [ ] Tune preset values if needed
- [ ] Set DEBUG_HITBOX = false for production
- [ ] Commit changes
