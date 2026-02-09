import { PatrolScenario, ActionType, ActorType } from '../types';

/**
 * 移動測試場景
 * 用於驗證點位移動功能是否正常執行
 */
export const patrolScenarioMovementTest: PatrolScenario = {
  id: 'movement_test',
  name: '移動測試場景',
  description: '測試角色的點位移動功能',
  timeLimit: 60,
  maxLives: 3,

  scene: {
    environment: '/models/crosswalk.glb',
    cameraPosition: [0, 15, 25],
    cameraLookAt: [0, 0, 0],
  },

  dangers: [
    // 測試 1：簡單直線移動
    {
      id: 'test_1_simple_movement',
      name: '測試1：簡單移動',
      description: '行人從 A 點走到 B 點',
      actors: [
        {
          id: 'ped_1',
          name: '測試行人1',
          type: ActorType.PEDESTRIAN,
          model: '/models/Male1_CnH_Rigged.glb',
          initialPosition: [-10, 0, 0],
          animationUrls: ['/animations/Male_Walking.glb'],
        },
      ],
      actions: [
        // 走路動畫
        {
          actorId: 'ped_1',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 0,
          loop: true,
        },
        // 移動動作
        {
          actorId: 'ped_1',
          type: ActionType.MOVEMENT,
          path: [
            [-10, 0, 0],  // 起點
            [10, 0, 0],   // 終點
          ],
          speed: 2,       // 2 米/秒
          time: 0,        // 立即開始
          loop: false,
        },
      ],
      questions: {
        q1: {
          question: '行人是否正常移動？',
          options: ['是', '否'],
          correctIndex: 0,
        },
        q2: {
          question: '行人面向是否正確？',
          options: ['是', '否'],
          correctIndex: 0,
        },
      },
      feedback: ['測試1完成'],
      found: false,
    },

    // 測試 2：多點路徑移動
    {
      id: 'test_2_multi_point',
      name: '測試2：多點路徑',
      description: '行人沿多個點移動',
      actors: [
        {
          id: 'ped_2',
          name: '測試行人2',
          type: ActorType.PEDESTRIAN,
          model: '/models/Male1_CnH_Rigged.glb',
          initialPosition: [-10, 0, 5],
          animationUrls: ['/animations/Male_Walking.glb'],
        },
      ],
      actions: [
        {
          actorId: 'ped_2',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'ped_2',
          type: ActionType.MOVEMENT,
          path: [
            [-10, 0, 5],   // 起點
            [0, 0, 5],     // 途經點1
            [0, 0, 10],    // 途經點2
            [10, 0, 10],   // 終點
          ],
          speed: 2,
          time: 0,
          loop: false,
        },
      ],
      questions: {
        q1: {
          question: '行人是否經過所有路徑點？',
          options: ['是', '否'],
          correctIndex: 0,
        },
        q2: {
          question: '轉向是否平滑？',
          options: ['是', '否'],
          correctIndex: 0,
        },
      },
      feedback: ['測試2完成'],
      found: false,
    },

    // 測試 3：循環移動
    {
      id: 'test_3_loop_movement',
      name: '測試3：循環移動',
      description: '行人來回移動',
      actors: [
        {
          id: 'ped_3',
          name: '測試行人3',
          type: ActorType.PEDESTRIAN,
          model: '/models/Male1_CnH_Rigged.glb',
          initialPosition: [-10, 0, -5],
          animationUrls: ['/animations/Male_Walking.glb'],
        },
      ],
      actions: [
        {
          actorId: 'ped_3',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'ped_3',
          type: ActionType.MOVEMENT,
          path: [
            [-10, 0, -5],
            [10, 0, -5],
            [-10, 0, -5],  // 回到起點
          ],
          speed: 3,
          time: 0,
          loop: true,      // ✅ 循環移動
        },
      ],
      questions: {
        q1: {
          question: '行人是否持續循環移動？',
          options: ['是', '否'],
          correctIndex: 0,
        },
        q2: {
          question: '回到起點時是否平滑？',
          options: ['是', '否'],
          correctIndex: 0,
        },
      },
      feedback: ['測試3完成'],
      found: false,
    },

    // 測試 4：延遲啟動
    {
      id: 'test_4_delayed_start',
      name: '測試4：延遲啟動',
      description: '行人3秒後才開始移動',
      actors: [
        {
          id: 'ped_4',
          name: '測試行人4',
          type: ActorType.PEDESTRIAN,
          model: '/models/Male1_CnH_Rigged.glb',
          initialPosition: [-10, 0, -10],
          animationUrls: ['/animations/Male_Idle.glb', '/animations/Male_Walking.glb'],
        },
      ],
      actions: [
        // 0-3秒：待機
        {
          actorId: 'ped_4',
          type: ActionType.ANIMATION,
          name: 'Male_Idle_Animation',
          time: 0,
          loop: true,
          duration: 3,
        },
        // 3秒後：開始走路
        {
          actorId: 'ped_4',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 3,
          loop: true,
        },
        {
          actorId: 'ped_4',
          type: ActionType.MOVEMENT,
          path: [
            [-10, 0, -10],
            [10, 0, -10],
          ],
          speed: 2,
          time: 3,         // ✅ 3秒後開始移動
          loop: false,
        },
      ],
      questions: {
        q1: {
          question: '行人是否在3秒後才開始移動？',
          options: ['是', '否'],
          correctIndex: 0,
        },
        q2: {
          question: '延遲時間是否準確？',
          options: ['是', '否'],
          correctIndex: 0,
        },
      },
      feedback: ['測試4完成'],
      found: false,
    },

    // 測試 5：限時移動
    {
      id: 'test_5_duration',
      name: '測試5：限時移動',
      description: '行人移動5秒後停止',
      actors: [
        {
          id: 'ped_5',
          name: '測試行人5',
          type: ActorType.PEDESTRIAN,
          model: '/models/Male1_CnH_Rigged.glb',
          initialPosition: [10, 0, -10],
          animationUrls: ['/animations/Male_Walking.glb', '/animations/Male_Idle.glb'],
        },
      ],
      actions: [
        // 0-5秒：走路
        {
          actorId: 'ped_5',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 0,
          loop: true,
          duration: 5,
        },
        {
          actorId: 'ped_5',
          type: ActionType.MOVEMENT,
          path: [
            [10, 0, -10],
            [-20, 0, -10],  // 很遠的終點（不會到達）
          ],
          speed: 2,
          time: 0,
          duration: 5,     // ✅ 5秒後停止移動
        },
        // 5秒後：待機
        {
          actorId: 'ped_5',
          type: ActionType.ANIMATION,
          name: 'Male_Idle_Animation',
          time: 5,
          loop: true,
        },
      ],
      questions: {
        q1: {
          question: '行人是否在5秒後停止？',
          options: ['是', '否'],
          correctIndex: 0,
        },
        q2: {
          question: '停止時動畫是否切換為待機？',
          options: ['是', '否'],
          correctIndex: 0,
        },
      },
      feedback: ['測試5完成'],
      found: false,
    },
  ],

  safeObjects: [],
};
