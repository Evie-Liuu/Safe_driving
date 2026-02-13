import { PatrolScenario, ActionType, ActorType, TrafficLightState } from '../types';

/**
 * 紅綠燈路口場景範例
 * 展示紅綠燈系統的使用和與車輛行為的協調
 */
export const patrolScenarioWithTrafficLights: PatrolScenario = {
  id: 'scenario-traffic-lights',
  name: '紅綠燈路口場景',
  description: '觀察紅綠燈路口的交通行為，找出違規車輛',
  timeLimit: 600,
  maxLives: 3,

  scene: {
    environment: 'city-intersection',
    cameraPosition: [0, 20, 35],
    cameraLookAt: [0, 0, 0],
  },

  // ========== 紅綠燈定義 ==========
  trafficLights: [
    {
      id: 'traffic_light_north',
      name: '北向紅綠燈',
      model: '/src/assets/models/TrafficLight.glb',
      position: [-8, 0, -15],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],

      // 燈號時間表（30秒循環）
      lightSchedule: [
        { time: 0, state: TrafficLightState.RED, duration: 15 },
        { time: 15, state: TrafficLightState.GREEN, duration: 12 },
        { time: 27, state: TrafficLightState.YELLOW, duration: 3 },
      ],
      loopSchedule: true,
    },
    // {
    //   id: 'traffic_light_south',
    //   name: '南向紅綠燈',
    //   model: '/src/assets/models/TrafficLight.glb',
    //   position: [8, 0, 15],
    //   rotation: [0, Math.PI, 0],

    //   // 與北向相反（錯開15秒）
    //   lightSchedule: [
    //     { time: 0, state: TrafficLightState.GREEN, duration: 12 },
    //     { time: 12, state: TrafficLightState.YELLOW, duration: 3 },
    //     { time: 15, state: TrafficLightState.RED, duration: 15 },
    //   ],
    //   loopSchedule: true,
    // },
  ],

  // ========== 危險因子：闖紅燈 ==========
  dangers: [
    {
      id: 'danger-red-light',
      name: '機車闖紅燈',
      description: '機車在紅燈時未停等，直接通過路口',
      replayInterval: 35,

      actors: [
        {
          id: 'scooter_violation',
          name: '闖紅燈機車',
          type: ActorType.SCOOTER,
          model: '/src/assets/models/Scooter2_Rigged.glb',
          initialPosition: [-20, 0, -15],
          initialRotation: [0, Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Scooter_Moving_Animation.glb'],
        },
        {
          id: 'scooter_driver',
          name: '騎士',
          type: ActorType.PEDESTRIAN,
          model: '/src/assets/models/Male2_CnH_Rigged.glb',
          initialPosition: [-20, 0, -15],
          initialRotation: [0, Math.PI / 2, 0],
          accessoryNames: ['helmet'],
          animationUrls: ['/src/assets/animations/character/Male_Riding_Scooter_Animation.glb'],
        },
      ],

      actions: [
        {
          actorId: 'scooter_violation',
          type: ActionType.ANIMATION,
          name: 'Scooter_Moving_Animation',
          time: 2,
          loop: true,
        },
        {
          actorId: 'scooter_driver',
          type: ActionType.ANIMATION,
          name: 'Male_Riding_Scooter_Animation',
          time: 2,
          loop: true,
        },
        {
          actorId: 'scooter_violation',
          type: ActionType.MOVEMENT,
          path: [
            [-20, 0, -15],
            [-8, 0, -15],
            [20, 0, -15],
          ],
          speed: 12,
          time: 2,
        },
        {
          actorId: 'scooter_driver',
          type: ActionType.MOVEMENT,
          path: [
            [-20, 0, -15],
            [-8, 0, -15],
            [20, 0, -15],
          ],
          speed: 12,
          time: 2,
        },
      ],

      questions: {
        q1: {
          question: '這台機車違反了什麼規則？',
          options: ['超速', '闖紅燈', '未打燈', '逆向'],
          correctIndex: 1,
        },
        q2: {
          question: '紅燈時應該怎麼做？',
          options: ['加速通過', '在停止線前停車', '減速慢行', '按喇叭'],
          correctIndex: 1,
        },
      },

      feedback: [
        '危險原因：闖紅燈容易與綠燈方向車輛碰撞。',
        '安全行為：紅燈必須停車，綠燈才能通行。',
      ],
      found: false,
    },
  ],

  // ========== 安全物件：遵守號誌的車輛 + 裝飾 ==========
  safeObjects: [
    {
      id: 'safe-car',
      name: '等紅燈的汽車',
      actors: [
        {
          id: 'car_waiting',
          name: '汽車',
          type: ActorType.VEHICLE,
          model: '/src/assets/models/Car1_Rigged.glb',
          initialPosition: [20, 0, 15],
          initialRotation: [0, -Math.PI / 2, 0],
          animationUrls: ['/src/assets/animations/car/Car1_Moving_Animation.glb'],
        },
      ],
      actions: [
        {
          actorId: 'car_waiting',
          type: ActionType.ANIMATION,
          name: 'Car1_Moving_Animation',
          time: 0,
          duration: 3,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.MOVEMENT,
          path: [
            [20, 0, 15],
            [10, 0, 15],
          ],
          speed: 8,
          time: 0,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.WAIT,
          time: 3,
          duration: 12,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.ANIMATION,
          name: 'Car1_Moving_Animation',
          time: 15,
          loop: true,
        },
        {
          actorId: 'car_waiting',
          type: ActionType.MOVEMENT,
          path: [
            [10, 0, 15],
            [-20, 0, 15],
          ],
          speed: 8,
          time: 15,
        },
      ],
      replayInterval: 5,
    },

    // ========== 長椅裝飾物件 ==========
    {
      id: 'bench_1',
      name: '路邊長椅',
      actors: [
        {
          id: 'bench_actor_1',
          name: '長椅',
          type: ActorType.OBJECT,
          model: '/src/assets/models/Bench.glb',
          initialPosition: [-25, 0, -20],
          initialRotation: [0, Math.PI / 2, 0],
        },
      ],
      actions: [],
    },
    {
      id: 'bench_2',
      name: '路邊長椅2',
      actors: [
        {
          id: 'bench_actor_2',
          name: '長椅',
          type: ActorType.OBJECT,
          model: '/src/assets/models/Bench.glb',
          initialPosition: [25, 0, 20],
          initialRotation: [0, -Math.PI / 2, 0],
        },
      ],
      actions: [],
    },
  ],
};
