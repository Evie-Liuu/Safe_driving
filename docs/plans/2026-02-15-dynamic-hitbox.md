# Dynamic Hitbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace fixed-size invisible hitbox with dynamic bounding-box-based hitbox that adapts to each actor model's actual size with configurable padding.

**Architecture:** Calculate THREE.js bounding box when model loads, apply 1.3x padding multiplier, store dimensions in component state, and render dynamic hitbox mesh.

**Tech Stack:** React, Three.js, @react-three/fiber

---

## Task 1: Add state for dynamic hitbox sizing

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:38-43`

**Step 1: Add hitbox state variables**

Add these state declarations after the existing state variables (around line 43):

```tsx
const [isReady, setIsReady] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);
const elapsedTimeRef = useRef(0);

// Dynamic hitbox sizing
const [hitboxSize, setHitboxSize] = useState<[number, number, number]>([2, 2, 2]);
const [hitboxCenter, setHitboxCenter] = useState<[number, number, number]>([0, 1, 0]);
```

**Step 2: Add padding multiplier constant**

Add this constant at the top of the component function (after the props destructuring, around line 37):

```tsx
}: DangerActorObjectProps) {
  // Hitbox padding multiplier for easier clicking
  const HITBOX_PADDING_MULTIPLIER = 1.3;

  const groupRef = useRef<THREE.Group>(null);
```

**Step 3: Verify compilation**

Run: `npm run dev` or check TypeScript compilation
Expected: No errors

**Step 4: Commit**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "feat: add state for dynamic hitbox sizing

Add hitboxSize and hitboxCenter state variables and HITBOX_PADDING_MULTIPLIER constant for dynamic hitbox calculation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Calculate bounding box when model loads

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx` (model loading useEffect)

**Step 1: Find the model loading useEffect**

Locate the useEffect that loads the model (search for `getSharedLoader` and `setIsReady(true)`).

**Step 2: Add bounding box calculation**

After the model is successfully loaded and before `setIsReady(true)`, add the bounding box calculation:

```tsx
// Apply scale if provided
if (actor.scale) {
  clonedScene.scale.set(...actor.scale);
}

// Calculate bounding box for dynamic hitbox
const boundingBox = new THREE.Box3().setFromObject(clonedScene);
const size = new THREE.Vector3();
const center = new THREE.Vector3();
boundingBox.getSize(size);
boundingBox.getCenter(center);

// Apply padding for easier clicking
const paddedSize: [number, number, number] = [
  size.x * HITBOX_PADDING_MULTIPLIER,
  size.y * HITBOX_PADDING_MULTIPLIER,
  size.z * HITBOX_PADDING_MULTIPLIER,
];

// Calculate center position relative to model origin
const centerOffset: [number, number, number] = [
  center.x,
  center.y,
  center.z,
];

// Update hitbox state
setHitboxSize(paddedSize);
setHitboxCenter(centerOffset);

modelSceneRef.current = clonedScene;
setIsReady(true);
```

**Step 3: Verify the location**

Read the file to confirm the exact line numbers:

```bash
# This will be done during execution
```

**Step 4: Test in browser**

Run: `npm run dev`
Open browser, navigate to behavior patrol game
Expected: Game loads without errors, hitboxes calculated (check with React DevTools state)

**Step 5: Commit**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "feat: calculate bounding box for dynamic hitbox

Calculate model bounding box on load, apply 1.3x padding multiplier, and update hitbox state with dynamic size and center position.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update hitbox mesh to use dynamic values

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:677-681`

**Step 1: Replace fixed hitbox with dynamic hitbox**

Replace the current invisible hitbox mesh:

```tsx
{/* Invisible hitbox for better clicking */}
<mesh position={hitboxCenter}>
  <boxGeometry args={hitboxSize} />
  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
</mesh>
```

**Step 2: Verify the change**

The key changes:
- `position={[0, 1, 0]}` → `position={hitboxCenter}`
- `args={[2, 2, 2]}` → `args={hitboxSize}`
- `opacity={100}` → `opacity={0}` (bug fix)

**Step 3: Test clicking in browser**

Run: `npm run dev`
Test scenarios:
1. Click on pedestrian - should be easier to click
2. Click on vehicle (bus) - should match larger model
3. Click on scooter - should match medium model
Expected: All actors clickable with appropriate hitbox sizes

**Step 4: Commit**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "feat: use dynamic hitbox size and position

Replace fixed hitbox dimensions with state-based dynamic values. Fix opacity bug (100 -> 0) for truly invisible hitbox.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Manual testing and verification

**Files:**
- No code changes

**Step 1: Test all actor types**

Run: `npm run dev`

Test each actor type:
1. **Pedestrian** - Click on walking pedestrian with phone
2. **Vehicle** - Click on bus or car
3. **Scooter** - Click on scooter with driver
4. **Multiple actors** - Verify no overlap issues

**Step 2: Verify improvements**

Check that:
- ✅ Clicking is easier than before
- ✅ Hitbox roughly matches visual model
- ✅ No accidental clicks on wrong objects
- ✅ All actor types are clickable

**Step 3: Test edge cases**

- Actors with custom `scale` property
- Actors that start hidden (earliestActionTime > 0)
- Actors with animations that change pose

**Step 4: Document test results**

If issues found, note them for follow-up adjustments to `HITBOX_PADDING_MULTIPLIER`.

---

## Task 5: Optional - Add debug visualization

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:677-681`

**Note:** Only implement if requested by user or if testing reveals hitbox issues.

**Step 1: Add debug mode constant**

```tsx
const HITBOX_PADDING_MULTIPLIER = 1.3;
const DEBUG_HITBOX = false; // Set to true to visualize hitboxes
```

**Step 2: Update hitbox material**

```tsx
{/* Invisible hitbox for better clicking */}
<mesh position={hitboxCenter}>
  <boxGeometry args={hitboxSize} />
  <meshBasicMaterial
    transparent
    opacity={DEBUG_HITBOX ? 0.3 : 0}
    color={DEBUG_HITBOX ? "#00ff00" : undefined}
    depthWrite={false}
  />
</mesh>
```

**Step 3: Test debug mode**

Set `DEBUG_HITBOX = true`, run game, verify green semi-transparent boxes appear around actors.

**Step 4: Commit**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "feat: add optional debug visualization for hitboxes

Add DEBUG_HITBOX constant to visualize hitboxes during development with semi-transparent green boxes.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Completion Criteria

- ✅ Dynamic hitbox size calculated from model bounding box
- ✅ 1.3x padding multiplier applied
- ✅ Hitbox center position calculated correctly
- ✅ Opacity bug fixed (100 → 0)
- ✅ All actor types (pedestrian, vehicle, scooter, bicycle) clickable
- ✅ No compilation errors
- ✅ Manual testing completed successfully

## Future Enhancements

- Per-actor-type padding multipliers (e.g., different padding for vehicles vs pedestrians)
- Minimum hitbox size guarantee for very small objects
- Per-actor debug override via props
