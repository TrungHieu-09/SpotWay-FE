import { useSyncExternalStore } from 'react';

import type { HazardZone } from '@/data/mock-floor';

// DEMO ONLY: a simulated incident kept in memory. No push notification is ever sent.
let incident: HazardZone | null = null;
const listeners = new Set<() => void>();

export function setIncident(next: HazardZone | null) {
  if (next === incident) return;
  incident = next;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The simulated incident (floor, zone, type), or null when there is none. */
export function useIncident(): [HazardZone | null, (next: HazardZone | null) => void] {
  const value = useSyncExternalStore(subscribe, () => incident, () => incident);
  return [value, setIncident];
}
