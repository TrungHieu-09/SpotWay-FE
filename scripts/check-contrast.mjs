const themes = {
  dark: { text: '#E2E8F0', muted: '#A8B2C5', surface: '#12112B', primary: '#7C3AED', onPrimary: '#FFFFFF', accent: '#22D3EE' },
  light: { text: '#2C4259', muted: '#5B6F84', surface: '#FFFFFF', primary: '#2F76B8', onPrimary: '#FFFFFF', accent: '#1C4A76' },
}

function channel(value) {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset + 1, offset + 3), 16))
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

function ratio(first, second) {
  const [bright, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (bright + 0.05) / (dark + 0.05)
}

let failed = false
for (const [name, palette] of Object.entries(themes)) {
  const pairs = [['text/surface', palette.text, palette.surface], ['muted/surface', palette.muted, palette.surface], ['onPrimary/primary', palette.onPrimary, palette.primary], ['accent/surface', palette.accent, palette.surface]]
  for (const [label, foreground, background] of pairs) {
    const value = ratio(foreground, background)
    const pass = value >= 4.5
    if (!pass) failed = true
    process.stdout.write(`${name} ${label}: ${value.toFixed(2)} ${pass ? 'PASS' : 'FAIL'}\n`)
  }
}
if (failed) process.exitCode = 1
