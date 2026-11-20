import { create } from 'zustand'

type ServiceLockState = {
  /** Set when the server answers CONTRACT_EXPIRED: the workspace's contract has ended. */
  message: string | null
  lock: (message: string) => void
  clear: () => void
}

export const useServiceLockStore = create<ServiceLockState>((set) => ({
  message: null,
  lock: (message) => set({ message }),
  clear: () => set({ message: null }),
}))
