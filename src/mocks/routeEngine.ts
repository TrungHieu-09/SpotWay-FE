import type { Floor } from '../types/floor'
import type { FloorGeometry, Point } from '../types/geometry'
import type { Edge, Node } from '../types/node'
import type {
  Destination,
  RouteResult,
  RouteSegment,
  RouteStep,
} from '../types/route'

const WALKING_SPEED_MPS = 1.2
const ELEVATOR_SECONDS = 10

type GraphLink = {
  toNodeId: string
  floorId: string
  type: 'walk' | 'elevator'
  distance: number
  seconds: number
}

type PreviousLink = {
  nodeId: string
  link: GraphLink
}

type RouteContext = {
  floors: Floor[]
  geometries: FloorGeometry[]
  nodes: Node[]
  edges: Edge[]
}

function round(value: number, fractionDigits = 1) {
  return Number(value.toFixed(fractionDigits))
}

function getGeometry(geometries: FloorGeometry[], floorId: string) {
  return geometries.find((geometry) => geometry.floorId === floorId)
}

function distanceMeters(
  fromNode: Node,
  toNode: Node,
  geometries: FloorGeometry[],
) {
  const geometry = getGeometry(geometries, fromNode.floorId)
  const realWidthM = geometry?.realWidthM ?? 60
  const realHeightM = geometry?.realHeightM ?? 38
  const dx = ((toNode.x - fromNode.x) / 100) * realWidthM
  const dy = ((toNode.y - fromNode.y) / 100) * realHeightM
  return Math.hypot(dx, dy)
}

function bearingDegrees(fromNode: Node, toNode: Node) {
  const dx = toNode.x - fromNode.x
  const dy = toNode.y - fromNode.y
  return (Math.atan2(dx, -dy) * 180) / Math.PI + 360
}

function normalizeBearing(bearing: number) {
  return round(bearing % 360, 0)
}

function signedBearingDiff(fromBearing: number, toBearing: number) {
  return ((toBearing - fromBearing + 540) % 360) - 180
}

function walkingInstruction(
  distance: number,
  previousBearing: number | null,
  nextBearing: number,
) {
  if (previousBearing === null) {
    return `Đi thẳng ${round(distance)} m`
  }

  const diff = signedBearingDiff(previousBearing, nextBearing)
  const absDiff = Math.abs(diff)

  if (absDiff < 25) {
    return `Đi thẳng ${round(distance)} m`
  }

  if (absDiff > 135) {
    return `Quay đầu rồi đi ${round(distance)} m`
  }

  return `${diff > 0 ? 'Rẽ phải' : 'Rẽ trái'} rồi đi ${round(distance)} m`
}

function buildGraph(context: RouteContext) {
  const nodeById = new Map(context.nodes.map((node) => [node.id, node]))
  const graph = new Map<string, GraphLink[]>()

  function addLink(fromNodeId: string, link: GraphLink) {
    const links = graph.get(fromNodeId) ?? []
    links.push(link)
    graph.set(fromNodeId, links)
  }

  for (const edge of context.edges) {
    if (edge.accessible === false) {
      continue
    }

    const fromNode = nodeById.get(edge.fromNodeId)
    const toNode = nodeById.get(edge.toNodeId)
    if (!fromNode || !toNode || fromNode.floorId !== toNode.floorId) {
      continue
    }

    const distance = distanceMeters(fromNode, toNode, context.geometries)
    const seconds = distance / WALKING_SPEED_MPS
    const link = {
      floorId: edge.floorId,
      type: 'walk' as const,
      distance,
      seconds,
    }

    addLink(fromNode.id, { ...link, toNodeId: toNode.id })
    addLink(toNode.id, { ...link, toNodeId: fromNode.id })
  }

  const elevatorNodesByGroup = new Map<string, Node[]>()
  for (const node of context.nodes) {
    if (!node.isElevatorLink || !node.elevatorGroupId) {
      continue
    }

    const group = elevatorNodesByGroup.get(node.elevatorGroupId) ?? []
    group.push(node)
    elevatorNodesByGroup.set(node.elevatorGroupId, group)
  }

  for (const group of elevatorNodesByGroup.values()) {
    for (const fromNode of group) {
      for (const toNode of group) {
        if (fromNode.id === toNode.id) {
          continue
        }

        addLink(fromNode.id, {
          toNodeId: toNode.id,
          floorId: fromNode.floorId,
          type: 'elevator',
          distance: 0,
          seconds: ELEVATOR_SECONDS,
        })
      }
    }
  }

  return graph
}

