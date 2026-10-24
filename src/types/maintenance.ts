export type MaintenanceZone = {
  id: string
  floorId: string
  name: string
  reason: string
  rect: { x: number; y: number; w: number; h: number }
  active: boolean
  createdAt: string
}
