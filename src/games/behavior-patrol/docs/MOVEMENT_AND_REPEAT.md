# 自动点位移动与定时重复播放

## 📋 概述

本文档说明两个核心功能：
1. **自动点位移动** - 角色沿路径自动移动
2. **定时重复播放** - 动画/移动在固定时间间隔重复执行

---

## 🚶 自动点位移动系统

### 1. 基本移动配置

```typescript
{
  actorId: 'pedestrian_1',
  type: ActionType.MOVEMENT,
  path: [
    [0, 0, 0],    // 起点
    [10, 0, 0],   // 途经点 1
    [10, 0, 10],  // 途经点 2
    [0, 0, 10]    // 终点
  ],
  speed: 2,       // 速度（米/秒）
  time: 0,        // 开始时间
  loop: false     // 是否循环
}
```

**执行流程**：
1. 在 `time` 时刻开始移动
2. 按照 `path` 定义的点位顺序移动
3. 速度为 `speed` 米/秒
4. 到达终点后：
   - `loop: false` → 停止
   - `loop: true` → 回到起点继续

---

### 2. 循环移动（无限循环）

```typescript
{
  actorId: 'patrol_guard',
  type: ActionType.MOVEMENT,
  path: [
    [0, 0, 0],
    [20, 0, 0],
    [20, 0, 20],
    [0, 0, 20],
    [0, 0, 0]     // 回到起点
  ],
  speed: 3,
  time: 0,
  loop: true      // ✅ 无限循环
}
```

**效果**：
- 沿路径移动到终点
- 自动回到起点
- 继续下一轮移动
- 永不停止（直到组件卸载）

---

### 3. 限时移动

```typescript
{
  actorId: 'car_1',
  type: ActionType.MOVEMENT,
  path: [[0,0,0], [50,0,0]],
  speed: 10,
  time: 0,
  duration: 3     // ✅ 3秒后停止
}
```

**效果**：
- 开始移动
- 3秒后停止（即使还没到终点）
- 适合「中途停下」的场景

---

### 4. 自动朝向

```typescript
// 自动计算朝向
const direction = end.clone().sub(start).normalize();
const angle = Math.atan2(direction.x, direction.z);
groupRef.current.rotation.y = angle;
```

**特点**：
- ✅ 自动面向移动方向
- ✅ 平滑转向
- ✅ 无需手动设置旋转

---

## 🔄 定时重复播放系统

### 概念

**需求**：动画播放完后，等待一段时间，然后重新播放

```
播放 → 等待 repeatInterval → 重新播放 → 等待 → 重新播放 → ...
```

### 新增参数

```typescript
interface AnimationAction {
  // 现有参数
  name: string;
  time: number;
  loop?: boolean;

  // ✅ 新增：重复播放间隔（秒）
  repeatInterval?: number;
  repeatCount?: number;  // 可选：重复次数（undefined = 无限）
}
```

---

## 🎬 定时重复播放范例

### 范例 1：无限重复（固定间隔）

**场景**：车辆每5秒闪烁一次警示灯

```typescript
{
  actorId: 'car_1',
  type: ActionType.ANIMATION,
  name: 'Hazard_Light_Blink',
  time: 0,
  loop: false,              // 单次播放动画
  duration: 1,              // 动画持续1秒
  repeatInterval: 5,        // ✅ 每5秒重复一次
  clampWhenFinished: false  // 播放完回到初始
}
```

**时间轴**：
```
0s     1s   5s     6s   10s    11s
[Blink]    [Blink]    [Blink]
  ↓    ↓    ↓    ↓    ↓    ↓
播放  等待  播放  等待  播放  等待
```

---

### 范例 2：重复指定次数

**场景**：角色挥手3次

```typescript
{
  actorId: 'char_1',
  type: ActionType.ANIMATION,
  name: 'Wave',
  time: 0,
  loop: false,
  duration: 2,          // 每次挥手2秒
  repeatInterval: 4,    // 每4秒重复
  repeatCount: 3        // ✅ 只重复3次
}
```

**时间轴**：
```
0s  2s 4s  6s 8s  10s
[Wave] [Wave] [Wave]
  ↓    ↓    ↓
 1st  2nd  3rd (停止)
```

---

### 范例 3：开门动画（不重复）

