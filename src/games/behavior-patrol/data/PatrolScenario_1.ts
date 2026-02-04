import { PatrolScenario } from '../types';

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
      name: '闖紅燈行人',
      position: [8, 0, 5],
      rotation: [0, -Math.PI / 2, 0],
      model: '/src/assets/models/Male1_Rigged.glb',
      animationUrls: ['/src/assets/models/animations/Male_Walking_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Armature|mixamo.com|Layer0', animationLoop: true },
        { type: 'movement', path: [[8, 0, 5], [8, 0, -5]], speed: 1.5, loop: false },
      ],
      questions: {
        q1: {
          question: '這個行為為什麼危險？',
          options: ['會造成交通堵塞', '可能被車輛撞到', '會被開罰單', '沒有危險'],
          correctIndex: 1,
        },
        q2: {
          question: '駕駛應該如何應對？',
          options: ['加速通過', '按喇叭警告', '減速並注意行人動向', '不需要理會'],
          correctIndex: 2,
        },
      },
      feedback: '行人闯红灯時，駕駛應保持警覺，減速觀察行人動向，必要時停車禮讓，避免發生事故。',
      found: false,
    },
    {
      id: 'danger-2',
      name: '未打方向燈變換車道',
      position: [-15, 0, 3],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Car2_Rigged.glb',
      behaviors: [
        { type: 'movement', path: [[-15, 0, 3], [15, 0, -1]], speed: 6, loop: true },
      ],
      questions: {
        q1: {
          question: '這個駕駛行為有什麼問題？',
          options: ['車速過快', '未打方向燈變換車道', '闯红灯', '逆向行駛'],
          correctIndex: 1,
        },
        q2: {
          question: '這會造成什麼危險？',
          options: ['噪音污染', '後方車輛無法預判導致碰撞', '浪費燃油', '沒有危險'],
          correctIndex: 1,
        },
      },
      feedback: '變換車道時必須提前打方向燈，讓後方車輛有足夠時間反應，避免碰撞事故。',
      found: false,
    },
    {
      id: 'danger-3',
      name: '機車鑽車縫',
      position: [5, 0, -10],
      rotation: [0, Math.PI, 0],
      scale: [0.8, 0.8, 0.8],
      model: '/src/assets/models/Car1_Rigged.glb',
      behaviors: [
        { type: 'movement', path: [[5, 0, -10], [-5, 0, -8], [5, 0, -6], [-5, 0, -4]], speed: 8, loop: true },
      ],
      questions: {
        q1: {
          question: '機車鑽車縫的主要危險是什麼？',
          options: ['會刮傷車輛', '容易發生碰撞', '會被檢舉', '沒有危險'],
          correctIndex: 1,
        },
        q2: {
          question: '汽車駕駛如何預防此類事故？',
          options: ['加速離開', '變換車道時多看後照鏡', '按喇叭警告', '不需要注意'],
          correctIndex: 1,
        },
      },
      feedback: '機車鑽車縫容易處於汽車駕駛的視線死角，汽車駕駛變換車道時應多注意後照鏡和死角區域。',
      found: false,
    },
    {
      id: 'danger-4',
      name: '路邊違停車輛',
      position: [-8, 0, 8],
      rotation: [0, Math.PI / 2, 0],
      model: '/src/assets/models/Car2_Rigged.glb',
      behaviors: [],
      questions: {
        q1: {
          question: '路邊違停車輛會造成什麼危險？',
          options: ['阻擋視線，可能有行人突然竄出', '噪音污染', '空氣污染', '沒有危險'],
          correctIndex: 0,
        },
        q2: {
          question: '經過違停車輛時應該如何駕駛？',
          options: ['加速通過', '減速並保持警戒，注意是否有人竄出', '按喇叭示警', '靠近違停車輛行駛'],
          correctIndex: 1,
        },
      },
      feedback: '路邊違停車輛會阻擋視線，可能有行人從車輛間突然竄出，經過時應減速並保持警戒。',
      found: false,
    },
    {
      id: 'danger-5',
      name: '兒童追球衝出',
      position: [12, 0, -3],
      rotation: [0, -Math.PI / 2, 0],
      scale: [0.7, 0.7, 0.7],
      model: '/src/assets/models/Male1_Rigged.glb',
      animationUrls: ['/src/assets/models/animations/Male_Running_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Armature|mixamo.com|Layer0', animationLoop: true },
        { type: 'movement', path: [[12, 0, -3], [12, 0, 3]], speed: 3, loop: false },
      ],
      questions: {
        q1: {
          question: '為什麼兒童特別容易發生這種危險？',
          options: ['兒童體型小不容易被看見', '兒童專注於玩耍忽略交通安全', '以上皆是', '兒童很安全'],
          correctIndex: 2,
        },
        q2: {
          question: '在住宅區或學校附近駕駛時應該？',
          options: ['保持正常速度', '減速慢行，隨時準備煞車', '按喇叭警告', '加速通過'],
          correctIndex: 1,
        },
      },
      feedback: '兒童因體型小且專注於玩耍，容易忽略交通安全。在住宅區、學校附近應減速慢行，隨時準備應對突發狀況。',
      found: false,
    },
  ],

  safeObjects: [
    {
      id: 'safe-1',
      name: '正常行駛車輛',
      position: [-20, 0, 0],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Car1_Rigged.glb',
      behaviors: [
        { type: 'movement', path: [[-20, 0, 0], [20, 0, 0]], speed: 5, loop: true },
      ],
    },
    {
      id: 'safe-2',
      name: '等紅燈行人',
      position: [-6, 0, 6],
      rotation: [0, 0, 0],
      model: '/src/assets/models/Male1_Rigged.glb',
      animationUrls: ['/src/assets/models/animations/Male_Idle_Animation.glb'],
      behaviors: [
        { type: 'animation', animation: 'Armature|mixamo.com|Layer0', animationLoop: true },
      ],
    },
  ],
};
