import { PatrolScenario } from '../types';

/**
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
      type: 'pedestrian',
      position: [-92.17, 0.15, -15.64],
      rotation: [0, Math.PI / 2, 0],
      model: '/src/assets/models/Male1_CnH_Rigged.glb',
      accessoryNames: ['phone'],
      animationUrls: ['/src/assets/animations/character/Male_Walking_Phone_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Male_Walking_Phone_Animation', animationLoop: true },
        { type: 'movement', path: [[-92.17, 0.15, -15.64], [-82.48, 0.15, -15.54], [-71.69, 0.15, -15.25]], speed: 1.5, loop: true },
      ],
      questions: {
        q1: {
          question: '畫面中發生了什麼危險行為？',
          options: ['行人在斑馬線等紅燈', '行人邊走邊滑手機、注意力不在周遭', '行人在看路牌找方向', '行人靠右行走、保持警覺'],
          correctIndex: 1,
        },
        q2: {
          question: '此情境應採取哪個更安全的行為？',
          options: ['繼續滑手機但走快一點', '把音量開大提醒別人', '先停下來再使用手機，走路時抬頭注意周遭', '走到馬路上避開人群'],
          correctIndex: 2,
        },
      },
      feedback: ['危險原因說明：在人行道也可能出現腳踏車擦身、轉角突然來車或工地障礙；分心會降低反應時間。', '安全行為：走路時抬頭觀察、需要用手機就先停到安全處再操作'],
      found: false,
    },
    {
      id: 'danger-2',
      name: '不走斑馬線任意穿越',
      type: 'pedestrian',
      position: [-124.6, 0.15, 79],
      rotation: [0, Math.PI / 2, 0],
      model: '/src/assets/models/Female1_Rigged.glb',
      animationUrls: ['/src/assets/animations/character/Female_Walking_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Female_Walking_Remain_Animation', animationLoop: true },
        { type: 'movement', path: [[-124.6, 0.15, 79], [-113.66, 0, 79.8], [-100.44, 0.15, 80.6]], speed: 2, loop: true },
      ],
      questions: {
        q1: {
          question: '畫面中最主要的危險點是什麼？',
          options: ['行人在斑馬線上正常通行', '行人闖紅燈', '行人未走斑馬線任意穿越', '行人站在路邊等候'],
          correctIndex: 2,
        },
        q2: {
          question: '正確、安全的做法是？',
          options: ['趁車少就直接衝過去', '走到最近的斑馬線（或行穿線）再過馬路', '從兩台車中間穿越更省時間', '只要小跑步就很安全'],
          correctIndex: 1,
        },
      },
      feedback: ['危險原因：駕駛預期行人會在斑馬線出現；任意穿越容易進入視線死角，造成緊急煞車或碰撞。', '安全行為：走斑馬線、停看聽，與車保持安全距離後再通過。'],
      found: false,
    },
    {
      id: 'danger-3',
      name: '機車超速到斑馬線迴轉',
      type: 'scooter',
      position: [4.26, 0, -60],
      rotation: [0, Math.PI, 0],
      model: '/src/assets/models/Scooter2_Rigged.glb',
      behaviors: [
        { type: 'movement', path: [[4.26, 0, -60], [3.5, 0, -99], [1.89, 0, -103.23], [0.29, 0, -104], [-1.1, 0, -102.5], [-1.88, 0, -88.2], [-1.77, 0, 24.75]], speed: 17, loop: true },
      ],
      questions: {
        q1: {
          question: '這台機車做了什麼危險行為？',
          options: ['在路口不禮讓行人', '行駛速度過快', '邊騎邊抽菸', '未戴安全帽'],
          correctIndex: 1,
        },
        q2: {
          question: '安全做法應該是？',
          options: ['保持車距, 並遵守限速', '加速搶過去，避免被後車按喇叭', '直接在人群旁邊迴轉', '迴轉前不用看後方'],
          correctIndex: 0,
        },
      },
      feedback: ['危險原因：斑馬線是行人高出現區；超速會增加路口衝突，反應距離不足容易撞上行人或側向車流。', '保持與前後車輛的安全距離，並依照速限行駛；在一般市區道路，常見速限約為 40 km/h'],
      found: false,
    },
    {
      id: 'danger-4',
      name: '機車在公車後方搶快超車',
      description: '公車正常行駛，機車從後方視線死角高速超車，容易發生碰撞',
      actors: [
        {
          id: 'bus_1',
          name: '正常行駛公車',
          type: 'vehicle',
          model: '/src/assets/models/Bus_Rigged.glb',
          position: [37.6, 0, 9.35],
          rotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Bus_Moving_Animation.glb'],
          behaviors: [
            { type: 'animation', animation: 'Bus_Moving_Animation', animationLoop: true },
            {
              type: 'movement',
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
              loop: true
            },
          ],
        },
        {
          id: 'scooter_1',
          name: '搶快超車機車',
          type: 'scooter',
          model: '/src/assets/models/Scooter2_Rigged.glb',
          position: [28, 0, 9.35], // 在公車後方
          rotation: [0, Math.PI / 2, 0],
          behaviors: [
            {
              type: 'movement',
              path: [
                [28, 0, 9.35],      // 起點（公車後方）
                [50, 0, 8.9],       // 跟隨階段
                [65, 0, 6.5],       // 開始偏移超車
                [80, 0, 5.5],       // 危險超車中
                [100, 0, 7.2],      // 超過公車
                [106.6, 0, 7.7],    // F點
                [109.21, 0, 8.04],
                [111.73, 0, 11.7],
                [112.51, 0, 17.17],
                [110.52, 0, 93.51],
                [113.74, 0, 106.27],  //I點
                [113.55, 0, 108.89],
                [111.66, 0, 111.89],
                [106.98, 0, 112.88]
              ],
              speed: 12, // 機車速度較快
              loop: true
            },
          ],
        },
      ],
      questions: {
        q1: {
          question: '這個情境最大的危險是？',
          options: ['機車未依限速行駛', '機車在公車旁/後方視線死角搶快超車', '機車闖紅燈', '機車未禮讓行人'],
          correctIndex: 1,
        },
        q2: {
          question: '較安全的做法是？',
          options: ['在轉角加速超車更快通過', '貼近公車後方，隨時準備鑽縫', '保持安全車距，不在轉角與大型車旁超車', '只要按喇叭就可以超車'],
          correctIndex: 2,
        },
      },
      feedback: ['危險原因：大型車轉彎有內輪差與視線死角；機車搶快容易被擠壓、擦撞，或突然遇到轉出行人/車輛。', '替代行為：保持距離、避免轉角超車、等路段安全再超越'],
      found: false,
    },
    {
      id: 'danger-5',
      name: '汽車不禮讓斑馬線行人',
      type: 'vehicle',
      position: [-7.84, 0, 110.9],
      rotation: [0, -Math.PI / 2, 0],
      model: '/src/assets/models/Car2_Rigged.glb',
      animationUrls: ['/src/assets/animations/car/Car2_Moving_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Car2_Moving_Animation', animationLoop: true },
        {
          type: 'movement',
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
          ], speed: 10, loop: true
        },
      ],
      questions: {
        q1: {
          question: '畫面中哪個行為違規且危險？',
          options: ['行人未行走斑馬線', '汽車在斑馬線前未減速、不禮讓行人', '汽車為打右轉燈', '汽車逆向行駛'],
          correctIndex: 1,
        },
        q2: {
          question: '汽車駕駛應該怎麼做？',
          options: ['看到行人就加速通過比較安全', '按喇叭請行人讓路', '斑馬線前減速、停讓行人先通過', '貼近行人邊緣通過即可'],
          correctIndex: 2,
        },
      },
      feedback: ['危險原因：行人已合法通行，車輛搶行會造成碰撞；尤其無號誌路口更依賴駕駛主動停讓。', '替代行為：提前減速、停讓行人、確認行人完全通過再起步。'],
      found: false,
    },
    {
      id: 'danger-6',
      name: '自行車突然偏移（閃避障礙物）',
      description: '自行車騎士為了閃避路面坑洞突然向車道偏移，未注意後方來車',
      actors: [
        {
          id: 'bicycle_1',
          name: '自行車',
          type: 'bicycle',
          model: '/src/assets/models/Bicycle1_Rigged.glb',
          position: [5, 0, 30],
          rotation: [0, 0, 0],
          animationUrls: ['/src/assets/animations/car/Bicycle_Moving_Animation.glb'],
          behaviors: [
            { type: 'animation', animation: 'Bicycle_Moving_Animation', animationLoop: true },
            {
              type: 'movement',
              path: [
                [5, 0, 30],
                [5.5, 0, 40],
                [7, 0, 45],      // 開始偏移（閃避坑洞）
                [8.5, 0, 50],    // 危險偏移中
                [8, 0, 55],      // 回正
                [7, 0, 65]
              ],
              speed: 4,
              loop: true
            },
          ],
        },
        {
          id: 'rider_1',
          name: '自行車騎士',
          type: 'pedestrian',
          model: '/src/assets/models/Male1_Rigged.glb',
          position: [5, 0, 30],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb'],
          behaviors: [
            { type: 'animation', animation: 'Male_Riding_Bicycle_Animation', animationLoop: true },
            {
              type: 'movement',
              path: [
                [5, 0, 30],
                [5.5, 0, 40],
                [7, 0, 45],
                [8.5, 0, 50],
                [8, 0, 55],
                [7, 0, 65]
              ],
              speed: 4,
              loop: true
            },
          ],
        },
      ],
      questions: {
        q1: {
          question: '這個情境中誰的行為最危險？',
          options: ['自行車正常騎在路邊', '自行車突然偏移未注意後方車輛', '自行車騎太慢', '自行車戴安全帽'],
          correctIndex: 1,
        },
        q2: {
          question: '自行車騎士應該如何安全閃避障礙？',
          options: ['直接偏移不用管後方', '先回頭確認後方無車再偏移，或下車牽行', '加速快速通過', '按鈴就可以偏移'],
          correctIndex: 1,
        },
      },
      feedback: ['危險原因：自行車突然橫移會進入汽機車路徑，後方車輛反應不及容易發生碰撞。', '安全行為：變換路線前先回頭確認後方，必要時下車牽行繞過障礙。'],
      found: false,
    },
  ],

  safeObjects: [
    // {
    //   id: 'safe-1',
    //   name: '正常行駛車輛',
    //   position: [-20, 0, 0],
    //   rotation: [0, 0, 0],
    //   model: '/src/assets/models/Car1_Rigged.glb',
    //   behaviors: [
    //     { type: 'movement', path: [[-20, 0, 0], [20, 0, 0]], speed: 5, loop: true },
    //   ],
    // },
    {
      id: 'safe-2',
      name: '等紅燈行人',
      position: [-14.49, 0, -13.87],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Male3_Rigged.glb',
      behaviors: [],
    },
    {
      id: 'safe-3',
      name: 'B_E段正常行駛機車',
      position: [-9.39, 0, -100.78],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Scooter1_Rigged.glb',
      behaviors: [
        { type: 'movement', path: [[-9.39, 0, -100.78], [-9.15, 0, -19.52]], speed: 8, loop: false },
      ],
    },
  ],
};
