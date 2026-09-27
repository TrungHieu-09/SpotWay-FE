export type PoiType = 'entrance' | 'shop' | 'service' | 'custom'

export type Poi = {
  id: string
  floorId: string
  name: string
  type: PoiType
  xPercent: number
  yPercent: number
}

