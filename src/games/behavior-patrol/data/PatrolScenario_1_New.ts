import { PatrolScenario, ActionType, ActorType } from '../types';

/**
 * 場景 1 - 採用新的 actors + actions 格式
 * 與 RiskEvents_1.ts 格式一致
 * Cruise points for the route
 * A--B--C
 * |  |  |
 * D--E--F
 * |  |  |
 * G--H--I
 */
export const patrolScenario1: PatrolScenario = {
  id: 'scenario-1',
  name: '十字路口場景',
  description: '觀察繁忙的十字路口，找出危險行為',
  timeLimit: 600,
  maxLives: 3,

  scene: {
    environment: 'city-intersection',
    cameraPosition: [0, 20, 35],
    cameraLookAt: [0, 0, 0],
  },

  dangers: [
    {
      id: 'danger-1',
      name: '行人邊走邊滑手機',
      description: '行人在人行道上邊走邊滑手機，注意力不在周遭環境',
      replayInterval: 5, // 完成後等待5秒再重播
      actors: [
        {
          id: 'pedestrian_1',
          name: '滑手機行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male1_CnH_Rigged.glb',
          initialPosition: [-92.17, 0.15, -15.64],
          initialRotation: [0, Math.PI / 2, 0],
          accessoryNames: ['phone'],
          animationUrls: ['/src/assets/animations/character/Male_Walking_Phone_Animation.glb'],

        },
      ],
      actions: [
        {
          actorId: 'pedestrian_1',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Phone_Animation',
          time: 0,
          // duration: 14, // 估計行走時間
          loop: true, // 動畫本身循環播放
        },
        {
          actorId: 'pedestrian_1',
          type: ActionType.MOVEMENT,
          path: [
            [-92.17, 0.15, -15.64],
            [-82.48, 0.15, -15.54],
            [-71.69, 0.15, -15.25],
            [-47.31, 0, -15.46]
          ],
          speed: 3,
          time: 0,
          loop: false,
          duration: 8, // 約8秒完成路徑
          // 使用 actor 的 replayInterval 來控制重播
        },
      ],
      questions: {
        q1: {
          question: '畫面中發生了什麼危險行為？',
          options: [
            '行人在斑馬線等紅燈',
            '行人邊走邊滑手機、注意力不在周遭',
            '行人在看路牌找方向',
            '行人靠右行走、保持警覺',
          ],
          correctIndex: 1,
        },
        q2: {
          question: '此情境應採取哪個更安全的行為？',
          options: [
            '繼續滑手機但走快一點',
            '把音量開大提醒別人',
            '先停下來再使用手機，走路時抬頭注意周遭',
            '走到馬路上避開人群',
          ],
          correctIndex: 2,
        },
      },
      feedback: [
        '危險原因說明：在人行道也可能出現腳踏車擦身、轉角突然來車或工地障礙；分心會降低反應時間。',
        '安全行為：走路時抬頭觀察、需要用手機就先停到安全處再操作',
      ],
      found: false,
    },
    {
      id: 'danger-2',
      name: '不走斑馬線任意穿越',
      description: '行人不走斑馬線任意穿越道路',
      actors: [
        {
          id: 'pedestrian_crossing_1',
          name: '行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Female1_Rigged.glb',
          initialPosition: [-92.17, 0.15, -15.64],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/character/Female_Walking_Animation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'pedestrian_crossing_1',
          type: ActionType.ANIMATION,
          name: 'Female_Walking_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'pedestrian_crossing_1',
          type: ActionType.MOVEMENT,
          path: [
            [-124.6, 0.15, 79],
            [-113.66, 0, 79.8],
            [-100.44, 0.15, 80.6]
          ],
          speed: 4,
          time: 0,
          loop: true,
        },
      ],
      questions: {
        q1: {
          question: '畫面中發生了什麼危險行為？',
          options: [
            '行人在斑馬線上正常通行',
            '行人闖紅燈',
            '行人未走斑馬線任意穿越',
            '行人站在路邊等候'
          ],
          correctIndex: 2,
        },
        q2: {
          question: '此情境應採取哪個更安全的行為？',
          options: [
            '趁車少就直接衝過去',
            '走到最近的斑馬線（或行穿線）再過馬路',
            '從兩台車中間穿越更省時間',
            '只要小跑步就很安全'
          ],
          correctIndex: 1,
        },
      },
      feedback: [
        '危險原因：駕駛預期行人會在斑馬線出現；任意穿越容易進入視線死角，造成緊急煞車或碰撞。',
        '安全行為：走斑馬線、停看聽，與車保持安全距離後再通過。'
      ],
      found: false,
    },
    {
      id: 'danger-3',
      name: '機車超速到斑馬線迴轉',
      description: '機車超速到斑馬線迴轉，對比正常遵守號誌的車輛',
      replayInterval: 3, // 完成後等待3秒再重播
      actors: [
        // 危險行為：超速機車
        {
          id: 'scooter_speeding_1',
          name: '超速回轉機車',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter3_Rigged.glb',
          initialPosition: [4.26, 0, -60],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
        },
        {
          id: 'scooter_speeding_driver_1',
          name: '超速回轉機車騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male3_CnH_Rigged.glb',
          initialPosition: [4.26, 0, -60],
          initialRotation: [0, Math.PI / 2, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],
        },

        // 正常行為：遵守號誌的汽車
        // {
        //   id: 'normal_car_1',
        //   name: '遵守紅綠燈的汽車',
        //   type: ActorType.VEHICLE,
        //   model: '/src/assets/models/Car1_Rigged.glb',
        //   initialPosition: [-10, 0, -60],
        //   initialRotation: [0, Math.PI / 2, 0],
        //   animationUrls: ['/src/assets/animations/car/Car1_Moving_Animation.glb'],
        // },
      ],
      actions: [
        // ========== 危險行為：超速機車（無視紅燈） ==========
        {
          actorId: 'scooter_speeding_1',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'scooter_speeding_driver_1',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Scooter_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'scooter_speeding_1',
          type: ActionType.MOVEMENT,
          path: [
            [4.26, 0, -60],
            [3.5, 0, -99],
            [1.89, 0, -103.23],  // 斑馬線轉角
            [0.29, 0, -104],
            [-1.1, 0, -102.5],
            [-1.88, 0, -88.2],
            [-1.77, 0, 24.75]
          ],
          speed: 17,  // 超速
          time: 0,
          loop: false,
          // duration: 8,
        },
        {
          actorId: 'scooter_speeding_driver_1',
          type: ActionType.MOVEMENT,
          path: [
            [4.26, 0, -60],
            [3.5, 0, -99],
            [1.89, 0, -103.23],
            [0.29, 0, -104],
            [-1.1, 0, -102.5],
            [-1.88, 0, -88.2],
            [-1.77, 0, 24.75]
          ],
          speed: 17,
          time: 0,
          loop: false,
          // duration: 8,
        },

        // ========== 正常行為：遵守號誌的汽車 ==========
        // // 階段1: 行駛到斑馬線前
        // {
        //   actorId: 'normal_car_1',
        //   type: ActionType.ANIMATION,
        //   name: 'Car1_Moving_Animation',
        //   time: 0,
        //   duration: 4,
        // },
        // {
        //   actorId: 'normal_car_1',
        //   type: ActionType.MOVEMENT,
        //   path: [
        //     [-10, 0, -60],
        //     [-8, 0, -95],  // 接近斑馬線
        //   ],
        //   speed: 8,  // 正常速度
        //   time: 0,
        // },

        // // 階段2: 遇紅燈等待（使用 WAIT action）
        // {
        //   actorId: 'normal_car_1',
        //   type: ActionType.WAIT,
        //   time: 4,
        //   duration: 5,  // 紅燈等待5秒
        // },

        // // 階段3: 綠燈通過斑馬線
        // {
        //   actorId: 'normal_car_1',
        //   type: ActionType.ANIMATION,
        //   name: 'Car1_Moving_Animation',
        //   time: 9,
        //   loop: true,
        // },
        // {
        //   actorId: 'normal_car_1',
        //   type: ActionType.MOVEMENT,
        //   path: [
        //     [-8, 0, -95],
        //     [-6, 0, -103.23],  // 通過斑馬線
        //     [-5, 0, -110],
        //   ],
        //   speed: 8,
        //   time: 9,
        //   loop: false,
        // },
      ],
      questions: {
        q1: {
          question: '這台機車做了什麼危險行為？',
          options: [
            '在路口不禮讓行人',
            '行駛速度過快',
            '邊騎邊抽菸',
            '未戴安全帽'
          ],
          correctIndex: 1,
        },
        q2: {
          question: '安全做法應該是？',
          options: [
            '保持車距, 並遵守限速',
            '加速搶過去，避免被後車按喇叭',
            '直接在人群旁邊迴轉',
            '迴轉前不用看後方'
          ],
          correctIndex: 0,
        },
      },
      feedback: [
        '危險原因：斑馬線是行人高出現區；超速會增加路口衝突，反應距離不足容易撞上行人或側向車流。',
        '保持與前後車輛的安全距離，並依照速限行駛；在一般市區道路，常見速限約為 40 km/h'
      ],
      found: false,
    },
    {
      id: 'danger-4',
      name: '機車在公車後方搶快超車',
      description: '公車正常行駛,多台機車從後方視線死角連續高速超車',
      replayInterval: 8, // 完成後等待8秒再重播
      actors: [
        {
          id: 'bus_1',
          name: '正常行駛公車',
          type: ActorType.VEHICLE,
          model: '/src/assets/models/Bus_Rigged.glb',
          initialPosition: [37.6, 0, 9.35],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Bus_Moving_Animation.glb'],
          isDangerous: false,
        },

        // 機車1號 - 最激進的超車
        {
          id: 'scooter_1',
          name: '激進超車機車1',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter2_Rigged.glb',
          initialPosition: [20, 0, 11.2], // 公車後方較遠位置
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],

        },
        {
          id: 'scooter_driver_1',
          name: '激進騎士1',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male3_CnH_Rigged.glb',
          initialPosition: [20, 0, 11.2],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],

        },

        // 機車2號 - 跟隨超車
        {
          id: 'scooter_2',
          name: '跟隨超車機車2',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter3_Rigged.glb', // 不同款式
          initialPosition: [20, 0, 11.2], // 稍微偏移,更後方
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],

        },
        {
          id: 'scooter_driver_2',
          name: '跟隨騎士2',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male2_CnH_Rigged.glb', // 不同模型
          initialPosition: [20, 0, 11.2],
          initialRotation: [0, Math.PI / 2, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],

        },

        // 機車3號 - 第三波超車
        {
          id: 'scooter_3',
          name: '連續超車機車3',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter2_Rigged.glb',
          initialPosition: [20, 0, 11.2], // 最後方
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],

        },
        {
          id: 'scooter_driver_3',
          name: '連續騎士3',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male1_CnH_Rigged.glb',
          initialPosition: [20, 0, 11.2],
          initialRotation: [0, Math.PI / 2, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],

        },
      ],
      actions: [
        // ========== 公車動作 ==========
        {
          actorId: 'bus_1',
          type: ActionType.ANIMATION,
          name: 'Bus_Moving_Animation',
          time: 0,
          // duration: 48.5, // 公車行駛時間
          loop: true,
        },

        // ========== 機車1號動作 (立即開始,最激進) ==========
        {
          actorId: 'scooter_1',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 3.6, // 立即開始
          // duration: 48.5, // 較快完成
          loop: true,
        },
        {
          actorId: 'scooter_driver_1',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Scooter_Animation',
          time: 3.6,
          // duration: 48.5,
          loop: true,
        },

        // ========== 機車2號動作 (延遲2秒) ==========
        {
          actorId: 'scooter_2',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 8.4, // 延遲2秒
          // duration: 48.5,
          loop: true,
        },
        {
          actorId: 'scooter_driver_2',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Scooter_Animation',
          time: 8.4,
          // duration: 48.5,
          loop: true,
        },

        // ========== 機車3號動作 (延遲4秒) ==========
        {
          actorId: 'scooter_3',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 11.2, // 延遲4秒
          // duration: 48.5,
          loop: true,
        },
        {
          actorId: 'scooter_driver_3',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Scooter_Animation',
          time: 11.2,
          // duration: 48.5,
          loop: true,
        },

        // 公車移動路徑
        {
          actorId: 'bus_1',
          type: ActionType.MOVEMENT,
          path: [
            [37.6, 0, 9.35],
            [95.23, 0, 8.62],
            [106.6, 0, 7.7],  //F點 - 轉角(危險超車點) ⚠️
            [109.21, 0, 8.04],
            [111.73, 0, 11.7],
            [112.51, 0, 17.17],
            [110.52, 0, 93.51],
            [113.74, 0, 106.27],  //I點 - 第二個轉角 ⚠️
            [113.55, 0, 108.89],
            [111.66, 0, 111.89],
            [106.98, 0, 112.88],
            [20.29, 0, 112.54],
            [13.44, 0, 113.83],  //H點
            [10.5, 0, 113.83],
            [7.81, 0, 111.28],
            [7.87, 0, 106],
            [9.11, 0, 22.89],
            [8.03, 0, 13.7],
            [7.41, 0, 11.7],  //E點
            [8.52, 0, 8.7],
            [13.93, 0, 7.84]
          ],
          speed: 8, // 公車穩定速度
          time: 0,
          // duration: 48.5, // 約40秒完成
        },

        // ========== 機車1號移動 (立即開始,最快) ==========
        {
          actorId: 'scooter_1',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 11.2],     // 從後方開始
            [37.6, 0, 11.2],   // 追上公車
            [95.23, 0, 10.02],
            [106.6, 0, 9.5],
            [108.32, 0, 11.14],  // F點 - 在轉角超越公車 ⚠️
            [108.91, 0, 17.41],
            [108.23, 0, 63.44],
            [109.73, 0, 106.1],
            [108.94, 0, 108.6],  // I點 - 第二個轉角 ⚠️
            [106.51, 0, 109.49],
            [58.23, 0, 108.27],
            [14.06, 0, 109.24],
            [11.85, 0, 108.38],  // H點 - 第三個轉角 ⚠️
            [11.66, 0, 21.5],
            [11.14, 0, 11.38]
          ],
          speed: 14, // 最快速度
          time: 3.6,
          // duration: 48.5,
        },
        {
          actorId: 'scooter_driver_1',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 11.2],     // 從後方開始
            [37.6, 0, 11.2],   // 追上公車
            [95.23, 0, 10.02],
            [106.6, 0, 9.5],
            [108.32, 0, 11.14],  // F點 - 在轉角超越公車 ⚠️
            [108.91, 0, 17.41],
            [108.23, 0, 63.44],
            [109.73, 0, 106.1],
            [108.94, 0, 108.6],  // I點 - 第二個轉角 ⚠️
            [106.51, 0, 109.49],
            [58.23, 0, 108.27],
            [14.06, 0, 109.24],
            [11.85, 0, 108.38],  // H點 - 第三個轉角 ⚠️
            [11.66, 0, 21.5],
            [11.14, 0, 11.38]
          ],
          speed: 14,
          time: 3.6,
          // duration: 48.5,
        },

        // ========== 機車2號移動 (延遲2秒,跟隨超車) ==========
        {
          actorId: 'scooter_2',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 11.2],     // 從後方開始
            [37.6, 0, 11.2],   // 追上公車
            [95.23, 0, 10.02],
            [106.6, 0, 9.5],
            [108.32, 0, 11.14],  // F點 - 在轉角超越公車 ⚠️
            [108.91, 0, 17.41],
            [108.23, 0, 63.44],
            [109.73, 0, 106.1],
            [108.94, 0, 108.6],  // I點 - 第二個轉角 ⚠️
            [106.51, 0, 109.49],
            [58.23, 0, 108.27],
            [14.06, 0, 109.24],
            [11.85, 0, 108.38],  // H點 - 第三個轉角 ⚠️
            [11.66, 0, 21.5],
            [11.14, 0, 11.38]
          ],
          speed: 13, // 稍慢但仍很快
          time: 8.4, // 延遲2秒
          // duration: 48.5,
        },
        {
          actorId: 'scooter_driver_2',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 11.2],     // 從後方開始
            [37.6, 0, 11.2],   // 追上公車
            [95.23, 0, 10.02],
            [106.6, 0, 9.5],
            [108.32, 0, 11.14],  // F點 - 在轉角超越公車 ⚠️
            [108.91, 0, 17.41],
            [108.23, 0, 63.44],
            [109.73, 0, 106.1],
            [108.94, 0, 108.6],  // I點 - 第二個轉角 ⚠️
            [106.51, 0, 109.49],
            [58.23, 0, 108.27],
            [14.06, 0, 109.24],
            [11.85, 0, 108.38],  // H點 - 第三個轉角 ⚠️
            [11.66, 0, 21.5],
            [11.14, 0, 11.38]
          ],
          speed: 13,
          time: 8.4,
          // duration: 48.5,
        },

        // ========== 機車3號移動 (延遲4秒,連續超車) ==========
        {
          actorId: 'scooter_3',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 11.2],     // 從後方開始
            [37.6, 0, 11.2],   // 追上公車
            [95.23, 0, 10.02],
            [106.6, 0, 9.5],
            [108.32, 0, 11.14],  // F點 - 在轉角超越公車 ⚠️
            [108.91, 0, 17.41],
            [108.23, 0, 63.44],
            [109.73, 0, 106.1],
            [108.94, 0, 108.6],  // I點 - 第二個轉角 ⚠️
            [106.51, 0, 109.49],
            [58.23, 0, 108.27],
            [14.06, 0, 109.24],
            [11.85, 0, 108.38],  // H點 - 第三個轉角 ⚠️
            [11.66, 0, 21.5],
            [11.14, 0, 11.38]
          ],
          speed: 12, // 快速但稍慢
          time: 11.2, // 延遲4秒
          // duration: 48.5,
        },
        {
          actorId: 'scooter_driver_3',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 11.2],     // 從後方開始
            [37.6, 0, 11.2],   // 追上公車
            [95.23, 0, 10.02],
            [106.6, 0, 9.5],
            [108.32, 0, 11.14],  // F點 - 在轉角超越公車 ⚠️
            [108.91, 0, 17.41],
            [108.23, 0, 63.44],
            [109.73, 0, 106.1],
            [108.94, 0, 108.6],  // I點 - 第二個轉角 ⚠️
            [106.51, 0, 109.49],
            [58.23, 0, 108.27],
            [14.06, 0, 109.24],
            [11.85, 0, 108.38],  // H點 - 第三個轉角 ⚠️
            [11.66, 0, 21.5],
            [11.14, 0, 11.38]
          ],
          speed: 12,
          time: 11.2,
          // duration: 48.5,
        },
      ],
      questions: {
        q1: {
          question: '這個情境最大的危險是？',
          options: [
            '機車未依限速行駛',
            '機車在公車旁/後方視線死角搶快超車',
            '機車闖紅燈',
            '機車未禮讓行人',
          ],
          correctIndex: 1,
        },
        q2: {
          question: '較安全的做法是？',
          options: [
            '在轉角加速超車更快通過',
            '貼近公車後方，隨時準備鑽縫',
            '保持安全車距，不在轉角與大型車旁超車',
            '只要按喇叭就可以超車',
          ],
          correctIndex: 2,
        },
      },
      feedback: [
        '危險原因：大型車轉彎有內輪差與視線死角；機車搶快容易被擠壓、擦撞，或突然遇到轉出行人/車輛。',
        '替代行為：保持距離、避免轉角超車、等路段安全再超越',
      ],
      found: false,
    },
    {
      id: 'danger-5',
      name: '汽車不禮讓斑馬線行人',
      description: '行人正在穿越斑馬線，汽車未減速、不禮讓直接通過',
      replayInterval: 5, // 完成後等待12秒再重播
      actors: [
        {
          id: 'car_not_yield_1',
          name: '不禮讓汽車',
          type: ActorType.VEHICLE,
          model: '/src/assets/models/Car2_Rigged.glb',
          initialPosition: [-7.84, 0, 110.9],
          initialRotation: [0, -Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Car1_Moving_Animation.glb'],
        },
        {
          id: 'pedestrian_crossing_1',
          name: '穿越斑馬線行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male3_Rigged.glb',
          initialPosition: [-13.38, 0.12, 107.29],
          initialRotation: [0, 0, 0],
          animationUrls: ['/src/assets/animations/character/Male_Walking_Animation.glb'],
        },
        {
          id: 'pedestrian_crossing_2',
          name: '穿越斑馬線行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male1_Rigged.glb',
          initialPosition: [-103.11, 0.15, 123.47],
          initialRotation: [0, Math.PI, 0],
          animationUrls: ['/src/assets/animations/character/Male_Walking_Animation.glb'],
        },
        {
          id: 'pedestrian_crossing_3',
          name: '穿越斑馬線行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Female2_Rigged.glb',
          initialPosition: [-104.52, 0.15, 124.12],
          initialRotation: [0, Math.PI, 0],
          animationUrls: ['/src/assets/animations/character/Female_Walking_Animation.glb'],
        },
      ],
      actions: [
        // 行人動作 - 先開始穿越斑馬線
        {
          actorId: 'pedestrian_crossing_1',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          // time: 0.8, // 行人先開始
          time: 13.8, // 行人先開始
          loop: true,
        },
        {
          actorId: 'pedestrian_crossing_2',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 6.5, // 行人先開始
          loop: true,
        },
        {
          actorId: 'pedestrian_crossing_3',
          type: ActionType.ANIMATION,
          name: 'Female_Walking_Animation',
          time: 6.8, // 行人先開始
          loop: true,
        },

        {
          actorId: 'pedestrian_crossing_1',
          type: ActionType.MOVEMENT,
          path: [
            [-13.38, 0.12, 107.29],  // 斑馬線起點(路邊)
            [-13.47, 0.12, 114.5],   // 斑馬線中間(危險點) ⚠️
            [-13.22, 0.12, 123.71],  // 斑馬線終點
          ],
          speed: 3.5, // 正常行人速度
          time: 13.8,
        },
        {
          actorId: 'pedestrian_crossing_2',
          type: ActionType.MOVEMENT,
          path: [
            [-103.11, 0.15, 123.47],  // 斑馬線起點(路邊)
            [-102.54, 0.15, 100.64],  // 斑馬線終點
          ],
          speed: 3.5, // 正常行人速度
          time: 6.5,
        },
        {
          actorId: 'pedestrian_crossing_3',
          type: ActionType.MOVEMENT,
          path: [
            [-104.52, 0.15, 124.12],  // 斑馬線起點(路邊)
            [-103.92, 0.15, 101.81],  // 斑馬線終點
          ],
          speed: 3.5, // 正常行人速度
          time: 6.8,
        },

        // 汽車動作 - 延遲啟動,製造不禮讓的危險時刻
        {
          actorId: 'car_not_yield_1',
          type: ActionType.ANIMATION,
          name: 'Car_Moving_Animation',
          time: 1.0, // 延遲1秒,當行人已在斑馬線上
          loop: true,
        },
        {
          actorId: 'car_not_yield_1',
          type: ActionType.MOVEMENT,
          path: [
            [-7.84, 0, 110.9],
            [-12, 0, 110.21],
            [-96.34, 0, 110.77], //斑馬線
            [-109.13, 0, 111.58],  //G點
            [-111.74, 0, 114.86],
            [-110.14, 0, 117.73],
            [-103.58, 0, 119.06],  //斑馬線
            [-18.7, 0, 119.21],
            [-11.77, 0, 119.41],  //
            [-9.45, 0, 118.29],  //H點
            [-6.21, 0, 114.89]
          ],
          speed: 11, // 較快速度,表現"不禮讓"
          time: 0, // 延遲1秒啟動 (當行人已走到斑馬線上)
          // ⚠️ 危險時刻: 約在 1.8-2.2 秒時,汽車與行人在斑馬線交會
        },
      ],
      questions: {
        q1: {
          question: '畫面中哪個行為違規且危險？',
          options: [
            '行人未行走斑馬線',
            '汽車在斑馬線前未減速、不禮讓行人',
            '汽車為打右轉燈',
            '汽車逆向行駛'
          ],
          correctIndex: 1,
        },
        q2: {
          question: '汽車駕駛應該怎麼做？',
          options: [
            '看到行人就加速通過比較安全',
            '按喇叭請行人讓路',
            '斑馬線前減速、停讓行人先通過',
            '貼近行人邊緣通過即可'
          ],
          correctIndex: 2,
        },
      },
      feedback: [
        '危險原因：行人已合法通行，車輛搶行會造成碰撞；尤其無號誌路口更依賴駕駛主動停讓。',
        '替代行為：提前減速、停讓行人、確認行人完全通過再起步。',
      ],
      found: false,
    },
  ],

  safeObjects: [
    {
      id: 'safe-1',
      name: '自行車',
      actors: [
        {
          id: 'bicycle_rider_1',
          name: '自行車騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male2_Rigged.glb',
          initialPosition: [-21.31, 0, -17.56],
          initialRotation: [0, -Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb'],
        },
        {
          id: 'bicycle_1',
          name: '自行車',
          type: ActorType.BICYCLE,
          model: '/src/assets/models/Bicycle2_Rigged.glb',
          initialPosition: [-21.31, 0, -17.56],
          initialRotation: [0, -Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Bicycle_Moving_Animation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'bicycle_rider_1',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Bicycle_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'bicycle_1',
          type: ActionType.ANIMATION,
          name: 'Bicycle_Moving_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'bicycle_rider_1',
          type: ActionType.MOVEMENT,
          path: [
            [-21.31, 0.15, -17.56],
            [-98, 0.15, -18.82],
          ],
          speed: 5,
          time: 0,
          // duration: 15,
          loop: true,
        },
        {
          actorId: 'bicycle_1',
          type: ActionType.MOVEMENT,
          path: [
            [-21.31, 0.15, -17.56],
            [-98, 0.15, -18.82],
          ],
          speed: 5,
          time: 0,
          // duration: 15,
          loop: true,
        },
      ],
    },
    {
      id: 'safe-2',
      name: '等紅燈行人',
      actors: [
        {
          id: 'waiting_pedestrian',
          name: '等紅燈行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male3_Rigged.glb',
          initialPosition: [-14.49, 0, -13.87],
          initialRotation: [0, 0, 0],
        },
      ],
      actions: [],
    },
    {
      id: 'safe-3',
      name: 'B_E段正常行駛機車',
      replayInterval: 5,
      actors: [
        {
          id: 'scooter_1',
          name: 'B_E段正常行駛機車',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter1_Rigged.glb',
          initialPosition: [-9.39, 0, -100.78],
          initialRotation: [0, 0, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
        },
        {
          id: 'scooter_driver_1',
          name: 'B_E段正常行駛機車騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Female3_CnH_Rigged.glb',
          initialPosition: [-9.39, 0, -100.78],
          initialRotation: [0, 0, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Female_Riding_Scooter_Animation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'scooter_1',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'scooter_driver_1',
          type: ActionType.ANIMATION,
          name: 'Female_Riding_Scooter_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'scooter_1',
          type: ActionType.MOVEMENT,
          path: [
            [-9.39, 0, -100.78],
            [-9.15, 0, -19.52]
          ],
          speed: 8,
          time: 0,
          loop: false,
        },
        {
          actorId: 'scooter_driver_1',
          type: ActionType.MOVEMENT,
          path: [
            [-9.39, 0, -100.78],
            [-9.15, 0, -19.52]
          ],
          speed: 8,
          time: 0,
          loop: false,
        },
      ],
    },
  ],
};
