import { PatrolScenario, ActionType, ActorType } from '../types';

/**
 * 場景 1 - 採用新的 actors + actions 格式
 * 與 RiskEvents_1.ts 格式一致
 */
export const patrolScenario1: PatrolScenario = {
  id: 'scenario-1',
  name: '十字路口場景',
  description: '觀察繁忙的十字路口，找出危險行為',
  timeLimit: 60,
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
          replayInterval: 18, // 完成後等待18秒再重播
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
          name: 'Female_Walking_Remain_Animation',
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
      description: '機車超速到斑馬線迴轉',
      actors: [
        {
          id: 'scooter_speeding_1',
          name: '超速回轉機車',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter3_Rigged.glb',
          initialPosition: [4.26, 0, -60],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
          replayInterval: 10, // 完成後等待10秒再重播
          // replayCount: 3, // 可選：限制重播次數
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
          replayInterval: 10, // 與機車同步重播
        },
      ],
      actions: [
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
          loop: false,
        },
        // 機車移動
        {
          actorId: 'scooter_speeding_1',
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
          duration: 8, // 約8秒完成路徑
          // 使用 actor 的 replayInterval 來控制重播
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
          duration: 8, // 與機車同步
        },
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
      description: '公車正常行駛，機車從後方視線死角高速超車',
      actors: [
        {
          id: 'bus_1',
          name: '正常行駛公車',
          type: ActorType.VEHICLE,
          model: '/src/assets/models/Bus_Rigged.glb',
          initialPosition: [37.6, 0, 9.35],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Bus_Moving_Animation.glb'],
        },
        {
          id: 'scooter_1',
          name: '搶快超車機車',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter2_Rigged.glb',
          initialPosition: [28, 0, 9.35],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
        },
        {
          id: 'scooter_driver_1',
          name: '搶快超車機車騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male3_CnH_Rigged.glb',
          initialPosition: [28, 0, 9.35],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],
        },

      ],
      actions: [
        // 公車動畫
        {
          actorId: 'bus_1',
          type: ActionType.ANIMATION,
          name: 'Bus_Moving_Animation',
          time: 0,
          loop: true,
        },
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
          name: 'Male_Riding_Scooter_Animation',
          time: 0,
          loop: true,
        },
        // 公車移動
        {
          actorId: 'bus_1',
          type: ActionType.MOVEMENT,
          path: [
            [37.6, 0, 9.35],
            [95.23, 0, 8.62],
            [106.6, 0, 7.7],  //F點
            [109.21, 0, 8.04],
            [111.73, 0, 11.7],
            [112.51, 0, 17.17],
            [110.52, 0, 93.51],
            [113.74, 0, 106.27],  //I點
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
          speed: 6,
          time: 0,
          loop: true,
        },
        // 機車移動（速度更快，超車）
        {
          actorId: 'scooter_1',
          type: ActionType.MOVEMENT,
          path: [
            [37.6, 0, 9.35],
            [95.23, 0, 8.62],
            [106.6, 0, 7.7],  //F點
            [109.21, 0, 8.04],
            [111.73, 0, 11.7],
            [112.51, 0, 17.17],
            [110.52, 0, 93.51],
            [113.74, 0, 106.27],  //I點
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
          speed: 12,
          time: 0,
          loop: true,
        },
        {
          actorId: 'scooter_driver_1',
          type: ActionType.MOVEMENT,
          path: [
            [37.6, 0, 9.35],
            [95.23, 0, 8.62],
            [106.6, 0, 7.7],  //F點
            [109.21, 0, 8.04],
            [111.73, 0, 11.7],
            [112.51, 0, 17.17],
            [110.52, 0, 93.51],
            [113.74, 0, 106.27],  //I點
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
          speed: 12,
          time: 0,
          loop: true,
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
      description: '汽車不禮讓斑馬線行人',
      actors: [
        {
          id: 'car_not_yield_1',
          name: '汽車',
          type: ActorType.VEHICLE,
          model: '/src/assets/models/Car2_Rigged.glb',
          initialPosition: [-7.84, 0, 110.9],
          initialRotation: [0, -Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Car_Moving_Animation.glb'],
        },
        {
          id: 'pedestrian_crossing_1',
          name: '行人',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male3_Rigged.glb',
          initialPosition: [-13.22, 0, 123.71],
          initialRotation: [0, 0, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Male_Walking_Animation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'car_not_yield_1',
          type: ActionType.ANIMATION,
          name: 'Car_Moving_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'pedestrian_crossing_1',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Animation',
          time: 0,
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
          speed: 10,
          time: 0,
          loop: true,
        },
        {
          actorId: 'pedestrian_crossing_1',
          type: ActionType.MOVEMENT,
          path: [
            [-13.22, 0, 123.71],
            [-13.72, 0, 105.12],
          ],
          speed: 4,
          time: 0,
          loop: false,
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

    // {
    //   id: 'danger-6',
    //   name: '自行車突然偏移（閃避障礙物）',
    //   description: '自行車騎士為了閃避路面坑洞突然向車道偏移',
    //   actors: [
    //     {
    //       id: 'bicycle_1',
    //       name: '自行車',
    //       type: ActorType.BICYCLE,
    //       model: '/src/assets/models/Bicycle1_Rigged.glb',
    //       initialPosition: [107.5, 0, 36],
    //       initialRotation: [0, 0, 0],
    //       animationUrls: ['/src/assets/animations/car/Bicycle_Moving_Animation.glb'],
    //     },
    //     {
    //       id: 'rider_1',
    //       name: '自行車騎士',
    //       type: ActorType.PEDESTRIAN,
    //       model: '/src/assets/models/Male1_Rigged.glb',
    //       initialPosition: [107.5, 0, 36],
    //       initialRotation: [0, 0, 0],
    //       scale: [1, 1, 1],
    //       animationUrls: ['/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb'],
    //     },
    //   ],
    //   actions: [
    //     // 自行車動畫
    //     {
    //       actorId: 'bicycle_1',
    //       type: ActionType.ANIMATION,
    //       name: 'Bicycle_Moving_Animation',
    //       time: 0,
    //       loop: true,
    //     },
    //     // 自行車移動
    //     {
    //       actorId: 'bicycle_1',
    //       type: ActionType.MOVEMENT,
    //       path: [
    //         [107.5, 0, 36],
    //         [108.3, 0, 41],
    //         [110.3, 0, 44],
    //         [110.44, 0, 49.95],
    //         [109.13, 0, 53.19],
    //         [107.5, 0, 60],
    //       ],
    //       speed: 5,
    //       time: 0,
    //       duration: 8,
    //       loop: true,
    //     },
    //     // 騎士動畫
    //     {
    //       actorId: 'rider_1',
    //       type: ActionType.ANIMATION,
    //       name: 'Male_Riding_Bicycle_Animation',
    //       time: 0,
    //       loop: true,
    //     },
    //     // 騎士移動（與自行車同步）
    //     {
    //       actorId: 'rider_1',
    //       type: ActionType.MOVEMENT,
    //       path: [
    //         [107.5, 0, 36],
    //         [108.3, 0, 41],
    //         [110.3, 0, 44],
    //         [110.44, 0, 49.95],
    //         [109.13, 0, 53.19],
    //         [107.5, 0, 60],
    //       ],
    //       speed: 5,
    //       time: 0,
    //       duration: 8,
    //       loop: true,
    //     },
    //   ],
    //   questions: {
    //     q1: {
    //       question: '這個情境中誰的行為最危險？',
    //       options: [
    //         '自行車正常騎在路邊',
    //         '自行車突然偏移未注意後方車輛',
    //         '自行車騎太慢',
    //         '自行車戴安全帽',
    //       ],
    //       correctIndex: 1,
    //     },
    //     q2: {
    //       question: '自行車騎士應該如何安全閃避障礙？',
    //       options: [
    //         '直接偏移不用管後方',
    //         '先回頭確認後方無車再偏移，或下車牽行',
    //         '加速快速通過',
    //         '按鈴就可以偏移',
    //       ],
    //       correctIndex: 1,
    //     },
    //   },
    //   feedback: [
    //     '危險原因：自行車突然橫移會進入汽機車路徑，後方車輛反應不及容易發生碰撞。',
    //     '安全行為：變換路線前先回頭確認後方，必要時下車牽行繞過障礙。',
    //   ],
    //   found: false,
    // },
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