function findPath(context: RouteContext, fromNodeId: string, toNodeId: string) {
  const graph = buildGraph(context)
  const distances = new Map<string, number>()
  const previous = new Map<string, PreviousLink>()
  const unvisited = new Set(context.nodes.map((node) => node.id))

  for (const nodeId of unvisited) {
    distances.set(nodeId, Number.POSITIVE_INFINITY)
  }
  distances.set(fromNodeId, 0)

  while (unvisited.size > 0) {
    let currentNodeId: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY
      if (distance < currentDistance) {
        currentDistance = distance
        currentNodeId = nodeId
      }
    }

    if (!currentNodeId || currentDistance === Number.POSITIVE_INFINITY) {
      break
    }

    if (currentNodeId === toNodeId) {
      break
    }

    unvisited.delete(currentNodeId)
    for (const link of graph.get(currentNodeId) ?? []) {
      if (!unvisited.has(link.toNodeId)) {
        continue
      }

      const nextDistance = currentDistance + link.seconds
      if (nextDistance < (distances.get(link.toNodeId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(link.toNodeId, nextDistance)
        previous.set(link.toNodeId, { nodeId: currentNodeId, link })
      }
    }
  }

  if (!previous.has(toNodeId) && fromNodeId !== toNodeId) {
    return null
  }

  const nodeIds = [toNodeId]
  const links: GraphLink[] = []
  let currentNodeId = toNodeId

  while (currentNodeId !== fromNodeId) {
    const previousLink = previous.get(currentNodeId)
    if (!previousLink) {
      return null
    }

    links.unshift(previousLink.link)
    currentNodeId = previousLink.nodeId
    nodeIds.unshift(currentNodeId)
  }

  return { nodeIds, links }
}

function buildSegments(pathNodes: Node[], links: GraphLink[]): RouteSegment[] {
  const segments: RouteSegment[] = []
  let currentSegment: RouteSegment | null = null

  for (let index = 0; index < links.length; index += 1) {
    const fromNode = pathNodes[index]
    const toNode = pathNodes[index + 1]
    const link = links[index]

    if (link.type === 'elevator') {
      currentSegment = null
      continue
    }

    const fromPoint: Point = { x: fromNode.x, y: fromNode.y }
    const toPoint: Point = { x: toNode.x, y: toNode.y }

    if (!currentSegment || currentSegment.floorId !== fromNode.floorId) {
      currentSegment = { floorId: fromNode.floorId, points: [fromPoint] }
      segments.push(currentSegment)
    }

    currentSegment.points.push(toPoint)
  }

  return segments
}

function buildSteps(
  floors: Floor[],
  pathNodes: Node[],
  links: GraphLink[],
  destinationLabel: string,
) {
  const steps: RouteStep[] = []
  let previousBearing: number | null = null

  for (let index = 0; index < links.length; index += 1) {
    const fromNode = pathNodes[index]
    const toNode = pathNodes[index + 1]
    const link = links[index]

    if (link.type === 'elevator') {
      const fromLevel = floors.find((floor) => floor.id === fromNode.floorId)?.level ?? 0
      const toFloor = floors.find((floor) => floor.id === toNode.floorId)
      const toLevel = toFloor?.level ?? fromLevel
      steps.push({
        index: steps.length + 1,
        type: 'elevator',
        floorId: fromNode.floorId,
        nodeId: fromNode.id,
        x: fromNode.x,
        y: fromNode.y,
        bearing: 0,
        distance: 0,
        instruction: `Đi thang máy ${toLevel > fromLevel ? 'lên' : 'xuống'} ${toFloor?.name ?? toNode.floorId}`,
      })
      previousBearing = null
      continue
    }

    const bearing = normalizeBearing(bearingDegrees(fromNode, toNode))
    steps.push({
      index: steps.length + 1,
      type: 'walk',
      floorId: fromNode.floorId,
      nodeId: toNode.id,
      x: toNode.x,
      y: toNode.y,
      bearing,
      distance: round(link.distance),
      instruction: walkingInstruction(link.distance, previousBearing, bearing),
    })
    previousBearing = bearing
  }

  const destinationNode = pathNodes[pathNodes.length - 1]
  steps.push({
    index: steps.length + 1,
    type: 'arrive',
    floorId: destinationNode.floorId,
    nodeId: destinationNode.id,
    x: destinationNode.x,
    y: destinationNode.y,
    bearing: 0,
    distance: 0,
    instruction: `Đến ${destinationLabel}`,
  })

  return steps
}

export function getDestinations(context: RouteContext, buildingId: string): Destination[] {
  const buildingFloors = context.floors.filter((floor) => floor.buildingId === buildingId)
  const floorById = new Map(buildingFloors.map((floor) => [floor.id, floor]))
  const poisById = new Map(
    buildingFloors.flatMap((floor) => floor.pois.map((poi) => [poi.id, poi] as const)),
  )

  return context.nodes
    .filter((node) => floorById.has(node.floorId) && (node.label || node.poiId))
    .map((node) => {
      const floor = floorById.get(node.floorId)
      const poi = node.poiId ? poisById.get(node.poiId) : undefined
      return {
        nodeId: node.id,
        label: node.label ?? poi?.name ?? node.id,
        floorId: node.floorId,
        floorName: floor?.name ?? node.floorId,
        type: poi?.type ?? (node.isElevatorLink ? 'elevator' : 'other'),
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function buildRoute(
  context: RouteContext,
  buildingId: string,
  fromNodeId: string,
  toNodeId: string,
): RouteResult | null {
  const buildingFloors = context.floors.filter((floor) => floor.buildingId === buildingId)
  const floorIds = new Set(buildingFloors.map((floor) => floor.id))
  const routeNodes = context.nodes.filter((node) => floorIds.has(node.floorId))
  const routeEdges = context.edges.filter((edge) => floorIds.has(edge.floorId))
  const routeContext = {
    ...context,
    floors: buildingFloors,
    nodes: routeNodes,
    edges: routeEdges,
  }
  const nodeById = new Map(routeNodes.map((node) => [node.id, node]))
  const fromNode = nodeById.get(fromNodeId)
  const toNode = nodeById.get(toNodeId)

  if (!fromNode || !toNode) {
    return null
  }

  const path = findPath(routeContext, fromNodeId, toNodeId)
  if (!path) {
    return null
  }

  const pathNodes = path.nodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is Node => Boolean(node))
  const totalDistance = path.links.reduce((total, link) => total + link.distance, 0)
  const estimatedSeconds = path.links.reduce((total, link) => total + link.seconds, 0)
  const destination = getDestinations(context, buildingId).find(
    (item) => item.nodeId === toNodeId,
  )

  return {
    buildingId,
    fromNodeId,
    toNodeId,
    totalDistance: round(totalDistance),
    estimatedSeconds: Math.round(estimatedSeconds),
    steps: buildSteps(
      buildingFloors,
      pathNodes,
      path.links,
      destination?.label ?? toNode.label ?? toNode.id,
    ),
    segments: buildSegments(pathNodes, path.links),
  }
}

export function describeRouteResult(route: RouteResult | null) {
  if (!route) {
    return 'Không tìm thấy đường đi'
  }

  const floors = [...new Set(route.segments.map((segment) => segment.floorId))]
  return `${route.totalDistance} m, ${route.estimatedSeconds} s, ${floors.join(' -> ')}`
}
