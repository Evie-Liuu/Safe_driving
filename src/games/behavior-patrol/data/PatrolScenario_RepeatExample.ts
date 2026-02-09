import { PatrolScenario, ActionType, ActorType } from '../types';

/**
 * 範例場景：展示 repeatInterval 和 repeatCount 功能
 *
 * 包含：
 * 1. 警示燈閃爍（無限重複）
 * 2. 行人揮手（重複3次）
 * 3. 車門開啟（只播放一次，保持開啟）
 */
export const patrolScenarioRepeatExample: PatrolScenario = {
  id: 'repeat_demo',
  name: '重複播放示範場景',
  description: '展示動畫重複播放功能：警示燈、揮手、車門',
  timeLimit: 60,
  maxLives: 3,

  scene: {
    environment: '/models/crosswalk.glb',
    cameraPosition: [0, 10, 20],
    cameraLookAt: [0, 0, 0],
  },

  dangers: [
    // 範例 1：車輛警示燈（無限重複）
    {
      id: 'hazard_car',
      name: '警示車輛',
      description: '車輛警示燈每5秒閃爍一次',
      actors: [
        {
          id: 'car_1',
          name: '警示車',
          type: ActorType.VEHICLE,
          model: '/models/Car_Main2_Rigged.glb',
          initialPosition: [-10, 0, 0],
          initialRotation: [0, 0, 0],
          animationUrls: ['/animations/Car_Main2_Hazard_Blinking.glb'],
        },
      ],
      actions: [
        {
          actorId: 'car_1',
          type: ActionType.ANIMATION,
          name: 'Car_Main2_Hazard_Blinking_Animation',
          time: 0,
          loop: false, // 單次播放動畫
          duration: 1, // 閃爍1秒
          repeatInterval: 5, // ✅ 每5秒重複一次
          clampWhenFinished: false, // 播放完回到初始
          fadeIn: 0.1,
          fadeOut: 0.1,
        },
      ],
      questions: {
        q1: {
          question: '這輛車為什麼開啟警示燈？',
          options: ['拋錨故障', '正常停車', '準備轉彎', '準備超車'],
          correctIndex: 0,
        },
        q2: {
          question: '看到警示燈閃爍的車輛應該如何應對？',
          options: ['加速超越', '保持距離', '靠近查看', '鳴笛示警'],
          correctIndex: 1,
        },
      },
      feedback: [
        '很好！你發現了開啟警示燈的車輛',
        '警示燈表示車輛可能發生故障或有特殊狀況',
        '應該保持安全距離並小心駕駛',
      ],
      found: false,
    },

    // 範例 2：行人揮手（重複3次）
    {
      id: 'waving_pedestrian',
      name: '揮手行人',
      description: '行人揮手打招呼（重複3次）',
      actors: [
        {
          id: 'ped_1',
          name: '行人',
          type: ActorType.PEDESTRIAN,
          model: '/models/Male1_CnH_Rigged.glb',
          initialPosition: [10, 0, 0],
          animationUrls: [
            '/animations/Male_Idle.glb',
            '/animations/Male_Wave.glb',
          ],
        },
      ],
      actions: [
        // 待機動畫（持續播放）
        {
          actorId: 'ped_1',
          type: ActionType.ANIMATION,
          name: 'Male_Idle_Animation',
          time: 0,
          loop: true,
        },

        // 揮手動畫（重複3次，每4秒一次）
        {
          actorId: 'ped_1',
          type: ActionType.ANIMATION,
          name: 'Male_Wave_Animation',
          time: 2, // 2秒後開始第一次揮手
          loop: false,
          duration: 2, // 每次揮手2秒
          repeatInterval: 4, // ✅ 每4秒重複
          repeatCount: 3, // ✅ 只重複3次
          clampWhenFinished: false,
          fadeIn: 0.3,
          fadeOut: 0.3,
        },
      ],
      questions: {
        q1: {
          question: '這位行人在做什麼？',
          options: ['揮手打招呼', '指揮交通', '求助', '伸展運動'],
          correctIndex: 0,
        },
        q2: {
          question: '看到路邊行人揮手，駕駛應該如何反應？',
          options: ['忽略繼續開', '減速注意', '停車詢問', '鳴笛回應'],
          correctIndex: 1,
        },
      },
      feedback: [
        '注意到了揮手的行人！',
        '行人揮手可能表示友好，也可能需要幫助',
        '駕駛應該減速並注意行人動向',
      ],
      found: false,
    },

    // 範例 3：車門開啟（只播放一次，保持開啟）
    {
      id: 'opening_door',
      name: '開門車輛',
      description: '停放車輛突然開門（定時播放一次）',
      actors: [
        {
          id: 'parked_car',
          name: '停放車輛',
          type: ActorType.VEHICLE,
          model: '/models/Car_Main2_Rigged.glb',
          initialPosition: [0, 0, -10],
          initialRotation: [0, Math.PI, 0],
          animationUrls: ['/animations/Car_Main2_LeftDoor_Opening.glb'],
        },
      ],
      actions: [
        {
          actorId: 'parked_car',
          type: ActionType.ANIMATION,
          name: 'Car_Main2_LeftDoor_Opening_Animation',
          time: 3, // 3秒後開門
          loop: false,
          clampWhenFinished: true, // ✅ 保持開啟狀態
          fadeIn: 0.2,
          // 注意：沒有 repeatInterval，所以只播放一次
        },
      ],
      questions: {
        q1: {
          question: '停放車輛突然開門有什麼危險？',
          options: ['沒有危險', '可能撞到經過車輛', '阻擋交通', '違反規定'],
          correctIndex: 1,
        },
        q2: {
          question: '開車門前應該如何做？',
          options: ['直接開門', '先看後視鏡', '快速開門', '只開一點'],
          correctIndex: 1,
        },
      },
      feedback: [
        '很好！你發現了開門車輛的危險',
        '開車門前一定要先確認後方無來車',
        '「開門殺」是常見的交通事故原因',
      ],
      found: false,
    },
  ],

  safeObjects: [
    // 正常行駛車輛（無危險）
    {
      id: 'normal_car',
      name: '正常行駛車輛',
      actors: [
        {
          id: 'safe_car_1',
          name: '安全車輛',
          type: ActorType.VEHICLE,
          model: '/models/Car_Main1_Rigged.glb',
          initialPosition: [0, 0, 10],
          animationUrls: ['/animations/Car_Wheels_Rotation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'safe_car_1',
          type: ActionType.ANIMATION,
          name: 'Car_Wheels_Rotation_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'safe_car_1',
          type: ActionType.MOVEMENT,
          path: [
            [0, 0, 10],
            [0, 0, 30],
          ],
          speed: 5,
          time: 0,
        },
      ],
    },
  ],
};
