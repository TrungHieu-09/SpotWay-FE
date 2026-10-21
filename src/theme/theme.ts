import { theme as antdTheme, type ThemeConfig } from 'antd'

export type ThemeMode = 'dark' | 'light'

const darkTokens = {
  blue25: '#17153A', blue50: '#211D4A', blue100: '#29245B', blue200: '#3A3180', blue300: '#5145A2', blue400: '#6C5CE7', blue500: '#7C3AED', blue600: '#8B5CF6', blue700: '#A78BFA', blue800: '#C4B5FD', blue900: '#EDE9FE',
  ink900: '#F8FAFC', ink700: '#E2E8F0', ink500: '#A8B2C5', ink400: '#74809A',
  surface: '#12112B', surfaceMuted: '#191737', page: '#08071A', border: '#2D2A55', borderStrong: '#464174',
  gold500: '#F2B84B', gold100: '#3D2E1B', success: '#42D6A4', successBg: '#12382F', warning: '#F2B84B', warningBg: '#3D2E1B', danger: '#FB7185', dangerBg: '#401F35',
} as const

const lightTokens = {
  blue25: '#F8FBFE', blue50: '#F1F7FD', blue100: '#E3EFFA', blue200: '#CBE0F4', blue300: '#A5CBEC', blue400: '#78AFDF', blue500: '#4D91CF', blue600: '#2F76B8', blue700: '#245E94', blue800: '#1C4A76', blue900: '#133352',
  ink900: '#0E2238', ink700: '#2C4259', ink500: '#5B6F84', ink400: '#8394A7',
  surface: '#FFFFFF', surfaceMuted: '#EEF5FB', page: '#F5F9FD', border: '#DCE7F1', borderStrong: '#C5D6E6',
  gold500: '#B59A5F', gold100: '#F5EFE1', success: '#2F8F74', successBg: '#E6F4EF', warning: '#B7791F', warningBg: '#FBF1DD', danger: '#BF4540', dangerBg: '#FBEAE9',
} as const

export const designTokens = darkTokens

export function getDesignTokens(mode: ThemeMode) {
  return mode === 'dark' ? darkTokens : lightTokens
}

export function createAppTheme(mode: ThemeMode, reducedMotion = false): ThemeConfig {
  const tokens = getDesignTokens(mode)
  return {
    algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: tokens.blue500, colorInfo: tokens.blue500, colorSuccess: tokens.success, colorWarning: tokens.warning, colorError: tokens.danger,
      colorBgLayout: tokens.page, colorBgContainer: tokens.surface, colorBgElevated: tokens.surfaceMuted, colorBorder: tokens.border, colorBorderSecondary: tokens.border,
      colorText: tokens.ink700, colorTextSecondary: tokens.ink500, colorTextHeading: tokens.ink900, borderRadius: 10,
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', controlHeight: 42, motion: !reducedMotion, zIndexPopupBase: 1100,
    },
    components: {
      Button: { primaryShadow: 'none', defaultShadow: 'none', borderRadius: 10 },
      Card: { borderRadiusLG: 16, boxShadowTertiary: mode === 'dark' ? '0 20px 80px rgba(0, 0, 0, .28)' : '0 16px 36px rgba(15, 23, 42, .06)' },
      Table: { headerBg: tokens.surfaceMuted, rowHoverBg: tokens.blue25 }, Tabs: { inkBarColor: tokens.blue500, itemSelectedColor: tokens.ink900 }, Modal: { titleFontSize: 20 },
      DatePicker: { zIndexPopup: 1100 }, Dropdown: { zIndexPopup: 1100 }, Menu: { zIndexPopup: 1100 }, Popconfirm: { zIndexPopup: 1100 }, Popover: { zIndexPopup: 1100 }, Select: { zIndexPopup: 1100 }, Tooltip: { zIndexPopup: 1100 },
    },
  }
}

export const appTheme = createAppTheme('dark')

export const mapTokens = {
  background: darkTokens.blue25, floor: darkTokens.blue100, roomOverlay: 'rgba(255, 255, 255, 0.12)',
  roomFill: { store: 'rgba(124, 58, 237, 0.28)', corridor: 'rgba(255, 255, 255, 0.08)', atrium: 'rgba(242, 184, 75, 0.22)', office: 'rgba(56, 189, 248, 0.22)', toilet: 'rgba(167, 139, 250, 0.24)', service: 'rgba(66, 214, 164, 0.22)', other: 'rgba(148, 163, 184, 0.18)' },
  roomStroke: { store: darkTokens.blue500, corridor: darkTokens.blue300, atrium: darkTokens.gold500, office: '#38BDF8', toilet: darkTokens.blue700, service: darkTokens.success, other: darkTokens.ink500 },
  poi: { entrance: '#22D3EE', shop: darkTokens.blue500, store: darkTokens.blue500, service: darkTokens.success, elevator: darkTokens.warning, toilet: '#A78BFA', exit: darkTokens.danger, custom: darkTokens.ink500 }, route: '#22D3EE',
} as const
