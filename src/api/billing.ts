import { apiClient } from './client'
import type { BillingPlan, PayOrderResult, PlanOrder } from '../types/billing'

export async function getBillingPlans() {
  const { data } = await apiClient.get<BillingPlan[]>('/billing/plans')
  return data
}

export async function getOrder(orderId: string) {
  const { data } = await apiClient.get<PlanOrder>(`/billing/orders/${orderId}`)
  return data
}

export async function payOrder(orderId: string) {
  const { data } = await apiClient.post<PayOrderResult>(`/billing/orders/${orderId}/pay`)
  return data
}

export async function cancelOrder(orderId: string) {
  const { data } = await apiClient.post<PlanOrder>(`/billing/orders/${orderId}/cancel`)
  return data
}
