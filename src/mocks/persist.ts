const MOCK_STORAGE_PREFIX = 'mock:'

export const MOCK_STORAGE_KEYS = {
  buildings: `${MOCK_STORAGE_PREFIX}buildings`,
  floors: `${MOCK_STORAGE_PREFIX}floors`,
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

export function saveToStorage<T>(key: string, data: T): void {
  const storage = getStorage()
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn(`Failed to save ${key} to mock storage`, error)
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
