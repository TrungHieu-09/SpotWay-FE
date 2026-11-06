import { useEffect } from 'react'
import type { Floor } from '../types/floor'
import { useGraphStore } from '../store/useGraphStore'
import { usePoiStore } from '../store/usePoiStore'

/**
 * Nạp graph (+ POI nếu cần) của các tầng vào store dùng chung, để mọi panel đọc cùng một nguồn
 * thay vì mỗi nơi tự gọi API riêng.
 */
export function useLoadFloorData(floors: readonly Floor[], options: { pois?: boolean } = {}) {
  const loadFloorGraph = useGraphStore((state) => state.loadFloorGraph)
  const loadFloorPois = usePoiStore((state) => state.loadFloorPois)
  const withPois = options.pois ?? false
  const key = floors.map((floor) => `${floor.id}:${floor.mapWidth}x${floor.mapHeight}`).join('|')

  useEffect(() => {
    for (const floor of floors) {
      const size = { width: floor.mapWidth, height: floor.mapHeight }
      void loadFloorGraph(floor.id, size)
      if (withPois) void loadFloorPois(floor.id, size)
    }
    // `key` đã mã hoá id và kích thước của danh sách tầng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, withPois, loadFloorGraph, loadFloorPois])
}
