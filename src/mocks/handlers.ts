import { delay, http, HttpResponse, passthrough } from 'msw'
import { buildings } from './data/buildings.mock'
import { fallbackMap, floors } from './data/floors.mock'
import { MOCK_STORAGE_KEYS, saveToStorage } from './persist'
import type { Building } from '../types/building'
import type {
  CreateFloorPayload,
  Floor,
  UpdateFloorPayload,
} from '../types/floor'
import type { Poi } from '../types/poi'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function endpoint(path: string) {
  return `${API_BASE}${path}`
}

function makeFloor(payload: CreateFloorPayload): Floor {
  const mapImageUrl =
    payload.mapImageUrl !== undefined
      ? payload.mapImageUrl
      : payload.planImageUrl !== undefined
        ? payload.planImageUrl
        : fallbackMap()

  return {
    id: `floor-${crypto.randomUUID()}`,
    buildingId: payload.buildingId,
    name: payload.name,
    level: payload.level,
    publishStatus: payload.publishStatus ?? 'draft',
    mapImageUrl,
    mapWidth: payload.mapWidth ?? 1200,
    mapHeight: payload.mapHeight ?? 760,
    pois: [],
  }
}

async function planImageToUrl(file: File) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return `data:${file.type};base64,${btoa(binary)}`
}