**场景**：门打开后保持开启

```typescript
{
  actorId: 'door_1',
  type: ActionType.ANIMATION,
  name: 'Door_Opening',
  time: 1,
  loop: false,
  clampWhenFinished: true,  // 保持开启
  // 不设置 repeatInterval - 只播放一次
}
```

---

### 范例 4：移动定时重复

**场景**：车辆前进、后退、前进、后退...

```typescript
{
  id: 'shuttle_car',
  actors: [{ id: 'car_1', model: '/models/Car.glb', initialPosition: [0,0,0] }],
  actions: [
    // 第1次：前进
    {
      actorId: 'car_1',
      type: ActionType.MOVEMENT,
      path: [[0,0,0], [20,0,0]],
      speed: 5,
      time: 0,
      duration: 4
    },

    // 等待 2 秒

    // 第2次：后退
    {
      actorId: 'car_1',
      type: ActionType.MOVEMENT,
      path: [[20,0,0], [0,0,0]],
      speed: 5,
      time: 6,
      duration: 4
    },

    // 第3次：前进（重复周期）
    {
      actorId: 'car_1',
      type: ActionType.MOVEMENT,
      path: [[0,0,0], [20,0,0]],
      speed: 5,
      time: 12,
      duration: 4
    }
    // ... 继续定义
  ]
}
```

**更优雅的方式（使用 repeatInterval）**：
```typescript
{
  actorId: 'car_1',
  type: ActionType.MOVEMENT,
  path: [[0,0,0], [20,0,0], [0,0,0]],  // 来回路径
  speed: 5,
  time: 0,
  loop: true,           // ✅ 循环移动
  repeatInterval: 2     // 每轮之间等待2秒
}
```

---

## 🔧 实现逻辑

### 1. 追踪重复状态

```typescript
const repeatCountRef = useRef<Map<string, number>>(new Map());
const lastPlayTimeRef = useRef<Map<string, number>>(new Map());
```

### 2. 检查是否应该重复

```typescript
animationActions.forEach((action) => {
  const animKey = `${action.name}_${action.time}`;
  const playCount = repeatCountRef.current.get(animKey) || 0;

  // 检查是否应该播放（首次或重复）
  const shouldPlay =
    // 首次播放
    (currentTime >= action.time && playCount === 0) ||
    // 重复播放
    (action.repeatInterval &&
     currentTime >= (lastPlayTimeRef.current.get(animKey) || 0) + action.repeatInterval &&
     (!action.repeatCount || playCount < action.repeatCount));

  if (shouldPlay && animControllerRef.current) {
    // 播放动画
    animControllerRef.current.play(action.name, {...});

    // 更新追踪
    repeatCountRef.current.set(animKey, playCount + 1);
    lastPlayTimeRef.current.set(animKey, currentTime);
  }
});
```

---

## 📊 使用场景对比

### 场景 1：持续动作（使用 loop）

**适用**：走路、跑步、待机

```typescript
{
  actorId: 'ped_1',
  type: ActionType.ANIMATION,
  name: 'Walking',
  time: 0,
  loop: true  // ✅ 持续循环，无间隔
}
```

**特点**：
- 动画连续播放
- 无等待时间
- 适合持续性动作

---

### 场景 2：间歇性动作（使用 repeatInterval）

**适用**：挥手、闪烁、警示

```typescript
{
  actorId: 'char_1',
  type: ActionType.ANIMATION,
  name: 'Wave',
  time: 0,
  loop: false,
  repeatInterval: 5  // ✅ 每5秒播放一次
}
```

**特点**：
- 动画播放后有等待
- 适合间歇性动作
- 更自然的节奏

---

### 场景 3：一次性动作（无 loop、无 repeatInterval）

**适用**：开门、状态改变

```typescript
{
  actorId: 'door_1',
  type: ActionType.ANIMATION,
  name: 'Opening',
  time: 1,
  loop: false,
  clampWhenFinished: true  // 只播放一次
}
```

**特点**：
- 只播放一次
- 可选择保持姿势
- 适合状态改变

---

## 🎯 完整范例

### 范例：巡逻警卫（移动 + 重复动画）

