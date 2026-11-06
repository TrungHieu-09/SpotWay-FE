/** Phần tối thiểu của Storage mà module cần (test truyền bản giả, trình duyệt truyền `localStorage`). */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const KEY = 'spotway.guest.destination'
/** Quá thời gian này thì coi như khách đã bỏ chuyến đi cũ. */
export const DESTINATION_TTL_MS = 30 * 60 * 1000

type Remembered = { buildingId: string; destinationId: string; savedAt: number }

/**
 * Nhớ điểm đến của khách để khi quét một mã QR khác giữa đường (trang tải lại) vẫn tiếp tục chỉ đường
 * từ vị trí mới tới đúng điểm đến cũ, không bắt chọn lại.
 */
export function rememberDestination(storage: KeyValueStorage, buildingId: string, destinationId: string, now = Date.now()) {
  const value: Remembered = { buildingId, destinationId, savedAt: now }
  storage.setItem(KEY, JSON.stringify(value))
}

export function recallDestination(storage: KeyValueStorage, buildingId: string, now = Date.now()): string | undefined {
  const raw = storage.getItem(KEY)
  if (!raw) return undefined
  try {
    const value = JSON.parse(raw) as Partial<Remembered>
    if (value.buildingId !== buildingId || typeof value.destinationId !== 'string' || typeof value.savedAt !== 'number') return undefined
    return now - value.savedAt <= DESTINATION_TTL_MS ? value.destinationId : undefined
  } catch {
    return undefined
  }
}

export function forgetDestination(storage: KeyValueStorage) {
  storage.removeItem(KEY)
}
