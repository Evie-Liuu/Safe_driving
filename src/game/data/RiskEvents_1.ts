import { GameEvent, TriggerType, ActionType, ActorType, PlayerResponseType, PrepareActionType } from '../events/EventTypes'

/**
 * Cruise points for the route
 */
export const cruisePoints: [number, number, number][] = [
    // [10, 0, 120], //起點
    // [10, 0, 80],
    // [10, 0, 49],
    // [10, 0, 12],
    [10, 0, 0],
    [10, 0, -60],
    [10, 0, -106],
    [17, 0, -110], //右轉彎
    [52, 0, -110],
    [100.46, 0, -109],

    // [1, 0, -49],
    // [2, 0, -125],
]

// Maintain backwards compatibility
export const points = cruisePoints

/**
 * Risk event scenarios for Route 1
 */
export const events: GameEvent[] = [
    {
        id: 'parked_car_door_opening',
        name: '路邊停車開門',
        description: '路邊停放的車輛突然打開車門',
        trigger: {
            type: TriggerType.PROXIMITY,
            position: [10, 0, -60],
            radius: 18,
            requiredSpeed: {
                min: 10
            }
        },
        actors: [
            {
                id: 'parked_car_1',
                type: ActorType.VEHICLE,
                model: '/src/assets/models/Car_Main_Rigged.glb',
                initialPosition: [10, 0, -60],
                initialRotation: [0, -Math.PI, 0],
                color: '#2E86AB', // Blue car
                animationUrls: [
                    '/src/assets/animations/car/Car_Main_LeftDoor_Opening_Animation.glb'
                ]
            },
            // {
            //     id: 'driver_1',
            //     type: ActorType.PEDESTRIAN,
            //     model: '/src/assets/models/Male1_Rigged.glb',
            //     initialPosition: [8, 0, -65],
            //     initialRotation: [0, -Math.PI / 2, 0],
            //     scale: [1, 1, 1],
            //     animationUrls: [
            //         '/src/assets/animations/character/Male_Walking_Remain_Animation.glb'
            //     ]
            // }
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
                name: 'Take 001.016',
                loop: true,
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
            radius: 25, // Start preparing 30m away (trigger is 18m)
            actions: [PrepareActionType.DECELERATE, PrepareActionType.LANE_SWITCH],
            targetSpeedFactor: 0.5,
            laneOffset: -6.5 // Shift left 1.5m to avoid door
        }
    },
    // {
    //     id: 'taxi_roadside_stop',
    //     name: '計程車路邊臨停',
    //     description: '計程車打開雙黃燈並靠邊停車，玩家需要減速通過',
    //     trigger: {
    //         type: TriggerType.PROXIMITY,
    //         position: [5, 0, -30],
    //         radius: 20,
    //         requiredSpeed: {
    //             min: 10 // Only trigger if player is moving (36 km/h)
    //         }
    //     },
    //     actors: [
    //         {
    //             id: 'taxi_1',
    //             type: ActorType.VEHICLE,
    //             model: '/src/assets/models/ferrari.glb', // Using ferrari as taxi model for now
    //             initialPosition: [5, 0, -30],
    //             initialRotation: [0, 0, 0],
    //             color: '#FFD700' // Gold color for taxi
    //         }
    //     ],
    //     actions: [
    //         // Turn on hazard lights immediately
    //         {
    //             actorId: 'taxi_1',
    //             type: ActionType.LIGHT,
    //             lightType: 'hazard',
    //             enabled: true,
    //             blinkRate: 2,
    //             time: 0,
    //             duration: 10
    //         },
    //         // Move to roadside (slow pull-over)
    //         {
    //             actorId: 'taxi_1',
    //             type: ActionType.MOVEMENT,
    //             path: [
    //                 [5, 0, -30],
    //                 [4, 0, -32],
    //                 [3.5, 0, -33]
    //             ],
    //             speed: 3,
    //             time: 0.5,
    //             duration: 3
    //         }
    //     ],
    //     requiredPlayerResponse: {
    //         type: PlayerResponseType.DECELERATE,
    //         targetSpeed: {
    //             max: 50 // Must slow to under 50 km/h
    //         },
    //         validationRadius: 15
    //     },
    //     completionCriteria: {
    //         playerPassed: true,
    //         maxSpeed: 60 // Player must pass at reasonable speed
    //     },
    //     priority: 10,
    //     prepareConfig: {
    //         radius: 35, // Start preparing 35m away (trigger is 20m)
    //         actions: [PrepareActionType.DECELERATE],
    //         targetSpeedFactor: 0.5
    //     }
    // },
    // {
    //     id: 'pedestrian_crossing',
    //     name: '行人穿越道路',
    //     description: '行人從路邊穿越道路，玩家需要減速或停車',
    //     trigger: {
    //         type: TriggerType.PROXIMITY,
    //         position: [8, 0, -65],
    //         radius: 20,
    //         requiredSpeed: {
    //             min: 5
    //         }
    //     },
    //     actors: [
    //         {
    //             id: 'pedestrian_1',
    //             type: ActorType.PEDESTRIAN,
    //             model: '/src/assets/models/Male1_Rigged.glb',
    //             initialPosition: [8, 0, -65],
    //             initialRotation: [0, -Math.PI / 2, 0],
    //             scale: [1, 1, 1],
    //             animationUrls: [
    //                 '/src/assets/animations/character/Male_Walking_Remain_Animation.glb'
    //             ]
    //         }
    //     ],
    //     actions: [
    //         // Walk across the road
    //         {
    //             actorId: 'pedestrian_1',
    //             type: ActionType.MOVEMENT,
    //             path: [
    //                 [8, 0, -65],
    //                 [4, 0, -65],
    //                 [0, 0, -65],
    //                 [-4, 0, -65]
    //             ],
    //             speed: 1.5,
    //             time: 0,
    //             duration: 8
    //         },
    //         // Add walking animation when animation system is integrated
    //         {
    //             actorId: 'pedestrian_1',
    //             type: ActionType.ANIMATION,
    //             // name: 'Male_Walking_Animation',
    //             name: 'Take 001',
    //             loop: true,
    //             time: 0
    //         }
    //     ],
    //     requiredPlayerResponse: {
    //         type: PlayerResponseType.DECELERATE,
    //         targetSpeed: {
    //             max: 30 // Must slow significantly
    //         },
    //         validationRadius: 20
    //     },
    //     completionCriteria: {
    //         playerPassed: true,
    //         maxSpeed: 40
    //     },
    //     priority: 15, // Higher priority than taxi event
    //     prepareConfig: {
    //         radius: 25, // Start preparing 40m away (trigger is 25m)
    //         actions: [PrepareActionType.DECELERATE],
    //         targetSpeedFactor: 0.3
    //     }
    // },
]
