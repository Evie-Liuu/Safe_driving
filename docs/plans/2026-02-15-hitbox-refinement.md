# Hitbox Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix pedestrian hitbox by implementing type-based strategy with preset sizes for animated characters.

**Architecture:** Add pedestrian hitbox constants and type-based branching in model loading to use presets for pedestrians while maintaining dynamic Box3 calculation for vehicles.

**Tech Stack:** React, TypeScript, Three.js, @react-three/fiber

---

## Task 1: Add pedestrian hitbox constants

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:38-41`

**Step 1: Locate constant definitions**

Read the file to find the exact location of `HITBOX_PADDING_MULTIPLIER` and `DEBUG_HITBOX` constants (around line 38-40).

**Step 2: Add pedestrian preset constants**

Add these constants after `DEBUG_HITBOX`:

```typescript
const HITBOX_PADDING_MULTIPLIER = 1.3;
const DEBUG_HITBOX = true; // Set to false to hide hitbox visualization

// Pedestrian preset hitbox (padding already included)
const PEDESTRIAN_HITBOX_SIZE: [number, number, number] = [1.5, 4.0, 1.5];
const PEDESTRIAN_HITBOX_CENTER: [number, number, number] = [0, 2.0, 0];
```

**Step 3: Verify TypeScript compilation**

Run: `npm run dev` or check TypeScript errors
Expected: No compilation errors

**Step 4: Commit**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "feat: add pedestrian hitbox preset constants

Add PEDESTRIAN_HITBOX_SIZE and PEDESTRIAN_HITBOX_CENTER constants for type-based hitbox strategy.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Implement type-based hitbox calculation

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:272-296`

**Step 1: Read current hitbox calculation code**

Locate the bounding box calculation in the model loading useEffect (around lines 272-296). It should start with:
```typescript
// Calculate bounding box for dynamic hitbox
const boundingBox = new THREE.Box3().setFromObject(clonedScene);
```

**Step 2: Replace with type-based branching**

Replace the entire hitbox calculation block (from `// Calculate bounding box` to `setHitboxCenter(centerOffset);`) with:

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

  setHitboxSize(paddedSize);
  setHitboxCenter(centerOffset);

  console.log(`[DangerActorObject] Dynamic hitbox for ${actor.type} ${actor.id}`);
}
```

**Step 3: Verify the change**

Key changes:
- Added `if (actor.type === ActorType.PEDESTRIAN)` branching
- Pedestrians use preset constants
- Other types use existing Box3 calculation
- Both paths have console.log for verification

**Step 4: Check TypeScript compilation**

Run: `npm run dev` or check for errors
Expected: No compilation errors, dev server starts successfully

**Step 5: Commit**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "feat: implement type-based hitbox calculation

Use preset dimensions for pedestrians to fix animated model bounding box issue. Maintain dynamic Box3 calculation for vehicles and other actor types.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Test with debug visualization

**Files:**
- No code changes

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on http://localhost:5173 (or similar)

**Step 2: Open behavior patrol game**

Navigate to the behavior patrol game in browser.
Expected: Game loads successfully

**Step 3: Verify console logs**

Open browser console and look for hitbox logs:
Expected output:
```
[DangerActorObject] Using preset hitbox for pedestrian pedestrian_1
[DangerActorObject] Dynamic hitbox for vehicle bus_1
```

**Step 4: Visual verification of green hitboxes**

With `DEBUG_HITBOX = true`, inspect green semi-transparent boxes:

**Pedestrian hitbox should be:**
- ✅ Tall and narrow (not short and fat)
- ✅ Extends from feet to above head
- ✅ Centered on pedestrian body
- ✅ Size approximately [1.5, 4.0, 1.5] units

**Vehicle hitbox should be:**
- ✅ Maintains original accuracy
- ✅ Matches vehicle body size
- ✅ No regression from previous behavior

**Step 5: Document observations**

Note any issues:
- Is pedestrian hitbox too tall/short?
- Is it too wide/narrow?
- Does it align with visual model?
- Any overlap issues with multiple actors?

---

## Task 4: Manual clicking test and parameter tuning

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:41-42` (if tuning needed)

