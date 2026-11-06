/**
 * Lấy token định vị từ nội dung đọc được trong mã QR: hoặc cả đường link (`…?qr=<token>`) hoặc chính token.
 * Trả undefined nếu nội dung không giống cả hai (vd. mã QR của thứ khác).
 */
export function extractQrToken(raw: string): string | undefined {
  const text = raw.trim()
  if (!text) return undefined
  try {
    const token = new URL(text).searchParams.get('qr')
    if (token) return token
  } catch {
    // không phải URL: thử coi cả chuỗi là token
  }
  return /^[A-Za-z0-9_-]{20,}$/.test(text) ? text : undefined
}
