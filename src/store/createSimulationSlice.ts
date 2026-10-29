import type { StateCreator } from 'zustand/vanilla'
import type { IndoorRoute, VerticalLinkDirection, VerticalLinkKind } from '../types/navigation.ts'
import { getExitCandidates } from '../utils/indoorPathfinding.ts'
import {
  AMENITY_MATCHERS,
  allNodesOf,
  floorLevelsOf,
  neighborsOf,
  pickDefaultStart,
  pickDestination,
  sortFloors,
  upperFloorOf,
} from '../utils/navigationHelpers.ts'
import { createRouteEngine } from './navigationRouteEngine.ts'
import {
  INITIAL_SIMULATION,
  type DemoScenarioId,
  type FireScenarioId,
  type HappyScenarioId,
  type NavigationSimulationState,
  type NavigationState,
} from './navigationState.ts'

export const REROUTE_DELAY_MS = 1200

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Khoảng chờ giữa các bước tái định tuyến trong kịch bản cháy; test hạ về 0 để chạy tức thì. */
export type SimulationOptions = { rerouteDelayMs?: number }

export function createSimulationSlice(
  options: SimulationOptions = {},
): StateCreator<NavigationState, [], [], NavigationSimulationState> {
  const delayMs = options.rerouteDelayMs ?? REROUTE_DELAY_MS

  return (set, get) => {
    const { routeOnGraph, applyRoute, rerouteEvacuation } = createRouteEngine(set, get)

    const startScenario = (scenarioId: DemoScenarioId, message: string) =>
      set({ ...INITIAL_SIMULATION, isDemoRunning: true, activeScenarioId: scenarioId, simulationMessage: message, route: undefined, error: undefined })

    const runHappyScenario = (scenarioId: HappyScenarioId, defaultStart: string) => {
      const { floors, mapsByFloorId, destinations } = get()
      const nodes = allNodesOf(mapsByFloorId)
      const startFloorId = nodes.find((node) => node.id === defaultStart)?.floorId
      const upperFloor = upperFloorOf(floors)
      const upperDestination = pickDestination(destinations, upperFloor?.id, ['rạp', 'cinema', 'cgv', 'phim'])
      const upperTarget = upperDestination?.nodeId ?? nodes.find((node) => node.floorId === upperFloor?.id)?.id
      const upperLabel = upperFloor ? `Tầng ${upperFloor.floorNumber}` : 'tầng trên'

      const sameFloorCandidates = () => {
        const fromDestinations = destinations.filter((item) => item.floorId === startFloorId).map((item) => item.nodeId)
        const ids = fromDestinations.length > 0
          ? fromDestinations
          : nodes.filter((node) => node.floorId === startFloorId && node.id !== defaultStart).map((node) => node.id)
        return ids.filter((id) => id !== defaultStart)
      }
      const nameOfNode = (nodeId: string | undefined) =>
        destinations.find((item) => item.nodeId === nodeId)?.name ?? nodes.find((node) => node.id === nodeId)?.name ?? undefined

      const viaTransition = (kind: VerticalLinkKind, message: string, direction?: VerticalLinkDirection) => {
        startScenario(scenarioId, message)
        if (!upperTarget) return set({ error: 'Tòa nhà cần ít nhất 2 tầng có node để demo chuyển tầng.' })
        const route = applyRoute(defaultStart, upperTarget, {
          targetName: upperDestination?.name,
          allowedTransitions: new Set([kind]),
          defaultEscalatorDirection: direction,
        })
        if (!route) set({ error: `Không có tuyến lên ${upperLabel} bằng ${kind === 'ELEVATOR' ? 'thang máy' : kind === 'STAIR' ? 'thang bộ' : 'thang cuốn'} — kiểm tra node/vertical link.` })
      }

      switch (scenarioId) {
        case 'same-floor-shortest': {
          startScenario(scenarioId, 'H1: điểm đến gần nhất cùng tầng theo chi phí đồ thị.')
          const route = applyRoute(defaultStart, { nodeIds: sameFloorCandidates() })
          if (route) set({ routeTargetName: nameOfNode(route.nodeIds.at(-1)) ?? 'Điểm đến' })
          return
        }
        case 'same-floor-turns': {
          startScenario(scenarioId, 'H2: tuyến cùng tầng nhiều ngã rẽ — chỉ dẫn turn-by-turn kèm khoảng cách mét.')
          const turnCount = (route: IndoorRoute) =>
            route.instructions?.filter((item) => !['START', 'STRAIGHT', 'ARRIVE', 'ARRIVE_AT_SAFE_EXIT'].includes(item.maneuver)).length ?? 0
          let best: { nodeId: string; turns: number; distance: number } | undefined
          for (const nodeId of sameFloorCandidates().slice(0, 80)) {
            const route = routeOnGraph(defaultStart, nodeId)
            if (!route) continue
            const turns = turnCount(route)
            if (!best || turns > best.turns || (turns === best.turns && route.totalDistance > best.distance)) {
              best = { nodeId, turns, distance: route.totalDistance }
            }
          }
          if (best) applyRoute(defaultStart, best.nodeId, { targetName: nameOfNode(best.nodeId) })
          else set({ error: 'Không có điểm đến cùng tầng nào nối được với điểm xuất phát.' })
          return
        }
        case 'elevator-wait':
          return viaTransition('ELEVATOR', `H3: lên ${upperLabel} bằng thang máy — hiển thị thời gian chờ và phân rã thời gian.`)
        case 'stairs':
          return viaTransition('STAIR', `H4: lên ${upperLabel} bằng thang bộ.`)
        case 'escalator-up':
          return viaTransition('ESCALATOR', `H5: thang cuốn một chiều đi lên ${upperLabel}.`, 'UP')
        case 'escalator-reverse': {
          startScenario(scenarioId, 'H6: thang cuốn mô phỏng một chiều LÊN — khi đi xuống, hệ thống không dùng thang cuốn ngược chiều.')
          if (!upperTarget) return set({ error: 'Tòa nhà cần ít nhất 2 tầng có node để demo chuyển tầng.' })
          applyRoute(upperTarget, defaultStart, { targetName: nameOfNode(defaultStart) ?? 'Cửa chính', defaultEscalatorDirection: 'UP' })
          return
        }
        case 'wheelchair': {
          startScenario(scenarioId, 'H7: chế độ xe lăn — loại thang bộ/thang cuốn và lối đi không tiếp cận được.')
          if (!upperTarget) return set({ error: 'Tòa nhà cần ít nhất 2 tầng có node để demo chuyển tầng.' })
          applyRoute(defaultStart, upperTarget, { targetName: upperDestination?.name, wheelchairMode: true })
          return
        }
        case 'nearest-restroom':
        case 'nearest-atm':
        case 'nearest-info': {
          const key = scenarioId === 'nearest-restroom' ? 'RESTROOM' : scenarioId === 'nearest-atm' ? 'ATM' : 'INFO'
          const matcher = AMENITY_MATCHERS[key]
          startScenario(scenarioId, `Tìm ${matcher.label} gần nhất theo chi phí đồ thị (không theo đường chim bay).`)
          const pois = Object.values(mapsByFloorId).flatMap((map) => map.pois).filter((poi) =>
            matcher.categories.includes(poi.category.toUpperCase()) ||
            matcher.keywords.some((keyword) => poi.name.toLowerCase().includes(keyword)),
          )
          if (pois.length === 0) return set({ error: `Tòa nhà chưa có POI ${matcher.label} để demo.` })
          const route = applyRoute(defaultStart, { nodeIds: pois.map((poi) => poi.nodeId) })
          if (route) {
            const poi = pois.find((item) => item.nodeId === route.nodeIds.at(-1))
            set({ routeTargetName: poi?.name ?? matcher.label })
          }
          return
        }
      }
    }

    const runFireScenario = async (scenarioId: FireScenarioId, defaultStart: string) => {
      const { floors, mapsByFloorId } = get()
      const nodes = allNodesOf(mapsByFloorId)
      const isExit = (nodeId: string) => getExitCandidates(nodes, floorLevelsOf(floors)).some((node) => node.id === nodeId)
      const ignite = (nodeIds: string[]) =>
        set({ emergencyMode: 'FIRE', activeFireNodeIds: [...new Set([...get().activeFireNodeIds, ...nodeIds])] })
      const evacuate = (start: string) => applyRoute(start, { findNearestExit: true })

      switch (scenarioId) {
        case 'fire-ground-main-exit': {
          startScenario(scenarioId, 'F1: cháy gần cửa chính tầng trệt — tránh vùng cháy, dẫn ra cửa thoát phía sau.')
          set({ emergencyMode: 'FIRE' })
          const mainExit = evacuate(defaultStart)?.nodeIds.at(-1)
          if (!mainExit) return
          ignite([mainExit, ...neighborsOf(mapsByFloorId, mainExit).filter((id) => id !== defaultStart && !isExit(id))])
          await wait(delayMs)
          evacuate(defaultStart)
          return
        }
        case 'fire-middle-floor': {
          startScenario(scenarioId, 'F2: cháy tại sảnh thang máy tầng giữa — cấm thang máy, đi thang bộ thoát hiểm xuống.')
          const middle = sortFloors(floors)[1]
          if (!middle) return set({ error: 'Cần ít nhất 2 tầng để demo cháy tầng giữa.' })
          const floorNodes = nodes.filter((node) => node.floorId === middle.id)
          const elevators = floorNodes.filter((node) => node.type === 'ELEVATOR')
          const fire = elevators.length > 0
            ? elevators.flatMap((node) => neighborsOf(mapsByFloorId, node.id)).filter((id) => floorNodes.some((node) => node.id === id && node.type !== 'STAIR'))
            : floorNodes.slice(Math.floor(floorNodes.length / 2), Math.floor(floorNodes.length / 2) + 1).map((node) => node.id)
          const anchor = elevators[0] ?? floorNodes.find((node) => fire.includes(node.id))
          const start = floorNodes
            .filter((node) => !fire.includes(node.id) && !['ELEVATOR', 'STAIR', 'ESCALATOR'].includes(node.type))
            .sort((a, b) => (anchor ? Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y) : 0))[0]
          if (!start) return set({ error: `Tầng ${middle.floorNumber} không có node phù hợp làm vị trí người dùng.` })
          ignite(fire)
          evacuate(start.id)
          return
        }
        case 'fire-at-destination': {
          const upperFloor = upperFloorOf(floors)
          const destination = pickDestination(get().destinations, upperFloor?.id, ['rạp', 'cinema', 'cgv', 'phim'])
          const target = destination?.nodeId ?? nodes.find((node) => node.floorId === upperFloor?.id)?.id
          startScenario(scenarioId, 'F3: đang đi mua sắm thì điểm đến bốc cháy — huỷ điểm đến, chuyển sang thoát hiểm.')
          if (!target) return set({ error: 'Không tìm được điểm đến để demo.' })
          applyRoute(defaultStart, target, { targetName: destination?.name })
          await wait(delayMs)
          ignite([target])
          applyRoute(defaultStart, target, { targetName: destination?.name })
          return
        }
        case 'fire-exit-1':
        case 'fire-exits-1-2': {
          const both = scenarioId === 'fire-exits-1-2'
          startScenario(scenarioId, both
            ? 'F5: lửa lần lượt chặn Cửa thoát 1 và 2 — tái định tuyến sang Cửa thoát 3.'
            : 'F4: lửa chặn Cửa thoát 1 — tái định tuyến tức thời sang Cửa thoát 2.')
          set({ emergencyMode: 'FIRE' })
          for (let round = 0; round < (both ? 2 : 1); round += 1) {
            const exitNodeId = evacuate(defaultStart)?.nodeIds.at(-1)
            if (!exitNodeId) return
            await wait(delayMs)
            ignite([exitNodeId])
          }
          evacuate(defaultStart)
          return
        }
        case 'interactive-fire': {
          startScenario(scenarioId, 'F6: bật chế độ đặt lửa — chạm vào node bất kỳ trên bản đồ để đốt/dập, tuyến thoát hiểm tự cập nhật.')
          set({ emergencyMode: 'FIRE', interactiveFireMode: true })
          evacuate(defaultStart)
        }
      }
    }

    return {
      ...INITIAL_SIMULATION,

      triggerFireAlarm(initialFireNodeId, currentNodeId) {
        const { floors, mapsByFloorId, simulationStartNodeId, activeFireNodeIds } = get()
        const start = currentNodeId ?? simulationStartNodeId ?? pickDefaultStart(floors, allNodesOf(mapsByFloorId))
        if (!start) return
        set({
          emergencyMode: 'FIRE',
          activeFireNodeIds: initialFireNodeId ? [...new Set([...activeFireNodeIds, initialFireNodeId])] : activeFireNodeIds,
          simulationMessage: 'BÁO ĐỘNG CHÁY: thang máy bị khoá, đang dẫn tới lối thoát hiểm gần nhất.',
        })
        rerouteEvacuation(start)
      },

      blockExitWithFire(exitNodeId) {
        set({
          emergencyMode: 'FIRE',
          activeFireNodeIds: [...new Set([...get().activeFireNodeIds, exitNodeId])],
          simulationMessage: 'Lửa đã chặn lối thoát hiểm — tự động tái định tuyến sang lối thoát an toàn tiếp theo.',
        })
        rerouteEvacuation()
      },

      toggleFireNode(nodeId, currentNodeId) {
        const { activeFireNodeIds, simulationStartNodeId, floors, mapsByFloorId } = get()
        const start = currentNodeId ?? simulationStartNodeId ?? pickDefaultStart(floors, allNodesOf(mapsByFloorId))
        const burning = activeFireNodeIds.includes(nodeId)
        if (!burning && nodeId === start) {
          set({ simulationMessage: 'Không thể đặt lửa tại vị trí bạn đang đứng — chọn node khác.' })
          return
        }
        set({
          emergencyMode: 'FIRE',
          activeFireNodeIds: burning ? activeFireNodeIds.filter((id) => id !== nodeId) : [...activeFireNodeIds, nodeId],
          simulationMessage: burning
            ? 'Đã dập lửa tại node vừa chọn — tính lại tuyến thoát hiểm.'
            : '🔥 Node vừa chọn đang cháy — đã tái định tuyến né điểm cháy.',
        })
        rerouteEvacuation(start)
      },

      setInteractiveFireMode(enabled, currentNodeId) {
        set({ interactiveFireMode: enabled })
        if (enabled && get().emergencyMode !== 'FIRE') {
          set({ emergencyMode: 'FIRE', simulationMessage: 'Chế độ đặt lửa: chạm vào node trên bản đồ để đốt/dập lửa.' })
          rerouteEvacuation(currentNodeId)
        }
      },

      extinguishAllFires() {
        set({ activeFireNodeIds: [], blockedEdgeIds: [], routeWarning: undefined, simulationMessage: '🧯 Đã dập tắt toàn bộ lửa mô phỏng.' })
        if (get().emergencyMode === 'FIRE') rerouteEvacuation()
      },

      resetSimulation() {
        set({ ...INITIAL_SIMULATION, route: undefined, error: undefined })
      },

      async runDemoScenario(scenarioId) {
        if (scenarioId === 'reset') {
          get().resetSimulation()
          return
        }
        const defaultStart = pickDefaultStart(get().floors, allNodesOf(get().mapsByFloorId))
        if (!defaultStart) {
          set({ error: 'Tòa nhà chưa có node điều hướng để chạy demo.' })
          return
        }
        try {
          if (scenarioId.startsWith('fire-') || scenarioId === 'interactive-fire') {
            await runFireScenario(scenarioId as FireScenarioId, defaultStart)
          } else {
            runHappyScenario(scenarioId as HappyScenarioId, defaultStart)
          }
        } finally {
          set({ isDemoRunning: false })
        }
      },
    }
  }
}
