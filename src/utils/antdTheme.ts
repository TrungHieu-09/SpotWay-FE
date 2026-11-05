import { theme, type ThemeConfig } from 'antd'

// Giá trị khớp với src/styles/tokens.css (antd cần giá trị cụ thể, không đọc được var()).
const light = {
  canvas: '#f8fafc',
  surface: '#ffffff',
  elevated: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  border: '#e5e7eb',
  borderSecondary: 'rgba(0, 0, 0, 0.06)',
  accent: '#111827',
  accentHover: '#1f2937',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  info: '#2563eb',
}

const dark = {
  canvas: '#0e0e11',
  surface: '#131316',
  elevated: '#1a1a1e',
  text: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  border: '#27272a',
  borderSecondary: 'rgba(255, 255, 255, 0.07)',
  accent: '#e4e4e7',
  accentHover: '#d4d4d8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
}

export function buildAntdTheme(isDark: boolean): ThemeConfig {
  const c = isDark ? dark : light

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: c.accent,
      colorInfo: c.info,
      colorLink: c.info,
      colorSuccess: c.success,
      colorWarning: c.warning,
      colorError: c.error,
      colorBgBase: c.canvas,
      colorBgContainer: c.surface,
      colorBgElevated: c.elevated,
      colorBgLayout: c.canvas,
      colorBorder: c.border,
      colorBorderSecondary: c.borderSecondary,
      colorText: c.text,
      colorTextSecondary: c.textSecondary,
      colorTextTertiary: c.textTertiary,
      fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 8,
      boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 4px 16px rgba(0, 0, 0, 0.08)',
    },
    components: {
      Button: {
        // chữ trên nền accent: đen trên accent sáng (dark), trắng trên accent đen (light)
        colorTextLightSolid: isDark ? '#09090b' : '#ffffff',
        primaryShadow: 'none',
        defaultShadow: 'none',
        fontWeight: 500,
      },
      Segmented: {
        itemSelectedColor: isDark ? '#09090b' : '#ffffff',
        itemSelectedBg: c.accent,
        trackBg: isDark ? '#1a1a1e' : '#f1f5f9',
      },
      Card: { headerFontSize: 15 },
      Table: { headerBg: 'transparent', rowHoverBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
    },
  }
}
