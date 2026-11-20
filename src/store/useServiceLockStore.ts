import { create } from 'zustand'

type ServiceLockState = {
  /** Set when the server answers CONTRACT_EXPIRED: the workspace's contract has ended. */
  message: string | null
  /** 'expired' = the end date passed, 'terminated' = the admin ended the contract early */
  kind: 'expired' | 'terminated'
  lock: (message: string, kind?: 'expired' | 'terminated') => void
  clear: () => void
}

export const useServiceLockStore = create<ServiceLockState>((set) => ({
  message: null,
  kind: 'expired',
  lock: (message, kind = 'expired') => set({ message, kind }),
  clear: () => set({ message: null, kind: 'expired' }),
}))
