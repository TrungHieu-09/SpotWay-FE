import { create } from 'zustand'
import { getBuildingOverview } from '../api/navigation'
import {
  createPublicRoute,
  getPublicFloorMap,
  getPublicFloors,
  searchPublicDestinations,
} from '../api/publicNavigation'
import { createNavigationDataSlice, type NavigationGateway } from './createNavigationDataSlice'
import { createSimulationSlice } from './createSimulationSlice'
import type { NavigationState } from './navigationState'

export type {
  DemoScenarioId,
  FireScenarioId,
  HappyScenarioId,
  NavigationState,
  RouteWarning,
} from './navigationState'

const navigationGateway: NavigationGateway = {
  getFloors: getPublicFloors,
  getFloorMap: getPublicFloorMap,
  searchDestinations: searchPublicDestinations,
  getVerticalLinks: async (buildingId) => (await getBuildingOverview(buildingId)).verticalLinks ?? [],
  createRoute: createPublicRoute,
}

export const useNavigationStore = create<NavigationState>()((...args) => ({
  ...createNavigationDataSlice(navigationGateway)(...args),
  ...createSimulationSlice()(...args),
}))
