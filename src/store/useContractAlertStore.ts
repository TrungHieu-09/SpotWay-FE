import { create } from 'zustand'
import { getOwnerContracts } from '../api/contracts'
import { getContractAlert, type ContractAlert } from '../types/contract'

type ContractAlertState = {
  /** Set while the owner's current contract is running out (or already out) and needs attention. */
  alert: ContractAlert | null
  load: () => Promise<void>
}

export const useContractAlertStore = create<ContractAlertState>((set) => ({
  alert: null,
  async load() {
    try {
      set({ alert: getContractAlert(await getOwnerContracts()) })
    } catch {
      // A failed check must never get in the way of the rest of the app: the contracts page shows real errors.
      set({ alert: null })
    }
  },
}))
