/** Cách sửa cho từng lỗi publish của BE, khớp theo nội dung thông báo (BE chỉ trả chuỗi nối bằng "; "). */
const HINTS: Array<{ match: RegExp; text: string }> = [
  { match: /Calibrate the floor scale/i, text: 'Chưa hiệu chuẩn tỉ lệ tầng: bấm nút thước ở tầng này và nhập kích thước thật.' },
  { match: /no length in metres|no longer match their node/i, text: 'Độ dài edge đã cũ: hiệu chuẩn lại tầng để BE tính lại độ dài mét.' },
  { match: /Edges reference a deleted node/i, text: 'Có edge trỏ tới node đã xoá: xoá edge đó ở tab Edge.' },
  { match: /no EXIT node, EXIT POI or stair/i, text: 'Tầng có cửa hàng/POI nhưng chưa có lối ra: thêm node EXIT hoặc EMERGENCY_EXIT, POI loại exit, hoặc thang bộ/thang cuốn nối sang tầng khác.' },
  { match: /no walkable path to an exit/i, text: 'Có cửa hàng/POI không đi bộ tới được lối ra: nối edge để chúng cùng một mạng với lối ra.' },
  { match: /split into \d+ separate parts/i, text: 'Đồ thị bị tách thành nhiều phần rời: nối chúng bằng edge (node đỏ trên canvas là node chưa nối).' },
  { match: /elevator node must have a vertical link/i, text: 'Có node thang máy chưa thuộc connector nào: tạo connector ở tab Connector.' },
  { match: /connector must serve at least two floors/i, text: 'Có connector chỉ phục vụ 1 tầng: thêm điểm dừng ở tầng khác hoặc xoá nó.' },
  { match: /Nodes with no edge/i, text: 'Có node chưa nối edge nào (vòng đỏ trên canvas): nối vào hành lang hoặc xoá đi.' },
  { match: /Stair\/escalator nodes without a connector/i, text: 'Có node thang bộ/thang cuốn chưa thuộc connector: tạo connector ở tab Connector.' },
  { match: /Stores without a map position/i, text: 'Có cửa hàng chưa có vị trí trên bản đồ nên khách không chỉ đường tới được.' },
  { match: /node that no longer exists/i, text: 'Có cửa hàng/POI trỏ tới node đã xoá: kéo POI sang vị trí mới để gắn lại node.' },
]

/** Cách sửa cho một thông báo lỗi của BE; thông báo lạ giữ nguyên. */
export const hintFor = (issue: string) => HINTS.find((hint) => hint.match.test(issue))?.text ?? issue

const PREFIX = /^The floor cannot be published:\s*/i

/** Tách thông báo "The floor cannot be published: a; b" thành từng dòng dễ hiểu; lỗi lạ giữ nguyên bản gốc. */
export function describePublishError(message: string): string[] {
  if (!PREFIX.test(message)) return [message]
  return message
    .replace(PREFIX, '')
    .split(/;\s*/)
    .filter(Boolean)
    .map(hintFor)
}
