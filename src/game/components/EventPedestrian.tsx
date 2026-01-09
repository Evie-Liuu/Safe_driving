import { forwardRef } from 'react'
import { EventActor, EventActorHandle } from './EventActor'
import { EventActor as EventActorType } from '../events/EventTypes'

interface EventPedestrianProps extends EventActorType {
    onComplete?: () => void
    enableDebug?: boolean
}

/**
 * Specialized event actor for pedestrians
 * Includes pedestrian-specific behaviors like walking, crossing, etc.
 */
export const EventPedestrian = forwardRef<EventActorHandle, EventPedestrianProps>(
    (props, ref) => {
        return <EventActor ref={ref} {...props} />
    }
)

EventPedestrian.displayName = 'EventPedestrian'
