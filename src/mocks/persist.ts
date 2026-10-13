const MOCK_STORAGE_PREFIX = 'mock:'
export const MOCK_SEED_VERSION = '2026-10-12-guest-routing-v1'

export const MOCK_STORAGE_KEYS = {
  seedVersion: `${MOCK_STORAGE_PREFIX}seedVersion`,
  buildings: `${MOCK_STORAGE_PREFIX}buildings`,
  floors: `${MOCK_STORAGE_PREFIX}floors`,
  stores: `${MOCK_STORAGE_PREFIX}stores`,
  nodes: `${MOCK_STORAGE_PREFIX}nodes`,
  edges: `${MOCK_STORAGE_PREFIX}edges`,
  geometry: `${MOCK_STORAGE_PREFIX}geometry`,
} as const

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch (error) {
    console.warn('Mock storage is unavailable', error)
    return null
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  const storage = getStorage()
  if (!storage) {
    return fallback
  }

  try {
    const storedValue = storage.getItem(key)
    return storedValue ? (JSON.parse(storedValue) as T) : fallback
  } catch (error) {
    console.warn(`Failed to load ${key} from mock storage`, error)
    return fallback
  }
}

export function saveToStorage<T>(key: string, data: T): boolean {
  const storage = getStorage()
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.warn(`Failed to save ${key} to mock storage`, error)
    return false
  }
}

export function resetMockStorage() {
  const storage = getStorage()
  if (!storage) {
    return
  }

  const keysToRemove: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(MOCK_STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key))
}

function ensureMockSeedVersion() {
  const storage = getStorage()
  if (!storage) {
    return
  }

  const storedVersion = storage.getItem(MOCK_STORAGE_KEYS.seedVersion)
  if (storedVersion === MOCK_SEED_VERSION) {
    return
  }

  resetMockStorage()
  storage.setItem(MOCK_STORAGE_KEYS.seedVersion, MOCK_SEED_VERSION)
}

ensureMockSeedVersion()
