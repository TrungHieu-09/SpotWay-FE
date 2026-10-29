import type { StateCreator } from 'zustand/vanilla'
import type { PoiGateway } from '../api/graphGateway.ts'
import type { MapSize, PercentPoint } from '../types/geometry.ts'
import type { GraphNode } from '../types/graph.ts'
import type { NewPoi, Poi, PoiDetailsPatch } from '../types/poi.ts'
import { clampPercent } from '../utils/canvasCoordinates.ts'
import { findNearestNode } from '../utils/graphGeometry.ts'
import { createOptimisticKit } from './optimisticKit.ts'

type PoiLoadStatus = 'loading' | 'ready' | 'error'

export type PoiState = {
  poisByFloor: Record<string, Poi[]>
  mapSizeByFloor: Record<string, MapSize>
  loadStatusByFloor: Record<string, PoiLoadStatus>
  /** Số thao tác ghi đang bay; chỉ để hiện chỉ báo "Đang lưu…", không chặn UI. */
  pendingOps: number
  error: string | null
  loadFloorPois: (floorId: string, size: MapSize) => Promise<void>
  clearFloor: (floorId: string) => void
  /** Trả id tạm (POI hiện ngay trên canvas) hoặc null nếu không tạo được. */
  createPoi: (floorId: string, input: NewPoi) => string | null
  movePoi: (floorId: string, poiId: string, to: PercentPoint) => void
  updatePoiDetails: (floorId: string, poiId: string, patch: PoiDetailsPatch) => void
  deletePoi: (floorId: string, poiId: string) => void
  /** Xoá mọi POI của tầng; mỗi POI tự hoàn tác nếu BE từ chối. */
  deleteAllPois: (floorId: string) => void
  clearError: () => void
  /** Chờ mọi thao tác ghi đang bay hoàn tất (thành công hoặc đã rollback). */
  flush: () => Promise<void>
}

const errorText = (reason: unknown) => (reason instanceof Error ? reason.message : 'Lỗi không xác định')

/**
 * `getNodes` cho phép store tự snap POI vào node gần nhất (graphGeometry) mà không phụ thuộc
 * trực tiếp vào store graph. Nodes lấy tại thời điểm tạo/kéo, nên node tạm vẫn được tính.
 */
