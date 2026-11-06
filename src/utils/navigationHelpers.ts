import type { PublicFloor, PublicFloorMap, PublicNode, PublicSearchResult } from '../types/navigation'

export const floorLevelsOf = (floors: PublicFloor[]) => Object.fromEntries(floors.map((floor) => [floor.id, floor.floorNumber]))
export const floorNamesOf = (floors: PublicFloor[]) => Object.fromEntries(floors.map((floor) => [floor.id, `Tầng ${floor.floorNumber}`]))
export const calibrationOf = (floors: PublicFloor[], key: 'mapUnitsPerMeter' | 'northOffsetDegrees') => Object.fromEntries(floors.flatMap((floor) => typeof floor[key] === 'number' ? [[floor.id, floor[key] as number]] : []))
export const allNodesOf = (maps: Record<string, PublicFloorMap>) => Object.values(maps).flatMap((map) => map.nodes)

export function nodesWithPoiExits(maps: Record<string, PublicFloorMap>): PublicNode[] {
  const exitAnchors = new Set(Object.values(maps).flatMap((map) => map.pois).filter((poi) => poi.category.toUpperCase() === 'EXIT').map((poi) => poi.nodeId))
  return allNodesOf(maps).map((node) => exitAnchors.has(node.id) && !['EXIT', 'EMERGENCY_EXIT', 'ELEVATOR', 'STAIR', 'ESCALATOR'].includes(node.type) ? { ...node, type: 'EXIT' } : node)
}

export const sortFloors = (floors: PublicFloor[]) => [...floors].sort((left, right) => left.floorNumber - right.floorNumber)
export function pickDefaultStart(floors: PublicFloor[], nodes: PublicNode[]) { const ground = sortFloors(floors)[0]; const choices = nodes.filter((node) => node.floorId === ground?.id); return (choices.find((node) => node.type === 'DOOR') ?? choices[0] ?? nodes[0])?.id }
export function pickDestination(destinations: PublicSearchResult[], floorId: string | undefined, keywords: string[]) { const matches = destinations.filter((item) => item.floorId === floorId); return matches.find((item) => keywords.some((keyword) => item.name.toLowerCase().includes(keyword))) ?? matches[0] }
