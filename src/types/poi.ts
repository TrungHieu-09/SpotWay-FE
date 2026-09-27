export type PoiType = 'entrance' | 'shop' | 'service' | 'custom'

export type Poi = {
  id: string
  floorId: string
  name: string
  type: PoiType
  /** 0-100, percentage on the floor plan width. Not a pixel value. */
  x: number
  /** 0-100, percentage on the floor plan height. Not a pixel value. */
  y: number
}

