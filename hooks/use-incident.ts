import { useSyncExternalStore } from 'react';

import type { Floor } from '@/data/mock-floor';

// DEMO ONLY: a simulated incident kept in memory. No push notification is ever sent.
let incident: Floor | null = null;
const listeners = new Set<() => void>();

export function setIncident(floor: Floor | null) {
  if (floor === incident) return;
  incident = floor;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Floor of the simulated incident, or null when there is none. */
export function useIncident(): [Floor | null, (floor: Floor | null) => void] {
  const value = useSyncExternalStore(subscribe, () => incident, () => incident);
  return [value, setIncident];
}
