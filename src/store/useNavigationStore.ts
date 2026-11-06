import { create } from 'zustand'
import {
  createPublicRoute,
  getPublicFloorMap,
  getPublicFloors,
  getPublicVerticalLinks,
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
  getVerticalLinks: getPublicVerticalLinks,
  createRoute: createPublicRoute,
}

export const useNavigationStore = create<NavigationState>()((...args) => ({
  ...createNavigationDataSlice(navigationGateway)(...args),
  ...createSimulationSlice()(...args),
}))