**Step 1: Test pedestrian clicking**

Click on different parts of pedestrian:
- ✅ Head area - should trigger
- ✅ Body area - should trigger
- ✅ Feet area - should trigger
- ❌ Space beside pedestrian - should NOT trigger

**Step 2: Test other actor types**

Click on vehicles, scooters, etc.:
- ✅ Should maintain previous accuracy
- ✅ No regression in clickability

**Step 3: Test edge cases**

- Multiple pedestrians close together - verify no mis-clicks
- Pedestrians with different animations - verify hitbox stays correct
- Pedestrians at different positions - verify alignment

**Step 4: Tune constants if needed**

If hitbox is not optimal, adjust constants:

**If too hard to click (hitbox too small):**
```typescript
const PEDESTRIAN_HITBOX_SIZE: [number, number, number] = [2.0, 4.5, 2.0];
const PEDESTRIAN_HITBOX_CENTER: [number, number, number] = [0, 2.25, 0];
```

**If too easy to mis-click (hitbox too large):**
```typescript
const PEDESTRIAN_HITBOX_SIZE: [number, number, number] = [1.2, 3.5, 1.2];
const PEDESTRIAN_HITBOX_CENTER: [number, number, number] = [0, 1.75, 0];
```

**Remember:** Always keep `center.y = size.y / 2` to maintain vertical centering.

**Step 5: Re-test after tuning**

If constants were adjusted, repeat Steps 1-3 to verify improvement.

**Step 6: Commit tuning changes (if any)**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "tune: adjust pedestrian hitbox size for optimal clicking

Fine-tune PEDESTRIAN_HITBOX_SIZE to [X, Y, Z] based on manual testing feedback.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Production readiness (Optional)

**Files:**
- Modify: `src/games/behavior-patrol/components/DangerActorObject.tsx:40`

**Step 1: Disable debug visualization**

Change `DEBUG_HITBOX` to `false`:

```typescript
const DEBUG_HITBOX = false; // Set to true to visualize hitboxes
```

**Step 2: Remove debug console logs (optional)**

If desired, remove or comment out the debug console.log statements:
```typescript
// Optional: Remove these lines
console.log(`[DangerActorObject] Using preset hitbox for pedestrian ${actor.id}`);
console.log(`[DangerActorObject] Dynamic hitbox for ${actor.type} ${actor.id}`);
```

**Step 3: Test in production mode**

Run: `npm run build && npm run preview`
Expected: Build succeeds, hitboxes invisible, clicking still works

**Step 4: Commit production changes**

```bash
git add src/games/behavior-patrol/components/DangerActorObject.tsx
git commit -m "chore: disable debug hitbox visualization for production

Set DEBUG_HITBOX to false for production release.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Completion Criteria

- ✅ Pedestrian hitbox uses preset dimensions [1.5, 4.0, 1.5]
- ✅ Pedestrian hitbox is tall and narrow, centered on model
- ✅ Pedestrians clickable from any angle (head, body, feet)
- ✅ Vehicle/scooter hitboxes maintain original accuracy
- ✅ No compilation errors
- ✅ Console logs show correct strategy per actor type
- ✅ Manual testing passes all scenarios
- ✅ Debug visualization can be toggled on/off

## Rollback Plan

If issues occur:

```bash
# Revert to previous dynamic-only implementation
git revert HEAD~[number-of-commits]

# Or restore specific file
git checkout HEAD~[n] -- src/games/behavior-patrol/components/DangerActorObject.tsx
```

## Future Enhancements

**Not in this plan (YAGNI):**
- Per-pedestrian-model size variations
- Custom hitbox override per actor
- Real-time hitbox adjustment during animation
- Automatic hitbox learning

These can be added later if user testing reveals the need.
