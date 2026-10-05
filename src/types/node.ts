export type Node = {
  id: string
  floorId: string
  /** 0-100, percentage on the floor plan width. Not a pixel value. */
  x: number
  /** 0-100, percentage on the floor plan height. Not a pixel value. */
  y: number
  isElevatorLink?: boolean
  elevatorGroupId?: string | null
}

export type UpdateNodePayload = Partial<{
  x: number
  y: number
  isElevatorLink: boolean
  elevatorGroupId: string | null
}>
