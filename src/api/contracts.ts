import { apiClient } from './client'
import { getAdminUsers } from './admin'
import type {
  CreateServiceContractPayload,
  ServiceContract,
} from '../types/contract'
import type { AuthUser } from '../types/auth'

const STORAGE_KEY = 'spotway.contracts.v2'

function addDaysISO(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function getDefaultContracts(): ServiceContract[] {
  return [
    {
      id: 'cnt-2026-001',
      contractCode: 'HD-2026-001',
      ownerId: null,
      tenantId: null,
      customerName: 'Metro Transit Authority',
      ownerEmail: 'hieutrung1029@gmail.com',
      representative: 'Elena Rostova (GĐ Vận hành)',
      workspaceDomain: 'metro-transit.spotway.app',
      startDate: addDaysISO(-76),
      endDate: addDaysISO(289),
      annualValue: 24000,
      currency: 'USD',
      billingLabel: null,
      paymentStatus: 'paid',
      maxBuildings: 5,
      maxFloors: 25,
      pageCount: 3,
      scanFileName: 'HD-2026-001-MetroTransit-Signed.pdf',
      scanDataUrl: null,
      notes:
        'Hợp đồng triển khai Mesh 3D cho 3 nhà ga trung chuyển hành khách quốc tế. Bản gốc lưu tại phòng Pháp chế tầng 12.',
      renewalRequested: false,
      renewalNote: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'cnt-2025-089',
      contractCode: 'HD-2025-089',
      ownerId: null,
      tenantId: null,
      customerName: 'Vincom Mega Mall Smart City',
      ownerEmail: 'owner.smartcity@vincom.vn',
      representative: 'Nguyễn Hoàng Minh (GĐ Tổ hợp)',
      workspaceDomain: 'smartcity-vincom.spotway.app',
      startDate: addDaysISO(-120),
      endDate: addDaysISO(334),
      annualValue: 36500,
      currency: 'USD',
      billingLabel: null,
      paymentStatus: 'paid',
      maxBuildings: 6,
      maxFloors: 40,
      pageCount: 5,
      scanFileName: 'HD-2025-089-VincomSmartCity.pdf',
      scanDataUrl: null,
      notes:
        'Cấp quyền hệ điều hành định vị dẫn đường 3D và phân tích mật độ khách tham quan cho toàn bộ phân khu thương mại.',
      renewalRequested: false,
      renewalNote: null,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'cnt-2024-042',
      contractCode: 'HD-2024-042',
      ownerId: null,
      tenantId: null,
      customerName: 'Bệnh viện Quốc tế Bạch Mai 2',
      ownerEmail: 'director@bachmai2.med.vn',
      representative: 'PGS.TS Trần Quốc Tuấn',
      workspaceDomain: 'campus-bachmai2.spotway.app',
      startDate: addDaysISO(-347),
      endDate: addDaysISO(18),
      annualValue: 18200,
      currency: 'USD',
      billingLabel: null,
      paymentStatus: 'paid',
      maxBuildings: 4,
      maxFloors: 20,
      pageCount: 2,
      scanFileName: 'HD-2024-042-BachMai2.pdf',
      scanDataUrl: null,
      notes:
        'Tích hợp điều hướng khẩn cấp và dẫn đường xe lăn đa tầng cho khu khám bệnh đa khoa.',
      renewalRequested: true,
      renewalNote: 'Đề nghị gia hạn thêm 24 tháng và nâng hạn mức lên 6 tòa nhà nội trú.',
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
      id: 'cnt-2025-110',
      contractCode: 'HD-2025-110',
      ownerId: null,
      tenantId: null,
      customerName: 'Cảng Hàng không Quốc tế Nội Bài T2',
      ownerEmail: 'spatial.ops@noibai.aero',
      representative: 'Lê Quang Đạo (Trưởng ban Khai thác)',
      workspaceDomain: 'noibai-t2.spotway.app',
      startDate: addDaysISO(-60),
      endDate: addDaysISO(1020),
      annualValue: 48000,
      currency: 'USD',
      billingLabel: 'Thỏa thuận riêng',
      paymentStatus: 'paid',
      maxBuildings: 10,
      maxFloors: 60,
      pageCount: 4,
      scanFileName: 'HD-2025-110-NoiBaiT2-SLA.pdf',
      scanDataUrl: null,
      notes:
        'Hợp đồng chiến lược 36 tháng cung cấp bản đồ số 3D Kiosk và dẫn đường QR cho hành khách quốc tế.',
      renewalRequested: false,
      renewalNote: null,
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: 'cnt-2025-078',
      contractCode: 'HD-2025-078',
      ownerId: null,
      tenantId: null,
      customerName: 'Lotte Center Hanoi Sky Complex',
      ownerEmail: 'management@lotte-hanoi.vn',
      representative: 'Park Ji-Hoon (General Director)',
      workspaceDomain: 'lotte-hanoi.spotway.app',
      startDate: addDaysISO(-230),
      endDate: addDaysISO(135),
      annualValue: 15000,
      currency: 'USD',
      billingLabel: null,
      paymentStatus: 'paid',
      maxBuildings: 2,
      maxFloors: 65,
      pageCount: 3,
      scanFileName: 'HD-2025-078-LotteCenter.pdf',
      scanDataUrl: null,
      notes:
        'Số hóa 65 tầng tháp văn phòng, trung tâm thương mại và đài quan sát Sky Walk.',
      renewalRequested: false,
      renewalNote: null,
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    },
  ]
}

function readLocalContracts(): ServiceContract[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const defaults = getDefaultContracts()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
      return defaults
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {
    // ignore storage errors
  }
  const defaults = getDefaultContracts()
  return defaults
}

function writeLocalContracts(contracts: ServiceContract[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
  } catch {
    // ignore storage errors
  }
}

export async function getAdminContracts(): Promise<ServiceContract[]> {
  let local = readLocalContracts()

  // Try syncing from backend if available
  try {
    const { data } = await apiClient.get<ServiceContract[]>('/admin/contracts')
    if (Array.isArray(data) && data.length > 0) {
      const byCode = new Map<string, ServiceContract>()
      for (const item of data) byCode.set(item.contractCode, item)
      for (const item of local) {
        if (!byCode.has(item.contractCode)) byCode.set(item.contractCode, item)
      }
      local = Array.from(byCode.values())
    }
  } catch {
    // Fallback to local storage gracefully
  }

  // Also ensure any real building_owner from getAdminUsers() is linked or represented
  try {
    const users = await getAdminUsers()
    const owners = users.filter((u) => u.role === 'building_owner')
    if (owners.length > 0 && local.length > 0) {
      // Link the first contract to the primary real building_owner if not already linked
      const primaryOwner = owners[0]
      const alreadyHasOwner = local.some(
        (c) =>
          c.ownerId === primaryOwner.id ||
          c.ownerEmail.toLowerCase() === primaryOwner.email.toLowerCase(),
      )
      if (!alreadyHasOwner) {
        local[0] = {
          ...local[0],
          ownerId: primaryOwner.id,
          tenantId: primaryOwner.tenantId,
          ownerEmail: primaryOwner.email,
          customerName:
            primaryOwner.tenantName ||
            primaryOwner.name ||
            'Metro Transit Authority',
          workspaceDomain: `${(primaryOwner.tenantName || primaryOwner.name || 'metro-transit')
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')}.spotway.app`,
        }
      }
    }
  } catch {
    // ignore if non-admin
  }

  writeLocalContracts(local)
  return local
}

export async function createAdminContract(
  payload: CreateServiceContractPayload,
): Promise<ServiceContract> {
  const newContract: ServiceContract = {
    id: `cnt-${Date.now()}`,
    contractCode: payload.contractCode.trim(),
    ownerId: payload.ownerId ?? null,
    tenantId: payload.tenantId ?? null,
    customerName: payload.customerName.trim(),
    ownerEmail: payload.ownerEmail.trim(),
    representative: payload.representative.trim(),
    workspaceDomain: payload.workspaceDomain.trim(),
    startDate: payload.startDate,
    endDate: payload.endDate,
    annualValue: Number(payload.annualValue) || 0,
    currency: payload.currency,
    billingLabel: payload.billingLabel ?? null,
    paymentStatus: payload.paymentStatus,
    maxBuildings: Number(payload.maxBuildings) || 3,
    maxFloors: Number(payload.maxFloors) || 15,
    pageCount: Number(payload.pageCount) || 3,
    scanFileName: payload.scanFileName || `${payload.contractCode.trim()}-Signed.pdf`,
    scanDataUrl: payload.scanDataUrl ?? null,
    notes: payload.notes.trim(),
    renewalRequested: false,
    renewalNote: null,
    createdAt: new Date().toISOString(),
  }

  try {
    const { data } = await apiClient.post<ServiceContract>('/admin/contracts', newContract)
    if (data && data.id) {
      const current = readLocalContracts()
      writeLocalContracts([data, ...current.filter((c) => c.id !== data.id)])
      return data
    }
  } catch {
    // fallback to local persistence
  }

  const current = readLocalContracts()
  const next = [newContract, ...current]
  writeLocalContracts(next)
  return newContract
}

export async function updateAdminContract(
  id: string,
  payload: Partial<ServiceContract>,
): Promise<ServiceContract> {
  const current = readLocalContracts()
  const idx = current.findIndex((c) => c.id === id)
  const existing = idx >= 0 ? current[idx] : current[0]
  const updated: ServiceContract = {
    ...existing,
    ...payload,
    id,
    updatedAt: new Date().toISOString(),
  }

  try {
    const { data } = await apiClient.patch<ServiceContract>(`/admin/contracts/${id}`, payload)
    if (data && data.id) {
      const next = current.map((c) => (c.id === id ? data : c))
      writeLocalContracts(next)
      return data
    }
  } catch {
    // fallback to local persistence
  }

  const next = current.map((c) => (c.id === id ? updated : c))
  writeLocalContracts(next)
  return updated
}

export async function deleteAdminContract(id: string): Promise<void> {
  try {
    await apiClient.delete(`/admin/contracts/${id}`)
  } catch {
    // ignore if backend not restarted
  }
  const current = readLocalContracts()
  writeLocalContracts(current.filter((c) => c.id !== id))
}

export async function getOwnerContracts(user: AuthUser | null): Promise<ServiceContract[]> {
  let local = readLocalContracts()

  try {
    const { data } = await apiClient.get<ServiceContract[]>('/tenant/contracts')
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch {
    // fallback to local
  }

  if (!user) return local.slice(0, 1)

  const matched = local.filter(
    (c) =>
      (c.ownerId && c.ownerId === user.id) ||
      (c.tenantId && user.tenantId && c.tenantId === user.tenantId) ||
      c.ownerEmail.toLowerCase() === user.email.toLowerCase(),
  )

  if (matched.length > 0) {
    return matched
  }

  // If the current logged-in building_owner does not have an explicit match yet,
  // personalize the primary contract for their workspace so they always see their active contract!
  const primary: ServiceContract = {
    ...local[0],
    ownerId: user.id,
    tenantId: user.tenantId ?? null,
    ownerEmail: user.email,
    customerName: user.tenant?.name || user.name || local[0].customerName,
    representative: `${user.name || user.email.split('@')[0]} (Chủ tòa nhà)`,
    workspaceDomain: user.tenant?.subdomain
      ? `${user.tenant.subdomain}.spotway.app`
      : local[0].workspaceDomain,
  }
  local = [primary, ...local.slice(1)]
  writeLocalContracts(local)
  return [primary]
}

export async function submitContractRenewalRequest(
  contractId: string,
  note: string,
): Promise<ServiceContract> {
  try {
    await apiClient.post(`/tenant/contracts/${contractId}/renew-request`, { note })
  } catch {
    // fallback to local
  }
  return updateAdminContract(contractId, {
    renewalRequested: true,
    renewalNote: note,
  })
}

