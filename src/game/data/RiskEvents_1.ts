import { GameEvent, TriggerType, ActionType, ActorType, PlayerResponseType, PrepareActionType } from '../events/EventTypes'

/**
 * Cruise points for the route
 * A--B--C
 * |  |  |
 * D--E--F
 * |  |  |
 * G--H--I
 */
export const cruisePoints: [number, number, number][] = [
    // [10, 0, 120], //起點 
    // [10, 0, 80],
    // [10, 0, 49],
    // [10, 0, 12],
    [10, 0, 0],  //E點
    [10, 0, -60],
    [10, 0, -106],
    [17, 0, -110], //B點右轉
    [52, 0, -110],
    [100.46, 0, -109],
    [108.76, 0, -108.6], //C點右轉
    [110.3, 0, -101.1],
    [109.1, 0, -66.4],
    [109.1, 0, 8],
    [109.1, 0, 85]  //終點
]

// Maintain backwards compatibility
export const points = cruisePoints

/**
 * Risk event scenarios for Route 1
 */
export const events: GameEvent[] = [
    {
        id: 'taxi_roadside_stop',
        name: '計程車路邊臨停',
        description: '計程車打開雙黃燈並靠邊停車，玩家需要減速通過',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [4.5, 0, 95],
            radius: 11,
            // requiredSpeed: {
            //     min: 10 // Only trigger if player is moving (36 km/h)
            // }
        },
        actors: [
            {
                id: 'taxi_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Taxi_Rigged.glb',
                initialPosition: [4.5, 0, 95],
                initialRotation: [0, Math.PI, 0],
            }
        ],
        actions: [
            // Turn on hazard lights immediately
            {
                actorId: 'taxi_1',
                type: ActionType.LIGHT,
                lightType: 'hazard',
                enabled: true,
                blinkRate: 2,
                time: 0,
                duration: 10
            },
            // Move to roadside (slow pull-over)
            {
                actorId: 'taxi_1',
                type: ActionType.MOVEMENT,
                path: [
                    [4.5, 0, 95],
                    [7.7, 0, 91],
                    [9.6, 0, 86],
                    [11, 0, 70]
                ],
                speed: 12,
                time: 0,
                duration: 3
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.DECELERATE,
            targetSpeed: {
                max: 50 // Must slow to under 50 km/h
            },
            validationRadius: 15
        },
        completionCriteria: {
            playerPassed: true, // Player must move away from event
            requireActorPathComplete: true // Taxi must finish movement path
            // maxSpeed: 60 // Player must pass at reasonable speed
        },
        priority: 10,
        prepareConfig: {
            radius: 15, // Start preparing 35m away (trigger is 20m)
            actions: [PrepareActionType.DECELERATE, PrepareActionType.LANE_SWITCH],
            targetSpeedFactor: 0.5,
            laneOffset: -2.5,
            offsetHoldDistance: 5
        },
        spawnRadius: 80
    },
    {
        id: 'parked_car_door_opening',
        name: '路邊停車開門',
        description: '路邊停放的車輛突然打開車門，玩家需準備略偏左避開',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [11, 0, 43.5],
            radius: 12,  //TODO 是否會和prepare衝突
            // requiredSpeed: {
            //     min: 10
            // }
        },
        actors: [
            {
                id: 'parked_car_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Car_Main2_Rigged.glb',
                initialPosition: [11, 0, 43.5],
                initialRotation: [0, Math.PI, 0],
                color: '#2E86AB', // Blue car
                animationUrls: [
                    '/src/assets/animations/car/Car_Main2_LeftDoor_Opening_Animation.glb'
                ]
            },
            {
                id: 'driver_1',
                type: ActorType.PEDESTRIAN,
                model: '/src/assets/models/Male1_Rigged.glb',
                initialPosition: [11, 0, 43.5],
                initialRotation: [0, Math.PI, 0],
                scale: [1, 1, 1],
                animationUrls: [
                    '/src/assets/animations/character/Male_OpenCarLeftDoor_Inside_Animation.glb'
                ]
            }
        ],
        actions: [
            // Just a stationary hazard - could add door opening animation later
            {
                actorId: 'parked_car_1',
                type: ActionType.LIGHT,
                lightType: 'hazard',
                enabled: true,
                blinkRate: 1.5,
                time: 0,
                duration: 8
            },
            {
                actorId: 'parked_car_1',
                type: ActionType.ANIMATION,
                name: 'Car_Main2_LeftDoor_Opening_Animation',
                loop: false,
                time: 0
            },
            {
                actorId: 'driver_1',
                type: ActionType.ANIMATION,
                name: 'Take 001.008',
                loop: false,
                time: 0
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.AVOID,
            validationRadius: 12
        },
        completionCriteria: {
            playerPassed: true
        },
        priority: 8,
        prepareConfig: {
            radius: 15, // Start preparing 25m away (trigger is 18m)
            actions: [PrepareActionType.DECELERATE, PrepareActionType.LANE_SWITCH],
            targetSpeedFactor: 0.4,
            laneOffset: -3.0, // Shift left to avoid door
            offsetHoldDistance: 10 // Maintain offset for 15m after passing trigger
        },
        spawnRadius: 80 // Pre-spawn actors 50m away for smooth visual experience
    },
    {
        id: 'bus_roadside_stop',
        name: '公車外拋後靠站',
        description: '右前方公車準備靠站，會先向左外拋，再向右切入站位停靠，玩家需要通過或跟隨減速',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [9.5, 0, 20],
            radius: 15,
            // requiredSpeed: {
            //     min: 10 // Only trigger if player is moving (36 km/h)
            // }
        },
        actors: [
            {
                id: 'bus_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Bus_Rigged.glb',
                initialPosition: [9.5, 0, 20],
                initialRotation: [0, Math.PI, 0],
                // color: '#FFD700' // Gold color for taxi
            }
        ],
        actions: [
            // Turn on hazard lights immediately
            {
                actorId: 'bus_1',
                type: ActionType.LIGHT,
                lightType: 'turnRight',
                enabled: true,
                blinkRate: 2,
                time: 0,
                duration: 10
            },
            // Move to roadside (slow pull-over)
            {
                actorId: 'bus_1',
                type: ActionType.MOVEMENT,
                path: [
                    [9.5, 0, 20],
                    [8.14, 0, 14.25],
                    [7.89, 0, 12.06],
                    [9.35, 0, 9.4],
                    [11.92, 0, 8.5],
                    [18.34, 0, 7.8],
                    [48.2, 0, 8.35]
                ],
                speed: 8,
                time: 0,
                duration: 3
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.DECELERATE,
            targetSpeed: {
                max: 50 // Must slow to under 50 km/h
            },
            validationRadius: 15
        },
        completionCriteria: {
            playerPassed: true,
            requireActorPathComplete: true // Bus must finish movement path
            // maxSpeed: 60 // Player must pass at reasonable speed
        },
        priority: 10,
        prepareConfig: {
            radius: 18, // Start preparing 35m away (trigger is 20m)
            actions: [PrepareActionType.DECELERATE],
            targetSpeedFactor: 0.3
        },
        spawnRadius: 100
    },
    {
        id: 'car_distracted_turning',
        name: '前車左右晃（分心找路）及路口轉向',
        description: '前車左右晃（分心找路）及路口轉向，玩家需要保持安全距離',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [8.5, 0, -35],
            radius: 20,
            // requiredSpeed: {
            //     min: 10 // Only trigger if player is moving (36 km/h)
            // }
        },
        actors: [
            {
                id: 'car_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Car2_Rigged.glb',
                initialPosition: [8.5, 0, -35],
                initialRotation: [0, Math.PI, 0],
                color: '#FFD700' // Gold color for taxi
            }
        ],
        actions: [
            {
                actorId: 'car_1',
                type: ActionType.LIGHT,
                lightType: 'turnLeft',
                enabled: true,
                blinkRate: 2,
                time: 4,
                duration: 10
            },
            {
                actorId: 'car_1',
                type: ActionType.MOVEMENT,
                path: [
                    [8.5, 0, -35],
                    [9.9, 0, -45],
                    [9.1, 0, -50],
                    [8.3, 0, -75],
                    [5.07, 0, -86],
                    [2.72, 0, -106],
                    [-2.55, 0, -110.9],
                    [-19.8, 0, -111.9]
                ],
                speed: 8,
                time: 0,
                duration: 3
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.DECELERATE,
            targetSpeed: {
                max: 50 // Must slow to under 50 km/h
            },
            validationRadius: 15
        },
        completionCriteria: {
            playerPassed: true,
            requireActorPathComplete: true // Car must finish movement path
            // maxSpeed: 60 // Player must pass at reasonable speed
        },
        priority: 10,
        prepareConfig: {
            radius: 25, // Start preparing 35m away (trigger is 20m)
            actions: [PrepareActionType.DECELERATE],
            targetSpeedFactor: 0.5
        },
        spawnRadius: 80
    },
    {
        id: 'pedestrian_crossing',
        name: '行人穿越道路',
        description: '行人從路邊穿越道路，玩家需要減速或停車',
        trigger: {
            type: TriggerType.PROXIMITY,
            // position: [50, 0, -106.8],
            position: [41.62, 0, -106.4],
            radius: 15,
            // requiredSpeed: {
            //     min: 5
            // }
        },
        actors: [
            {
                id: 'pedestrian_1',
                type: ActorType.PEDESTRIAN,
                model: '/src/assets/models/Male1_Rigged.glb',
                initialPosition: [50, 0, -106.8],
                initialRotation: [0, Math.PI, 0],
                scale: [1, 1, 1],
                animationUrls: [
                    '/src/assets/animations/character/Male_Walking_Remain_Animation.glb'
                ]
            }
        ],
        actions: [
            // Walk across the road
            {
                actorId: 'pedestrian_1',
                type: ActionType.MOVEMENT,
                path: [
                    [50, 0, -106.8],
                    [50.5, 0, -110.67],
                    [50.75, 0, -118.3],
                    [50.66, 0, -125.55]
                ],
                speed: 4,
                time: 0,
                duration: 8
            },
            // Add walking animation when animation system is integrated
            {
                actorId: 'pedestrian_1',
                type: ActionType.ANIMATION,
                // name: 'Male_Walking_Animation',
                name: 'Take 001',
                loop: true,
                time: 0
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.DECELERATE,
            targetSpeed: {
                max: 30 // Must slow significantly
            },
            validationRadius: 20
        },
        completionCriteria: {
            playerPassed: true,
            requireActorPathComplete: true // Pedestrian must finish crossing
            // maxSpeed: 40
        },
        priority: 13, // Higher priority than taxi event
        prepareConfig: {
            radius: 11, // Start preparing 25m away (trigger is 20m)
            actions: [PrepareActionType.DECELERATE],
            targetSpeedFactor: 0.3,
            // stopDuration: 3 // 停等 3 秒後繼續
        },
        spawnRadius: 80
    },
    {
        id: 'pedestrian_crossing_intersection',
        name: '行人穿越路口斑馬線',
        description: '雙黃燈號誌路口及行人穿越斑馬線，玩家需禮讓停等',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [105.9, 0, -104.9],
            radius: 8,
            // requiredSpeed: {
            //     min: 5
            // }
        },
        actors: [
            {
                id: 'intersection_pedestrian_1',
                type: ActorType.PEDESTRIAN,
                model: '/src/assets/models/Male2_Rigged.glb',
                initialPosition: [105.9, 0, -104.9],
                initialRotation: [0, Math.PI / 2, 0],
                scale: [1, 1, 1],
                animationUrls: [
                    '/src/assets/animations/character/Male_Walking_Remain_Animation.glb'
                ]
            }
        ],
        actions: [
            // // 事件觸發時：設定紅綠燈為雙黃閃爍
            // {
            //     actorId: '_scene',
            //     type: ActionType.SCENE_OBJECT,
            //     objectId: 'traffic_light_intersection_01',
            //     command: 'setState',
            //     params: { state: 'flashing_yellow' },
            //     time: 0
            // } as any,
            // 行人開始穿越（初始站立姿勢，觸發後開始走）
            {
                actorId: 'intersection_pedestrian_1',
                type: ActionType.ANIMATION,
                name: 'Take 001',
                loop: true,
                time: 0
            },
            // 行人移動路徑
            {
                actorId: 'intersection_pedestrian_1',
                type: ActionType.MOVEMENT,
                path: [
                    [105.9, 0, -104.9],
                    [115.77, 0, -104.66],
                    [127, 0, -104.9]
                ],
                speed: 2.5,
                time: 0,
                duration: 10
            },
            // // 行人通過後：恢復紅綠燈為關閉
            // {
            //     actorId: '_scene',
            //     type: ActionType.SCENE_OBJECT,
            //     objectId: 'traffic_light_intersection_01',
            //     command: 'setState',
            //     params: { state: 'off' },
            //     time: 10
            // } as any
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.STOP,
            // targetSpeed: {
            //     max: 5 // 必須幾乎停止
            // },
            validationRadius: 15
        },
        completionCriteria: {
            playerPassed: true,
            requireActorPathComplete: true // Pedestrian must finish crossing
            // maxSpeed: 30
        },
        priority: 20, // 高優先級
        prepareConfig: {
            radius: 8,
            actions: [PrepareActionType.DECELERATE, PrepareActionType.STOP],
            targetSpeedFactor: 0.5,
            stopDuration: 2 // 停等 2 秒讓行人通過
        },
        spawnRadius: 80
    },
    {
        id: 'oncoming_car_turn',
        name: '對向來車打燈準備迴轉',
        description: '對向來車打燈準備迴轉（跨入主角車道），玩家需要通過或跟隨減速',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [117.6, 0, -71],
            radius: 22,
            // requiredSpeed: {
            //     min: 10 // Only trigger if player is moving (36 km/h)
            // }
        },
        actors: [
            {
                id: 'oncoming_car_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Car1_Rigged.glb',
                initialPosition: [117.6, 0, -71],
                initialRotation: [0, Math.PI, 0],
            }
        ],
        actions: [
            // 左轉燈：迴轉階段
            {
                actorId: 'oncoming_car_1',
                type: ActionType.LIGHT,
                lightType: 'turnLeft',
                enabled: true,
                blinkRate: 2,
                time: 0,
                duration: 2.5  // 左轉燈持續 2.5 秒（迴轉期間）
            },
            // 右轉燈：準備右轉離場
            {
                actorId: 'oncoming_car_1',
                type: ActionType.LIGHT,
                lightType: 'turnRight',
                enabled: true,
                blinkRate: 2,
                time: 3,      // 在左轉燈結束後開始
                duration: 6   // 右轉燈持續到離場
            },
            // Move to roadside (slow pull-over)
            {
                actorId: 'oncoming_car_1',
                type: ActionType.MOVEMENT,
                path: [
                    [117.6, 0, -71],
                    [116.06, 0, -72.05],
                    [113.45, 0, -72],
                    [110.69, 0, -67],
                    [109.16, 0, -59.25],
                    [109.7, 0, -48.5],
                    [110.91, 0, -13.91], //準備右轉離場
                    [110.18, 0, -9.87],
                    [106.79, 0, -7.91],
                    [43.26, 0, -8.3]
                ],
                speed: 15,
                time: 0,
                duration: 3
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.DECELERATE,
            targetSpeed: {
                max: 50 // Must slow to under 50 km/h
            },
            validationRadius: 15
        },
        completionCriteria: {
            playerPassed: true,
            requireActorPathComplete: true // Oncoming car must finish U-turn
            // maxSpeed: 60 // Player must pass at reasonable speed
        },
        priority: 10,
        prepareConfig: {
            radius: 25, // Start preparing 35m away (trigger is 20m)
            actions: [PrepareActionType.DECELERATE],
            targetSpeedFactor: 0.5,
            stopDuration: 3
        },
        spawnRadius: 90
    },
    {
        id: 'bicycle_dodging_pothole',
        name: '自行車突然偏移（閃坑洞靠向主角）',
        description: '自行車突然偏移，玩家需要拉開側向距離，避免與自行車並行貼近',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [107.5, 0, 28],
            radius: 5,
            // requiredSpeed: {
            //     min: 10 // Only trigger if player is moving (36 km/h)
            // }
        },
        actors: [
            {
                id: 'bicycle_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Bicycle1_Rigged.glb',
                initialPosition: [107.5, 0, 36],
                initialRotation: [0, 0, 0],
                // color: '#FFD700',
                animationUrls: [
                    '/src/assets/animations/car/Bicycle_Moving_Animation.glb'
                ]
            },
            {
                id: 'rider_1',
                type: ActorType.PEDESTRIAN,
                model: '/src/assets/models/Male1_Rigged.glb',
                initialPosition: [107.5, 0, 36],
                initialRotation: [0, 0, 0],
                scale: [1, 1, 1],
                animationUrls: [
                    '/src/assets/animations/character/Male_Riding_Bicycle_Animation.glb'
                ]
            },
            {
                id: 'object_1',
                type: ActorType.OBJECT,
                model: '/src/assets/models/objects/Pothole1_light.glb',
                initialPosition: [108.6, 0.03, 46.75],
                initialRotation: [0, Math.PI / 2, 0],
                scale: [1, 1, 1]
            }
        ],
        actions: [
            // Move to roadside (slow pull-over)
            {
                actorId: 'bicycle_1',
                type: ActionType.MOVEMENT,
                path: [
                    [107.5, 0, 36],
                    [108.3, 0, 41],
                    [110.3, 0, 44],
                    [110.44, 0, 49.95],
                    [109.13, 0, 53.19],
                    [107.5, 0, 60]
                ],
                speed: 5,
                time: 0,
                duration: 3
            },
            {
                actorId: 'rider_1',
                type: ActionType.MOVEMENT,
                path: [
                    [107.5, 0, 36],
                    [108.3, 0, 41],
                    [110.3, 0, 44],
                    [110.44, 0, 49.95],
                    [109.13, 0, 53.19],
                    [107.5, 0, 60]
                ],
                speed: 5,
                time: 0,
                duration: 3
            },
            {
                actorId: 'bicycle_1',
                type: ActionType.ANIMATION,
                name: 'Bicycle_Moving_Animation',
                loop: true,
                time: 0
            },
            {
                actorId: 'rider_1',
                type: ActionType.ANIMATION,
                name: 'Take 001',
                loop: true,
                time: 0
            }
        ],
        requiredPlayerResponse: {
            type: PlayerResponseType.DECELERATE,
            targetSpeed: {
                max: 50 // Must slow to under 50 km/h
            },
            validationRadius: 15
        },
        completionCriteria: {
            playerPassed: true,
            requireActorPathComplete: true // Bicycle and rider must finish movement
            // maxSpeed: 60 // Player must pass at reasonable speed
        },
        priority: 10,
        prepareConfig: {
            radius: 15, // Start preparing 35m away (trigger is 20m)
            actions: [PrepareActionType.DECELERATE],
            targetSpeedFactor: 0.2
        },
        spawnRadius: 120
    },
]
