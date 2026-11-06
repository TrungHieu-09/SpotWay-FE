/**
 * Hạ tầng dùng chung cho store có optimistic update: id tạm, alias tạm -> thật,
 * hàng đợi chờ id thật, theo dõi thao tác đang bay.
 */
export function createOptimisticKit(onPendingChange: (delta: 1 | -1) => void) {
  // tempId -> id thật. Giữ vĩnh viễn trong phiên (rất nhỏ) để thao tác đến muộn vẫn phân giải đúng.
  const realIds = new Map<string, Promise<string>>()
  // Bản đồng bộ của realIds: UI còn giữ id tạm sau khi commit vẫn trỏ đúng thực thể.
  const aliases = new Map<string, string>()
  const inflight = new Set<Promise<unknown>>()
  let sequence = 0

  return {
    tempId: (kind: string) => `tmp-${kind}-${++sequence}`,
    canon: (id: string) => aliases.get(id) ?? id,
    resolveId: (id: string) => realIds.get(id) ?? Promise.resolve(id),

    register(tempId: string) {
      let resolve!: (realId: string) => void
      let reject!: (reason: unknown) => void
      const promise = new Promise<string>((res, rej) => {
        resolve = res
        reject = rej
      })
      promise.catch(() => {}) // người chờ tự xử lý; tránh unhandled rejection khi không ai chờ
      realIds.set(tempId, promise)
      return {
        resolve(realId: string) {
          aliases.set(tempId, realId)
          resolve(realId)
        },
        reject,
      }
    },

    track(task: Promise<unknown>) {
      onPendingChange(1)
      const tracked: Promise<unknown> = task.finally(() => {
        inflight.delete(tracked)
        onPendingChange(-1)
      })
      inflight.add(tracked)
    },

    async flush() {
      while (inflight.size > 0) await Promise.allSettled([...inflight])
    },
  }
}
