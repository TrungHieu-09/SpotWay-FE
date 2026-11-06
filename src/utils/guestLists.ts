export const MAX_RECENT = 8

/** Thêm vào đầu danh sách "gần đây", bỏ trùng, giữ tối đa MAX_RECENT mục. */
export function pushRecent(recent: readonly string[], id: string, max = MAX_RECENT): string[] {
  return [id, ...recent.filter((item) => item !== id)].slice(0, max)
}

/** Bật/tắt yêu thích: có rồi thì bỏ, chưa có thì thêm vào đầu. */
export function toggleFavorite(favorites: readonly string[], id: string): string[] {
  return favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites]
}
