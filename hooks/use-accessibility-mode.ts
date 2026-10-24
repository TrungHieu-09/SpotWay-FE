import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'spotway.accessibleRoutes';

// Tiny shared store so the map and the settings screen always agree.
let enabled = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved === 'true' && !enabled) {
      enabled = true;
      emit();
    }
  })
  .catch(() => {});

export function setAccessibilityMode(value: boolean) {
  if (value === enabled) return;
  enabled = value;
  AsyncStorage.setItem(STORAGE_KEY, String(value)).catch(() => {});
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Whether step-free / lift-first routing is preferred. */
export function useAccessibilityMode(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => enabled, () => enabled);
  return [value, setAccessibilityMode];
}
