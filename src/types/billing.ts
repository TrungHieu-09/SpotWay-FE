import type { AuthUser } from './auth'

export type OrderKind = 'NEW_WORKSPACE' | 'RENEWAL'

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export type PlanOrder = {
  id: string
  kind: OrderKind
  planId: string
  planName: string
  months: number
  amountVnd: number
  status: OrderStatus
  workspaceName: string | null
  subdomain: string | null
  createdAt: string
  paidAt: string | null
}

export type CreateWorkspaceOrderPayload = {
  planId: string
  months: number
  workspaceName: string
  subdomain: string
}

export type AuthSession = {
  user: AuthUser
  accessToken?: string
  refreshToken?: string
}

export type PayOrderResult = {
  order: PlanOrder
  /** Present when paying provisioned a new workspace: fresh tokens for the (now) Building Owner. */
  session: AuthSession | null
}

/** Per-month price when paying 12+ months, and per-month price below that (mirrors BE `plans.ts`). */
export type BillingPlan = {
  id: string
  name: string
  priceVnd: number
  monthlyPriceVnd: number
}
