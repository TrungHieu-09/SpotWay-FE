/** Lấy token định vị từ nội dung QR: URL `?qr=<token>` hoặc chính token. */
export function extractQrToken(raw: string): string | undefined {
  const text = raw.trim()
  if (!text) return undefined
  try {
    const token = new URL(text).searchParams.get('qr')
    if (token) return token
  } catch {
    // QR có thể chỉ chứa token, không phải URL.
  }
  return /^[A-Za-z0-9_-]{20,}$/.test(text) ? text : undefined
}
