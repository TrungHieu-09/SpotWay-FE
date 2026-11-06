/** Orders are only created to renew/upgrade an existing workspace. `NEW_WORKSPACE` is a legacy value that may still exist in old data. */
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
  createdAt: string
  paidAt: string | null
}

export type PayOrderResult = {
  order: PlanOrder
}

/** Per-month price when paying 12+ months, and per-month price below that (mirrors BE `plans.ts`). */
export type BillingPlan = {
  id: string
  name: string
  priceVnd: number
  monthlyPriceVnd: number
}
