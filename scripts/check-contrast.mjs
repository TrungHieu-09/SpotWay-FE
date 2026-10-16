const colors = {
  ink900: '#0E2238', ink700: '#2C4259', ink500: '#5B6F84', white: '#FFFFFF', blue600: '#2F76B8', blue100: '#E3EFFA', success: '#2F8F74', successBg: '#E6F4EF', warning: '#B7791F', warningBg: '#FBF1DD', danger: '#BF4540', dangerBg: '#FBEAE9',
}

function channel(value) { const n = Number.parseInt(value, 16) / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4 }
function luminance(hex) { const rgb = hex.slice(1).match(/.{2}/g).map(channel); return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] }
function contrast(foreground, background) { const a = luminance(foreground); const b = luminance(background); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }

const pairs = [['ink900 trên trắng', colors.ink900, colors.white], ['ink700 trên trắng', colors.ink700, colors.white], ['ink500 trên trắng', colors.ink500, colors.white], ['chữ nút chính', colors.white, colors.blue600], ['chữ success tag', colors.ink700, colors.successBg], ['chữ warning tag', colors.ink700, colors.warningBg], ['chữ danger tag', colors.ink700, colors.dangerBg]]
for (const [label, foreground, background] of pairs) process.stdout.write(`${label}: ${contrast(foreground, background).toFixed(2)}:1\n`)
