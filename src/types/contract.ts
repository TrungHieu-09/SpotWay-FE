export type ContractLifecycleStatus = 'active' | 'expiring' | 'expired'
export type ContractPaymentStatus = 'paid' | 'pending' | 'custom'
export type ContractCurrency = 'USD' | 'VND'

export interface ContractScanPage {
  fileName: string
  sizeText: string
  mime: string
  dataUrl: string
}

export interface ServiceContract {
  id: string
  contractCode: string
  ownerId?: string | null
  tenantId?: string | null
  customerName: string
  ownerEmail: string
  representative: string
  workspaceDomain: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  annualValue: number
  currency: ContractCurrency
  billingLabel?: string | null
  paymentStatus: ContractPaymentStatus
  maxBuildings: number
  maxFloors: number
  pageCount: number
  /** True when a scan is stored. List responses leave `scanPages` empty; the detail endpoints fill it in. */
  hasScan: boolean
  scanFileName?: string | null
  scanPages: ContractScanPage[]
  notes: string
  renewalRequested?: boolean
  renewalNote?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateServiceContractPayload {
  contractCode: string
  ownerId: string
  startDate: string
  endDate: string
  annualValue: number
  currency: ContractCurrency
  paymentStatus: ContractPaymentStatus
  scanPages: ContractScanPage[]
  notes: string
}

export type UpdateServiceContractPayload = Partial<CreateServiceContractPayload> & {
  renewalRequested?: boolean
  renewalNote?: string | null
}

export interface ContractLifecycleInfo {
  status: ContractLifecycleStatus
  statusLabel: string
  daysRemaining: number
  totalDays: number
  elapsedPercent: number
  formattedStartDate: string
  formattedEndDate: string
  durationMonths: number
}

export function formatDateVN(isoDate: string): string {
  if (!isoDate) return '—'
  const parts = isoDate.slice(0, 10).split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function formatContractValue(contract: ServiceContract): string {
  if (contract.billingLabel && contract.billingLabel.trim().length > 0) {
    return contract.billingLabel
  }
  if (contract.currency === 'VND') {
    return `${contract.annualValue.toLocaleString('vi-VN')} ₫`
  }
  return `$${contract.annualValue.toLocaleString('en-US')}`
}

export function getContractLifecycle(contract: ServiceContract): ContractLifecycleInfo {
  const now = new Date()
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const startMs = new Date(contract.startDate).getTime() || todayMs
  const endMs = new Date(contract.endDate).getTime() || todayMs

  const dayMs = 1000 * 60 * 60 * 24
  const totalDays = Math.max(1, Math.round((endMs - startMs) / dayMs))
  const daysRemaining = Math.round((endMs - todayMs) / dayMs)
  const elapsedDays = Math.max(0, Math.min(totalDays, totalDays - daysRemaining))
  const elapsedPercent = Math.max(4, Math.min(100, Math.round((elapsedDays / totalDays) * 100)))
  const durationMonths = Math.max(1, Math.round(totalDays / 30))

  let status: ContractLifecycleStatus = 'active'
  let statusLabel = 'Đang hiệu lực'

  if (daysRemaining < 0) {
    status = 'expired'
    statusLabel = 'Hết hạn'
  } else if (daysRemaining <= 45) {
    status = 'expiring'
    statusLabel = `Sắp hết hạn (${daysRemaining} ngày)`
  }

  return {
    status,
    statusLabel,
    daysRemaining,
    totalDays,
    elapsedPercent,
    formattedStartDate: formatDateVN(contract.startDate),
    formattedEndDate: formatDateVN(contract.endDate),
    durationMonths,
  }
}

