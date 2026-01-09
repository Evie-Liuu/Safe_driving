import { forwardRef } from 'react'
import { EventActor, EventActorHandle } from './EventActor'
import { EventActor as EventActorType } from '../events/EventTypes'

interface EventVehicleProps extends EventActorType {
    onComplete?: () => void
    enableDebug?: boolean
}

/**
 * Specialized event actor for vehicles
 * Includes vehicle-specific behaviors like hazard lights, turn signals, etc.
 */
export const EventVehicle = forwardRef<EventActorHandle, EventVehicleProps>(
    (props, ref) => {
        return <EventActor ref={ref} {...props} />
    }
)

EventVehicle.displayName = 'EventVehicle'