// ── Mock data for auth / tenant ──────────────────────────────────────────────
const MOCK_OWNER_USER = {
  id: 'user-owner-1',
  tenantId: 'tenant-1',
  role: 'building_owner',
  name: 'Nguyễn Văn A',
  email: 'owner1@demo.vn',
  mustChangePassword: false,
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  createdByUserId: null,
  tenant: {
    id: 'tenant-1',
    name: 'SpotWay Demo Corp',
    subdomain: 'demo',
    planId: 'plan-pro',
    status: 'active',
    planExpiresAt: '2027-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
}

const MOCK_PLAN = {
  id: 'plan-pro',
  name: 'Professional',
  maxBuildings: 10,
  maxManagers: 20,
  maxStoreOwners: 50,
  priceVnd: 1_500_000,
  durationMonths: 1,
}

const mockTenantUsers = [
  {
    id: 'u-mgr-1',
    tenantId: 'tenant-1',
    role: 'building_manager',
    name: 'Trần Quản Lý',
    email: 'manager1@demo.vn',
    areaIds: ['area-1'],
    mustChangePassword: false,
    status: 'active',
    createdAt: '2024-03-01T00:00:00Z',
    createdByUserId: 'user-owner-1',
  },
  {
    id: 'u-store-1',
    tenantId: 'tenant-1',
    role: 'store_owner',
    name: 'Lê Chủ Gian',
    email: 'store1@demo.vn',
    mustChangePassword: false,
    status: 'active',
    createdAt: '2024-03-05T00:00:00Z',
    createdByUserId: 'user-owner-1',
  },
]

const mockAreas = [
  { id: 'area-1', tenantId: 'tenant-1', buildingId: 'b1', name: 'Khu A', description: 'Tầng thương mại', color: '#8B5CF6', createdAt: '2024-02-01T00:00:00Z' },
  { id: 'area-2', tenantId: 'tenant-1', buildingId: 'b1', name: 'Khu B', description: 'Khu ẩm thực', color: '#22D3EE', createdAt: '2024-02-05T00:00:00Z' },
]

const mockInvoices = [
  { id: 'inv-1', tenantId: 'tenant-1', planId: 'plan-pro', amountVnd: 18_000_000, months: 12, paidAt: '2024-01-01T00:00:00Z', status: 'paid' },
  { id: 'inv-2', tenantId: 'tenant-1', planId: 'plan-pro', amountVnd: 1_500_000, months: 1, paidAt: '2024-06-01T00:00:00Z', status: 'paid' },
]

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post(endpoint('/auth/login'), async ({ request }) => {
    await delay(400)
    const body = await request.json() as { email: string; password: string }
    const user = body.email.includes('manager') || body.email === 'manager1@demo.vn'
      ? { ...MOCK_OWNER_USER, id: 'u-mgr-1', role: 'building_manager', name: 'Trần Quản Lý', email: body.email }
      : MOCK_OWNER_USER
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItb3duZXItMSIsInJvbGUiOiJidWlsZGluZ19vd25lciIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.mock-sig'
    return HttpResponse.json({ success: true, data: { token, user } })
  }),

  http.get(endpoint('/auth/me'), async () => {
    await delay(150)
    return HttpResponse.json({ success: true, data: MOCK_OWNER_USER })
  }),

  http.post(endpoint('/auth/logout'), async () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Tenant ────────────────────────────────────────────────────────────────
  http.get(endpoint('/tenant/overview'), async () => {
    await delay(300)
    return HttpResponse.json({
      success: true,
      data: {
        tenant: MOCK_OWNER_USER.tenant,
        plan: MOCK_PLAN,
        usage: { buildings: 2, areas: 2, managers: 1, storeOwners: 1, floors: 5, publishedFloors: 3, stores: 4, activePromotions: 2 },
      },
    })
  }),

  http.get(endpoint('/tenant/users'), async () => {
    await delay(250)
    return HttpResponse.json({ success: true, data: mockTenantUsers })
  }),

  http.post(endpoint('/tenant/users'), async ({ request }) => {
    await delay(400)
    const body = await request.json() as { name: string; email: string; role: string; areaIds?: string[] }
    const newUser = { id: `u-${crypto.randomUUID()}`, tenantId: 'tenant-1', role: body.role, name: body.name, email: body.email, areaIds: body.areaIds ?? [], mustChangePassword: true, status: 'active', createdAt: new Date().toISOString(), createdByUserId: 'user-owner-1', temporaryPassword: 'Demo@123' }
    mockTenantUsers.push(newUser)
    return HttpResponse.json({ success: true, data: newUser }, { status: 201 })
  }),

  http.patch(endpoint('/tenant/users/:userId'), async ({ params, request }) => {
    await delay(250)
    const body = await request.json() as { status?: string; resetPassword?: boolean; areaIds?: string[] }
    const user = mockTenantUsers.find((u) => u.id === params.userId)
    if (!user) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    if (body.status) user.status = body.status as 'active'
    if (body.areaIds) user.areaIds = body.areaIds
    const response = body.resetPassword ? { ...user, temporaryPassword: 'NewPass@123' } : user
    return HttpResponse.json({ success: true, data: response })
  }),

  http.delete(endpoint('/tenant/users/:userId'), async ({ params }) => {
    await delay(200)
    const idx = mockTenantUsers.findIndex((u) => u.id === params.userId)
    if (idx >= 0) mockTenantUsers.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(endpoint('/tenant/areas'), async () => {
    await delay(200)
    return HttpResponse.json({ success: true, data: mockAreas })
  }),

  http.get(endpoint('/tenant/invoices'), async () => {
    await delay(250)
    return HttpResponse.json({ success: true, data: mockInvoices })
  }),

  http.get(endpoint('/tenant/plans'), async () => {
    await delay(200)
    return HttpResponse.json({ success: true, data: [
      MOCK_PLAN,
      { id: 'plan-starter', name: 'Starter', maxBuildings: 3, maxManagers: 5, maxStoreOwners: 10, priceVnd: 500_000, durationMonths: 1 },
      { id: 'plan-enterprise', name: 'Enterprise', maxBuildings: 50, maxManagers: 100, maxStoreOwners: 200, priceVnd: 5_000_000, durationMonths: 1 },
    ]})
  }),

  http.post(endpoint('/tenant/subscription/renew'), async ({ request }) => {
    await delay(500)
    const body = await request.json() as { planId: string; months: number }
    const plan = { id: body.planId, name: body.planId === 'plan-pro' ? 'Professional' : 'Starter', maxBuildings: 10, maxManagers: 20, maxStoreOwners: 50, priceVnd: 1_500_000, durationMonths: 1 }
    const newExpiry = new Date(Date.now() + body.months * 30 * 86400 * 1000).toISOString()
    return HttpResponse.json({ success: true, data: { tenant: { ...MOCK_OWNER_USER.tenant, planExpiresAt: newExpiry }, plan, usage: { buildings: 2, areas: 2, managers: 1, storeOwners: 1, floors: 5, publishedFloors: 3, stores: 4, activePromotions: 2 } } })
  }),

  // ── Areas ─────────────────────────────────────────────────────────────────
  http.get(endpoint('/buildings/:buildingId/areas'), async ({ params }) => {
    await delay(200)
    return HttpResponse.json({ success: true, data: mockAreas.filter((a) => a.buildingId === params.buildingId || true) })
  }),

  http.post(endpoint('/buildings/:buildingId/areas'), async ({ params, request }) => {
    await delay(300)
    const body = await request.json() as { name: string; description?: string; color: string }
    const area = { id: `area-${crypto.randomUUID()}`, tenantId: 'tenant-1', buildingId: params.buildingId as string, name: body.name, description: body.description ?? '', color: body.color, createdAt: new Date().toISOString() }
    mockAreas.push(area)
    return HttpResponse.json({ success: true, data: area }, { status: 201 })
  }),

  http.patch(endpoint('/areas/:areaId'), async ({ params, request }) => {
    await delay(250)
    const body = await request.json() as { name?: string; description?: string; color?: string }
    const area = mockAreas.find((a) => a.id === params.areaId)
    if (!area) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    Object.assign(area, body)
    return HttpResponse.json({ success: true, data: area })
  }),

  http.delete(endpoint('/areas/:areaId'), async ({ params }) => {
    await delay(200)
    const idx = mockAreas.findIndex((a) => a.id === params.areaId)
    if (idx >= 0) mockAreas.splice(idx, 1)
    return new HttpResponse(null, { status: 204 })
  }),


  http.get(endpoint('/buildings'), async () => {
    await delay(250)
    return HttpResponse.json(buildings)
  }),

  http.post(endpoint('/buildings'), async ({ request }) => {
    await delay(350)
    const formData = await request.formData()
    const file = formData.get('planImage')
    const fileUrl = file instanceof File ? await planImageToUrl(file) : fallbackMap()
    const building: Building = {
      id: `bldg-${crypto.randomUUID()}`,
      name: String(formData.get('name') ?? 'Untitled building'),
      address: String(formData.get('address') ?? ''),
      status: 'draft',
      floorCount: 1,
      createdAt: new Date().toISOString(),
      planImageUrl: fileUrl,
    }

    buildings.unshift(building)
    floors.push(
      makeFloor({
        buildingId: building.id,
        name: 'Ground Floor',
        level: 0,
        mapImageUrl: fileUrl,
      }),
    )
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)

    return HttpResponse.json(building, { status: 201 })
  }),

  http.get(endpoint('/buildings/:buildingId/floors'), async ({ params }) => {
    await delay(220)
    const buildingFloors = floors.filter(
      (floor) => floor.buildingId === params.buildingId,
    )
    return HttpResponse.json(buildingFloors)
  }),

  http.post(endpoint('/floors'), async ({ request }) => {
    await delay(180)
    const payload = (await request.json()) as CreateFloorPayload
    const hasSameLevel = floors.some(
      (floor) =>
        floor.buildingId === payload.buildingId && floor.level === payload.level,
    )

    if (hasSameLevel) {
      return HttpResponse.json(
        { message: 'Floor level already exists' },
        { status: 409 },
      )
    }

    const floor = makeFloor(payload)
    floors.push(floor)

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (building) {
      building.floorCount += 1
    }
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)

    return HttpResponse.json(floor, { status: 201 })
  }),

  http.patch(endpoint('/floors/:floorId'), async ({ params, request }) => {
    await delay(140)
    const payload = (await request.json()) as UpdateFloorPayload
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    if (payload.level !== undefined) {
      const hasSameLevel = floors.some(
        (item) =>
          item.buildingId === floor.buildingId &&
          item.id !== floor.id &&
          item.level === payload.level,
      )

      if (hasSameLevel) {
        return HttpResponse.json(
          { message: 'Floor level already exists' },
          { status: 409 },
        )
      }
    }

    floor.name = payload.name ?? floor.name
    floor.level = payload.level ?? floor.level
    floor.publishStatus = payload.publishStatus ?? floor.publishStatus
    floor.mapImageUrl =
      payload.mapImageUrl !== undefined
        ? payload.mapImageUrl
        : payload.planImageUrl !== undefined
          ? payload.planImageUrl
          : floor.mapImageUrl
    floor.mapWidth = payload.mapWidth ?? floor.mapWidth
    floor.mapHeight = payload.mapHeight ?? floor.mapHeight

    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    return HttpResponse.json(floor)
  }),

  http.delete(endpoint('/floors/:floorId'), async ({ params }) => {
    await delay(140)
    const floorIndex = floors.findIndex((item) => item.id === params.floorId)

    if (floorIndex < 0) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    const floor = floors[floorIndex]
    const buildingFloorCount = floors.filter(
      (item) => item.buildingId === floor.buildingId,
    ).length

    if (buildingFloorCount <= 1) {
      return HttpResponse.json(
        { message: 'Building must have at least one floor' },
        { status: 400 },
      )
    }

    floors.splice(floorIndex, 1)

    const building = buildings.find((item) => item.id === floor.buildingId)
    if (building) {
      building.floorCount = floors.filter(
        (item) => item.buildingId === floor.buildingId,
      ).length
    }

    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    saveToStorage(MOCK_STORAGE_KEYS.buildings, buildings)

    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(endpoint('/floors/:floorId/pois'), async ({ params, request }) => {
    await delay(140)
    const payload = (await request.json()) as Poi[]
    const floor = floors.find((item) => item.id === params.floorId)

    if (!floor) {
      return HttpResponse.json({ message: 'Floor not found' }, { status: 404 })
    }

    floor.pois = payload
    saveToStorage(MOCK_STORAGE_KEYS.floors, floors)
    return HttpResponse.json(floor.pois)
  }),

  http.get('*', ({ request }) => {
    const url = new URL(request.url)
    const isAppRouteImageRequest =
      url.origin === window.location.origin &&
      request.destination === 'image' &&
      (url.pathname === '/manager' || url.pathname.startsWith('/owner/'))

    if (isAppRouteImageRequest) {
      return new HttpResponse(null, { status: 204 })
    }

    return passthrough()
  }),
]

