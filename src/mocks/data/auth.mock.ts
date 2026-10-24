import type { Invoice, Plan, Tenant, User } from '../../types/auth'
import { loadFromStorage, MOCK_STORAGE_KEYS, saveToStorage } from '../persist'

export const initialPlansSeed: Plan[] = [
  {
    id: 'plan-basic',
    name: 'Cơ bản',
    maxBuildings: 2,
    maxManagers: 3,
    maxStoreOwners: 20,
    priceVnd: 1_990_000,
    durationMonths: 1,
  },
  {
    id: 'plan-pro',
    name: 'Chuyên nghiệp',
    maxBuildings: 5,
    maxManagers: 6,
    maxStoreOwners: 100,
    priceVnd: 4_990_000,
    durationMonths: 1,
  },
  {
    id: 'plan-enterprise',
    name: 'Doanh nghiệp',
    maxBuildings: 9999,
    maxManagers: 9999,
    maxStoreOwners: 9999,
    priceVnd: 14_990_000,
    durationMonths: 1,
  },
]

export const initialTenantsSeed: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Saigon Retail Group',
    subdomain: 'saigon-retail',
    planId: 'plan-pro',
    status: 'active',
    planExpiresAt: '2027-12-31T23:59:59.000Z',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'tenant-2',
    name: 'Hanoi Office Holdings',
    subdomain: 'hanoi-office',
    planId: 'plan-basic',
    status: 'active',
    planExpiresAt: '2027-06-30T23:59:59.000Z',
    createdAt: '2026-09-02T08:00:00.000Z',
  },
]

export const initialUsersSeed: Array<User & { password: string }> = [
  { id: 'user-admin', tenantId: null, role: 'admin', name: 'Quản trị viên', email: 'admin@demo.vn', password: 'Demo@123', createdByUserId: null, mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'user-owner-1', tenantId: 'tenant-1', role: 'building_owner', name: 'Chủ tòa nhà Saigon', email: 'owner1@demo.vn', password: 'Demo@123', createdByUserId: 'user-admin', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:10:00.000Z' },
  { id: 'user-manager-1a', tenantId: 'tenant-1', role: 'building_manager', name: 'Quản lý Thời trang', email: 'manager1a@demo.vn', password: 'Demo@123', areaIds: ['area-fashion'], createdByUserId: 'user-owner-1', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:20:00.000Z' },
  { id: 'user-manager-1b', tenantId: 'tenant-1', role: 'building_manager', name: 'Quản lý Ẩm thực', email: 'manager1b@demo.vn', password: 'Demo@123', areaIds: ['area-food'], createdByUserId: 'user-owner-1', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:21:00.000Z' },
  { id: 'user-lumi', tenantId: 'tenant-1', role: 'store_owner', name: 'Lumi Fashion', email: 'lumi@demo.vn', password: 'Demo@123', createdByUserId: 'user-manager-1a', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:30:00.000Z' },
  { id: 'user-green', tenantId: 'tenant-1', role: 'store_owner', name: 'Green Home', email: 'green@demo.vn', password: 'Demo@123', createdByUserId: 'user-manager-1a', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:40:00.000Z' },
  { id: 'user-bep', tenantId: 'tenant-1', role: 'store_owner', name: 'Bếp Saigon', email: 'bep@demo.vn', password: 'Demo@123', createdByUserId: 'user-manager-1b', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:41:00.000Z' },
  { id: 'user-owner-2', tenantId: 'tenant-2', role: 'building_owner', name: 'Chủ tòa nhà Hà Nội', email: 'owner2@demo.vn', password: 'Demo@123', createdByUserId: 'user-admin', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T08:50:00.000Z' },
  { id: 'user-manager-2', tenantId: 'tenant-2', role: 'building_manager', name: 'Quản lý Hà Nội', email: 'manager2@demo.vn', password: 'Demo@123', areaIds: ['area-office'], createdByUserId: 'user-owner-2', mustChangePassword: false, status: 'active', createdAt: '2026-09-01T09:00:00.000Z' },
]

export const initialInvoicesSeed: Invoice[] = [
  { id: 'invoice-1', tenantId: 'tenant-1', planId: 'plan-pro', amountVnd: 49_900_000, months: 12, paidAt: '2026-09-01T08:00:00.000Z', status: 'paid' },
  { id: 'invoice-2', tenantId: 'tenant-2', planId: 'plan-basic', amountVnd: 23_880_000, months: 12, paidAt: '2026-09-02T08:00:00.000Z', status: 'paid' },
]

const storedPlans = loadFromStorage(MOCK_STORAGE_KEYS.plans, initialPlansSeed)
export const plans = Array.isArray(storedPlans) && storedPlans.length > 0 ? storedPlans : initialPlansSeed

const storedTenants = loadFromStorage(MOCK_STORAGE_KEYS.tenants, initialTenantsSeed)
export const tenants = Array.isArray(storedTenants) && storedTenants.length > 0 ? storedTenants : initialTenantsSeed

const storedUsers = loadFromStorage(MOCK_STORAGE_KEYS.users, initialUsersSeed)
const validStoredUsers = Array.isArray(storedUsers)
  ? storedUsers.filter((u) => u && typeof u === 'object' && u.email && u.id)
  : []
export const users = validStoredUsers.length > 0 ? validStoredUsers : initialUsersSeed

const storedInvoices = loadFromStorage(MOCK_STORAGE_KEYS.invoices, initialInvoicesSeed)
export const invoices = Array.isArray(storedInvoices) && storedInvoices.length > 0 ? storedInvoices : initialInvoicesSeed

saveToStorage(MOCK_STORAGE_KEYS.plans, plans)
saveToStorage(MOCK_STORAGE_KEYS.tenants, tenants)
saveToStorage(MOCK_STORAGE_KEYS.users, users)
saveToStorage(MOCK_STORAGE_KEYS.invoices, invoices)
