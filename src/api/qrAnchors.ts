import { apiClient } from './client'

export type QrAnchor = { id: string; label: string; nodeId: string; floorId: string; buildingId: string; createdAt: string }

/** Token chỉ có trong phản hồi lúc tạo (BE chỉ lưu bản băm) nên phải hiển thị/in ngay. */
export type CreatedQrAnchor = QrAnchor & { token: string }

export async function listQrAnchors(nodeId: string) {
  const { data } = await apiClient.get<QrAnchor[]>(`/nodes/${nodeId}/qr-anchors`)
  return data
}

export async function createQrAnchor(nodeId: string, label: string) {
  const { data } = await apiClient.post<CreatedQrAnchor>(`/nodes/${nodeId}/qr-anchors`, { label })
  return data
}

export async function deleteQrAnchor(anchorId: string) {
  await apiClient.delete(`/qr-anchors/${anchorId}`)
}

/** Đường dẫn khách quét: mở thẳng trang chỉ đường với điểm xuất phát là node của mã. */
export function qrNavigationUrl(origin: string, buildingId: string, token: string) {
  return `${origin}/navigate/${buildingId}?qr=${encodeURIComponent(token)}`
}
