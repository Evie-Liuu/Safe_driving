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
        },
      ],
      actions: [
        {
          actorId: 'pedestrian_1',
          type: ActionType.ANIMATION,
          name: 'Male_Walking_Phone_Animation',
          time: 0,
          loop: true,
        },
        {
          actorId: 'pedestrian_1',
          type: ActionType.MOVEMENT,
          path: [
            [-92.17, 0.15, -15.64],
            [-82.48, 0.15, -15.54],
            [-71.69, 0.15, -15.25],
          ],
          speed: 1.5,
          time: 0,
          loop: true,
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
        // 公車移動
        {
          actorId: 'bus_1',
          type: ActionType.MOVEMENT,
          path: [
            [37.6, 0, 9.35],
            [95.23, 0, 8.62],
            [106.6, 0, 7.7],
            [109.21, 0, 8.04],
            [111.73, 0, 11.7],
            [112.51, 0, 17.17],
            [110.52, 0, 93.51],
            [113.74, 0, 106.27],
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
            [28, 0, 9.35],
            [50, 0, 8.9],
            [65, 0, 6.5],
            [80, 0, 5.5],
            [100, 0, 7.2],
            [106.6, 0, 7.7],
            [109.21, 0, 8.04],
            [111.73, 0, 11.7],
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
      id: 'danger-6',
      name: '自行車突然偏移（閃避障礙物）',
      description: '自行車騎士為了閃避路面坑洞突然向車道偏移',
      actors: [
        {
          id: 'bicycle_1',
          name: '自行車',
          type: ActorType.BICYCLE,
          model: '/src/assets/models/Bicycle1_Rigged.glb',
          initialPosition: [107.5, 0, 36],
          initialRotation: [0, 0, 0],
          animationUrls: ['/src/assets/animations/car/Bicycle_Moving_Animation.glb'],
        },
        {
          id: 'rider_1',
          name: '自行車騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male1_Rigged.glb',
          initialPosition: [107.5, 0, 36],
          initialRotation: [0, 0, 0],
          scale: [1, 1, 1],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb'],
        },
      ],
      actions: [
        // 自行車動畫
        {
          actorId: 'bicycle_1',
          type: ActionType.ANIMATION,
          name: 'Bicycle_Moving_Animation',
          time: 0,
          loop: true,
        },
        // 自行車移動
        {
          actorId: 'bicycle_1',
          type: ActionType.MOVEMENT,
          path: [
            [107.5, 0, 36],
            [108.3, 0, 41],
            [110.3, 0, 44],
            [110.44, 0, 49.95],
            [109.13, 0, 53.19],
            [107.5, 0, 60],
          ],
          speed: 5,
          time: 0,
          duration: 8,
          loop: true,
        },
        // 騎士動畫
        {
          actorId: 'rider_1',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Bicycle_Animation',
          time: 0,
          loop: true,
        },
        // 騎士移動（與自行車同步）
        {
          actorId: 'rider_1',
          type: ActionType.MOVEMENT,
          path: [
            [107.5, 0, 36],
            [108.3, 0, 41],
            [110.3, 0, 44],
            [110.44, 0, 49.95],
            [109.13, 0, 53.19],
            [107.5, 0, 60],
          ],
          speed: 5,
          time: 0,
          duration: 8,
          loop: true,
        },
      ],
      questions: {
        q1: {
          question: '這個情境中誰的行為最危險？',
          options: [
            '自行車正常騎在路邊',
            '自行車突然偏移未注意後方車輛',
            '自行車騎太慢',
            '自行車戴安全帽',
          ],
          correctIndex: 1,
        },
        q2: {
          question: '自行車騎士應該如何安全閃避障礙？',
          options: [
            '直接偏移不用管後方',
            '先回頭確認後方無車再偏移，或下車牽行',
            '加速快速通過',
            '按鈴就可以偏移',
          ],
          correctIndex: 1,
        },
      },
      feedback: [
        '危險原因：自行車突然橫移會進入汽機車路徑，後方車輛反應不及容易發生碰撞。',
        '安全行為：變換路線前先回頭確認後方，必要時下車牽行繞過障礙。',
      ],
      found: false,
    },
  ],

  safeObjects: [
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
  ],
};
