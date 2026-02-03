import { TrafficLightState } from '../registry/SceneObjectRegistry'

export interface TrafficLightData {
    id: string
    position: [number, number, number]
    rotation: [number, number, number]
    initialState: TrafficLightState
    scale?: [number, number, number]
}

export const trafficLights: TrafficLightData[] = [
    {
        id: "traffic_light_intersection_01",
        position: [14, 0, -60],
        rotation: [0, -Math.PI / 2, 0],
        initialState: "green"
    },
    // Add more traffic lights here
    // {
    //     id: "traffic_light_intersection_02",
    //     position: [0, 0, 0],
    //     rotation: [0, 0, 0],
    //     initialState: "red"
    // }
]
