export type ContractLifecycleStatus = 'active' | 'expiring' | 'expired' | 'terminated'
export type ContractPaymentStatus = 'paid' | 'pending' | 'custom'
export type ContractCurrency = 'USD' | 'VND'
export type RenewalUnit = 'day' | 'month'

/** A contract counts as "expiring soon" (and the owner is warned) this many days before it ends. */
export const EXPIRING_SOON_DAYS = 30

/** "45 ngày" / "6 tháng" */
export function formatRenewalAmount(amount: number, unit: RenewalUnit): string {
  return `${amount} ${unit === 'day' ? 'ngày' : 'tháng'}`
}

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
  /** First day without service when the admin ended the contract early. */
  terminatedAt?: string | null
  terminationReason?: string | null
  /** How much time the owner asked to add, in `renewalUnit` (only while a request is open). */
  renewalAmount?: number | null
  renewalUnit?: RenewalUnit | null
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
  if (!(contract.annualValue > 0)) return 'Chưa ghi giá trị'
  if (contract.currency === 'VND') {
    return `${contract.annualValue.toLocaleString('vi-VN')} ₫`
  }
  return `$${contract.annualValue.toLocaleString('en-US')}`
}

export interface ContractAlert {
  contract: ServiceContract
  daysRemaining: number
}

/**
 * The contract an owner should be warned about: only when the one that lasts longest is about to end
 * (an older, already expired contract next to a running one is not an alarm).
 */
export function getContractAlert(contracts: ServiceContract[]): ContractAlert | null {
  let current: ContractAlert | null = null
  for (const contract of contracts) {
    const { daysRemaining } = getContractLifecycle(contract)
    if (!current || daysRemaining > current.daysRemaining) current = { contract, daysRemaining }
  }
  return current && current.daysRemaining <= EXPIRING_SOON_DAYS ? current : null
}

function dayBefore(day: string): string {
  const date = new Date(day + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export function getContractLifecycle(contract: ServiceContract): ContractLifecycleInfo {
  const now = new Date()
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  // An early termination moves the last usable day to the day before it.
  const endedEarly = Boolean(contract.terminatedAt) && dayBefore(contract.terminatedAt as string) < contract.endDate
  const lastDay = endedEarly ? dayBefore(contract.terminatedAt as string) : contract.endDate
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const startMs = new Date(contract.startDate).getTime() || todayMs
  const endMs = new Date(lastDay).getTime() || todayMs

  const dayMs = 1000 * 60 * 60 * 24
  const totalDays = Math.max(1, Math.round((endMs - startMs) / dayMs))
  const daysRemaining = Math.round((endMs - todayMs) / dayMs)
  const elapsedDays = Math.max(0, Math.min(totalDays, totalDays - daysRemaining))
  const elapsedPercent = Math.max(4, Math.min(100, Math.round((elapsedDays / totalDays) * 100)))
  const durationMonths = Math.max(1, Math.round(totalDays / 30))

  let status: ContractLifecycleStatus = 'active'
  let statusLabel = 'Đang hiệu lực'

  if (endedEarly && (contract.terminatedAt as string) <= todayIso) {
    status = 'terminated'
    statusLabel = 'Đã kết thúc sớm'
  } else if (daysRemaining < 0) {
    status = 'expired'
    statusLabel = 'Hết hạn'
  } else if (daysRemaining <= EXPIRING_SOON_DAYS) {
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