```typescript
{
  id: 'patrol_guard',
  actors: [{
    id: 'guard_1',
    type: ActorType.PEDESTRIAN,
    model: '/models/Guard.glb',
    animationUrls: [
      '/animations/Walking.glb',
      '/animations/LookAround.glb'
    ],
    initialPosition: [0, 0, 0]
  }],
  actions: [
    // 走路动画（持续）
    {
      actorId: 'guard_1',
      type: ActionType.ANIMATION,
      name: 'Walking',
      time: 0,
      loop: true
    },

    // 巡逻移动（循环）
    {
      actorId: 'guard_1',
      type: ActionType.MOVEMENT,
      path: [
        [0, 0, 0],
        [20, 0, 0],
        [20, 0, 20],
        [0, 0, 20],
        [0, 0, 0]
      ],
      speed: 2,
      time: 0,
      loop: true
    },

    // 每10秒环顾一次
    {
      actorId: 'guard_1',
      type: ActionType.ANIMATION,
      name: 'LookAround',
      time: 10,
      loop: false,
      duration: 2,
      repeatInterval: 10,  // ✅ 每10秒重复
      fadeIn: 0.3,
      fadeOut: 0.3
    }
  ]
}
```

**效果**：
- 警卫沿固定路线巡逻（循环）
- 持续播放走路动画
- 每10秒停下来环顾四周（2秒）
- 然后继续巡逻

---

## 🎨 高级范例

### 范例：红绿灯循环

```typescript
{
  id: 'traffic_light',
  actors: [{
    id: 'light_1',
    model: '/models/TrafficLight.glb',
    animationUrls: [
      '/animations/Light_Red.glb',
      '/animations/Light_Yellow.glb',
      '/animations/Light_Green.glb'
    ],
    initialPosition: [10, 0, 10]
  }],
  actions: [
    // 0-30秒：红灯
    {
      actorId: 'light_1',
      type: ActionType.ANIMATION,
      name: 'Light_Red',
      time: 0,
      loop: true,
      duration: 30
    },

    // 30-33秒：黄灯
    {
      actorId: 'light_1',
      type: ActionType.ANIMATION,
      name: 'Light_Yellow',
      time: 30,
      loop: true,
      duration: 3
    },

    // 33-63秒：绿灯
    {
      actorId: 'light_1',
      type: ActionType.ANIMATION,
      name: 'Light_Green',
      time: 33,
      loop: true,
      duration: 30
    },

    // 63秒后重复（需要手动定义或使用 repeatInterval）
    // 或者使用脚本自动生成循环
  ]
}
```

---

## 📋 参数对比表

| 参数 | 用途 | 示例值 | 效果 |
|------|------|--------|------|
| `loop: true` | 动画/移动持续循环 | - | 无间隔连续执行 |
| `loop: false` | 单次执行 | - | 执行一次后停止 |
| `duration` | 限制执行时长 | 5 | 5秒后停止 |
| `repeatInterval` | 重复间隔 | 10 | 每10秒重复一次 |
| `repeatCount` | 重复次数 | 3 | 只重复3次 |
| `clampWhenFinished` | 保持最后姿势 | true | 动画结束后保持 |

---

## 🔍 调试技巧

### 查看移动状态
```typescript
console.log('Active movement:', activeMovement);
console.log('Path progress:', pathProgressRef.current);
console.log('Current path index:', currentPathIndexRef.current);
```

### 可视化路径点
```typescript
<DangerGroup danger={danger} enableDebug={true} />
// 会显示黄色球体标记路径点
```

### 追踪重复次数
```typescript
console.log('Play count:', repeatCountRef.current.get(animKey));
console.log('Last play time:', lastPlayTimeRef.current.get(animKey));
```

---

## ✅ 总结

### 自动点位移动 ✅
- ✅ 支持多点路径
- ✅ 自动计算朝向
- ✅ 支持循环移动
- ✅ 支持限时移动
- ✅ 速度可配置

### 定时重复播放 ✅
- ✅ 支持固定间隔重复
- ✅ 支持重复次数限制
- ✅ 支持动画和移动
- ✅ 灵活的时间控制

---

## 🔗 相关文档

- `ANIMATION_FLOW.md` - 动画播放流程
- `ANIMATION_EXAMPLES.md` - 动画使用范例
- `types.ts` - Action 类型定义
- `DangerActorObject.tsx` - 组件实现