export function createPoiSlice(
  gateway: PoiGateway,
  getNodes: (floorId: string) => readonly GraphNode[],
): StateCreator<PoiState> {
  return (set, get) => {
    const loads = new Map<string, AbortController>()
    const kit = createOptimisticKit((delta) =>
      set((state) => ({ pendingOps: Math.max(0, state.pendingOps + delta) })),
    )
    const { tempId, canon, resolveId, register, track } = kit

    const fail = (prefix: string, reason: unknown) => set({ error: `${prefix}: ${errorText(reason)}` })

    const updatePois = (floorId: string, fn: (pois: Poi[]) => Poi[]) =>
      set((state) =>
        state.poisByFloor[floorId]
          ? { poisByFloor: { ...state.poisByFloor, [floorId]: fn(state.poisByFloor[floorId]) } }
          : state,
      )

    /** Node snap theo client: id của node gần nhất (kể cả node tạm → quy về id thật nếu đã có). */
    const snap = (floorId: string, at: PercentPoint, size: MapSize) => {
      const nearest = findNearestNode(at, getNodes(floorId), size)
      return nearest ? canon(nearest.id) : null
    }

    /** Chỉ gửi nodeId cho BE khi nó là id thật; node tạm → để BE tự snap. */
    const serverNodeId = (nodeId: string | null) => (nodeId && !nodeId.startsWith('tmp-') ? nodeId : null)

    return {
      poisByFloor: {},
      mapSizeByFloor: {},
      loadStatusByFloor: {},
      pendingOps: 0,
      error: null,

      async loadFloorPois(floorId, size) {
        loads.get(floorId)?.abort()
        const controller = new AbortController()
        loads.set(floorId, controller)
        set((state) => ({
          mapSizeByFloor: { ...state.mapSizeByFloor, [floorId]: size },
          loadStatusByFloor: { ...state.loadStatusByFloor, [floorId]: 'loading' },
          poisByFloor: { ...state.poisByFloor, [floorId]: state.poisByFloor[floorId] ?? [] },
        }))
        try {
          const pois = await gateway.fetchPois(floorId, size, controller.signal)
          if (controller.signal.aborted) return
          set((state) => ({
            loadStatusByFloor: { ...state.loadStatusByFloor, [floorId]: 'ready' },
            poisByFloor: { ...state.poisByFloor, [floorId]: pois },
          }))
        } catch (reason) {
          if (controller.signal.aborted) return
          set((state) => ({
            loadStatusByFloor: { ...state.loadStatusByFloor, [floorId]: 'error' },
            error: `Không thể tải POI: ${errorText(reason)}`,
          }))
        } finally {
          if (loads.get(floorId) === controller) loads.delete(floorId)
        }
      },

      clearFloor(floorId) {
        loads.get(floorId)?.abort()
        loads.delete(floorId)
        set((state) => {
          const { [floorId]: _pois, ...poisByFloor } = state.poisByFloor
          const { [floorId]: _size, ...mapSizeByFloor } = state.mapSizeByFloor
          const { [floorId]: _status, ...loadStatusByFloor } = state.loadStatusByFloor
          return { poisByFloor, mapSizeByFloor, loadStatusByFloor }
        })
      },

      createPoi(floorId, input) {
        const size = get().mapSizeByFloor[floorId]
        if (!size) {
          fail('Không thể tạo POI', new Error('POI của tầng chưa được tải'))
          return null
        }
        const at = { x: clampPercent(input.x), y: clampPercent(input.y) }
        const nearestNodeId = snap(floorId, at, size)
        const poiTempId = tempId('poi')
        const slot = register(poiTempId)
        const tempPoi: Poi = { ...input, ...at, id: poiTempId, floorId, nearestNodeId }
        set({ error: null })
        updatePois(floorId, (pois) => [...pois, tempPoi])

        track(
          (async () => {
            try {
              const poi = await gateway.createPoi(floorId, size, { ...input, ...at }, serverNodeId(nearestNodeId))
              updatePois(floorId, (pois) => pois.map((item) => (item.id === poiTempId ? poi : item)))
              slot.resolve(poi.id)
            } catch (reason) {
              slot.reject(reason)
              updatePois(floorId, (pois) => pois.filter((item) => item.id !== poiTempId))
              fail('Không thể tạo POI', reason)
            }
          })(),
        )
        return poiTempId
      },

      movePoi(floorId, rawPoiId, to) {
        const poiId = canon(rawPoiId)
        const size = get().mapSizeByFloor[floorId]
        const poi = get().poisByFloor[floorId]?.find((item) => item.id === poiId)
        if (!size || !poi) return
        const previous = { x: poi.x, y: poi.y, nearestNodeId: poi.nearestNodeId }
        const next = { x: clampPercent(to.x), y: clampPercent(to.y) }
        const nearestNodeId = snap(floorId, next, size)
        updatePois(floorId, (pois) =>
          pois.map((item) => (item.id === poiId ? { ...item, ...next, nearestNodeId } : item)),
        )

        track(
          (async () => {
            try {
              const saved = await gateway.updatePoi(await resolveId(poiId), size, {
                position: next,
                nodeId: serverNodeId(nearestNodeId),
              })
              // BE là nguồn sự thật cho node neo; giữ vị trí người dùng vừa kéo nếu đã kéo tiếp.
              updatePois(floorId, (pois) =>
                pois.map((item) =>
                  item.id === poiId ? { ...item, nearestNodeId: saved.nearestNodeId } : item,
                ),
              )
            } catch (reason) {
              // Chỉ hoàn tác nếu chưa có lần kéo mới hơn ghi đè.
              updatePois(floorId, (pois) =>
                pois.map((item) =>
                  item.id === poiId && item.x === next.x && item.y === next.y ? { ...item, ...previous } : item,
                ),
              )
              fail('Không thể di chuyển POI', reason)
            }
          })(),
        )
      },

      updatePoiDetails(floorId, rawPoiId, patch) {
        const poiId = canon(rawPoiId)
        const size = get().mapSizeByFloor[floorId]
        const poi = get().poisByFloor[floorId]?.find((item) => item.id === poiId)
        if (!size || !poi) return
        const previous = { name: poi.name, category: poi.category, icon: poi.icon }
        updatePois(floorId, (pois) => pois.map((item) => (item.id === poiId ? { ...item, ...patch } : item)))

        track(
          (async () => {
            try {
              await gateway.updatePoi(await resolveId(poiId), size, patch)
            } catch (reason) {
              // Hoàn tác từng trường vẫn còn đúng giá trị optimistic.
              updatePois(floorId, (pois) =>
                pois.map((item) => {
                  if (item.id !== poiId) return item
                  const restored = { ...item }
                  if (patch.name !== undefined && item.name === patch.name) restored.name = previous.name
                  if (patch.category !== undefined && item.category === patch.category) restored.category = previous.category
                  if (patch.icon !== undefined && item.icon === patch.icon) restored.icon = previous.icon
                  return restored
                }),
              )
              fail('Không thể cập nhật POI', reason)
            }
          })(),
        )
      },

      deletePoi(floorId, rawPoiId) {
        const poiId = canon(rawPoiId)
        const poi = get().poisByFloor[floorId]?.find((item) => item.id === poiId)
        if (!poi) return
        updatePois(floorId, (pois) => pois.filter((item) => item.id !== poiId))

        track(
          (async () => {
            let realId: string
            try {
              realId = await resolveId(poiId)
            } catch {
              return // POI tạm chưa từng được tạo trên server (đã rollback): không còn gì để xoá
            }
            try {
              await gateway.deletePoi(realId)
            } catch (reason) {
              updatePois(floorId, (pois) => (pois.some((item) => item.id === poiId) ? pois : [...pois, poi]))
              fail('Không thể xoá POI', reason)
            }
          })(),
        )
      },

      deleteAllPois(floorId) {
        for (const poi of [...(get().poisByFloor[floorId] ?? [])]) get().deletePoi(floorId, poi.id)
      },

      clearError: () => set({ error: null }),
      flush: kit.flush,
    }
  }
}
