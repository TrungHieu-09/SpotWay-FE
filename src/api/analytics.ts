import { apiClient } from './client'

export type NavigationAnalytics = {
  days: number
  events: number
  byType: Record<string, number>
  daily: { date: string; count: number }[]
  topSearches: { query: string; count: number }[]
  topDestinations: { storeId: string; name: string | null; count: number }[]
  routes: { started: number; completed: number; evacuations: number; avgDurationSeconds: number | null }
  qrScans: number
  storeViews: number
}

export async function getNavigationAnalytics() {
  const { data } = await apiClient.get<NavigationAnalytics>('/analytics/navigation')
  return data
}
