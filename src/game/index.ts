/**
 * React Three Fiber 遊戲架構主入口
 * 匯出所有核心模組供外部使用
 */

// 模型系統
export { ModelLoader, preloadModels, useModel, clearModelCache } from './models/ModelLoader'
export { modelManager, ModelManager } from './models/ModelManager'

// 動畫系統
export { AnimationController } from './animations/AnimationController'
export { AnimatedModel, useAnimationController } from './animations/AnimatedModel'

// 優化系統
export { LODSystem, useLODLevels } from './optimization/LODSystem'
export { ChunkLoader, useGridChunks } from './optimization/ChunkLoader'
export {
  PerformanceMonitor,
  usePerformanceStats,
  getPerformanceRecommendations,
  getAutoQualityLevel,
  QualityLevel
} from './optimization/PerformanceMonitor'

// 遊戲組件
export { PlayerController, useKeyboardControls } from './components/PlayerController'
export { PlayerVehicle } from './components/PlayerVehicle'
export { Environment, SkyBox, BasicLighting } from './components/Environment'

// 工具函數
export {
  distance,
  lerp,
  lerpVector,
  clamp,
  degToRad,
  radToDeg,
  randomRange,
  randomIntRange,
  randomVectorInSphere,
  sphereCollision,
  boxCollision,
  raycast,
  Timer,
  EventEmitter
} from './utils/GameUtils'

// 場景
export { GameScene } from './scenes/GameScene'
export { ExampleScene } from './scenes/ExampleScene'
