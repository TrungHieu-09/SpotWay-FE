export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const KEY = 'spotway.guest.destination'
export const DESTINATION_TTL_MS = 30 * 60 * 1000

type Remembered = { buildingId: string; destinationId: string; savedAt: number }

export function rememberDestination(storage: KeyValueStorage, buildingId: string, destinationId: string, now = Date.now()) {
  storage.setItem(KEY, JSON.stringify({ buildingId, destinationId, savedAt: now } satisfies Remembered))
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
