export type GuestTestGroup = 'happy' | 'fire' | 'qr' | 'other'

export type GuestTestCase = {
  id: string
  group: GuestTestGroup
  title: string
  /** Việc người kiểm thử cần làm (kịch bản demo tự chạy thì chỉ cần quan sát). */
  steps: string
  expected: string
  /** Id kịch bản của DemoSimulationToolbar; có thì nút "Chạy" tự chạy kịch bản đó. */
  scenario?: string
  /** Case cần mã QR: người kiểm thử dán token vào ô trên trang. */
  needsQrToken?: boolean
  /** Case chạy tay: mở trang Guest bình thường (kèm bật thanh demo nếu cần). */
  manualQuery?: string
}

export const GUEST_GROUP_LABEL: Record<GuestTestGroup, string> = {
  happy: 'Đi đường bình thường (H)',
  fire: 'Hỏa hoạn (F)',
  qr: 'Quét mã QR (Q)',
  other: 'Khác (O)',
}

export const GUEST_TEST_CASES: GuestTestCase[] = [
  { id: 'H1', group: 'happy', scenario: 'same-floor-shortest', title: 'Cùng tầng, ngắn nhất', steps: 'Bấm Chạy.', expected: 'Có tuyến cùng một tầng tới điểm đến gần nhất theo graph; bản đồ chỉ tô đoạn đi.' },
  { id: 'H2', group: 'happy', scenario: 'same-floor-turns', title: 'Nhiều ngã rẽ', steps: 'Bấm Chạy, bấm "Bước tiếp".', expected: 'Banner hiện mũi tên rẽ trái/phải/quay đầu kèm khoảng cách từng đoạn.' },
  { id: 'H3', group: 'happy', scenario: 'elevator-wait', title: 'Đi thang máy', steps: 'Bấm Chạy, theo dõi các bước.', expected: 'Có bước chuyển tầng bằng thang máy kèm thời gian chờ; nút tầng chuyển sang tầng mới.' },
  { id: 'H4', group: 'happy', scenario: 'stairs', title: 'Đi thang bộ', steps: 'Bấm Chạy.', expected: 'Có bước chuyển tầng bằng thang bộ, không dùng thang máy.' },
  { id: 'H5', group: 'happy', scenario: 'escalator-up', title: 'Thang cuốn lên', steps: 'Bấm Chạy.', expected: 'Tuyến lên tầng bằng thang cuốn theo chiều lên.' },
  { id: 'H6', group: 'happy', scenario: 'escalator-reverse', title: 'Thang cuốn đi ngược chiều', steps: 'Bấm Chạy.', expected: 'Không đi ngược chiều thang cuốn: hoặc đổi sang thang khác, hoặc báo lỗi rõ ràng.' },
  { id: 'H7', group: 'happy', scenario: 'wheelchair', title: 'Chế độ xe lăn', steps: 'Bấm Chạy.', expected: 'Tuyến không có thang bộ/thang cuốn, chỉ dùng thang máy hoặc lối tiếp cận được.' },
  { id: 'H8', group: 'happy', scenario: 'nearest-restroom', title: 'WC gần nhất', steps: 'Bấm Chạy.', expected: 'Tuyến tới POI nhà vệ sinh gần nhất theo graph (không phải theo đường chim bay).' },
  { id: 'H9', group: 'happy', scenario: 'nearest-atm', title: 'ATM gần nhất', steps: 'Bấm Chạy.', expected: 'Có POI ATM thì có tuyến; chưa có thì báo "không tìm thấy" rõ ràng, không treo.' },
  { id: 'H10', group: 'happy', scenario: 'nearest-info', title: 'Quầy thông tin gần nhất', steps: 'Bấm Chạy.', expected: 'Tuyến tới POI quầy thông tin gần nhất.' },
  { id: 'F1', group: 'fire', scenario: 'fire-ground-main-exit', title: 'Cháy tầng 1', steps: 'Bấm Chạy.', expected: 'Chế độ cháy bật, tuyến thoát hiểm ra lối thoát gần nhất, không dùng thang máy.' },
  { id: 'F2', group: 'fire', scenario: 'fire-middle-floor', title: 'Cháy tầng giữa', steps: 'Bấm Chạy.', expected: 'Cấm thang máy; tuyến xuống bằng thang bộ, tránh node cháy.' },
  { id: 'F3', group: 'fire', scenario: 'fire-at-destination', title: 'Cháy ngay tại điểm đến', steps: 'Bấm Chạy.', expected: 'Điểm đến bị huỷ, có cảnh báo, tuyến chuyển sang lối thoát hiểm an toàn.' },
  { id: 'F4', group: 'fire', scenario: 'fire-exit-1', title: 'Lửa chặn lối thoát 1', steps: 'Bấm Chạy.', expected: 'Tái định tuyến sang lối thoát còn lại.' },
  { id: 'F5', group: 'fire', scenario: 'fire-exits-1-2', title: 'Lửa chặn lối thoát 1 và 2', steps: 'Bấm Chạy.', expected: 'Chuyển sang lối thoát tiếp theo; hết lối thoát thì hiện cảnh báo NO_SAFE_EXIT_FOUND, không có tuyến.' },
  { id: 'F6', group: 'fire', scenario: 'interactive-fire', title: 'Đặt lửa tương tác', steps: 'Bấm Chạy, rồi chạm node trên bản đồ để đặt/dập lửa.', expected: 'Mỗi lần đặt hoặc dập lửa, tuyến thoát hiểm tính lại ngay; không cho đặt lửa tại chỗ đang đứng.' },
  { id: 'Q1', group: 'qr', needsQrToken: true, title: 'Mở bằng link QR hợp lệ', steps: 'Dán token (tạo ở Manager → chọn node → Tạo mã QR), bấm Mở.', expected: 'Hiện "Vị trí quét QR: <nhãn>", điểm xuất phát khoá theo mã; nút "Đổi vị trí" mở khoá.' },
  { id: 'Q2', group: 'qr', manualQuery: 'qr=token-sai-khong-ton-tai-0123456789', title: 'Token QR sai', steps: 'Bấm Mở.', expected: 'Cảnh báo "Không xác thực được mã QR"; trang vẫn dùng được, chọn điểm xuất phát tay.' },
  { id: 'Q3', group: 'qr', manualQuery: '', title: 'Quét QR trong ứng dụng', steps: 'Mở, bấm "Quét mã QR", đưa camera vào mã (Chrome/Edge, cần localhost hoặc HTTPS).', expected: 'Đọc được mã thì cập nhật vị trí, giữ nguyên điểm đến đang chọn; trình duyệt không hỗ trợ thì có hướng dẫn thay thế.' },
  { id: 'O1', group: 'other', manualQuery: 'demo=1', title: 'Chọn điểm xuất phát bằng cách chạm bản đồ', steps: 'Mở, chạm một vị trí trên bản đồ.', expected: 'Điểm xuất phát đổi sang node gần chỗ chạm nhất.' },
  { id: 'O2', group: 'other', manualQuery: 'demo=1', title: 'Nhớ điểm đến 30 phút', steps: 'Chọn điểm đến, bấm Tìm đường, tải lại trang.', expected: 'Điểm đến cũ được gợi nhớ trong 30 phút.' },
  { id: 'O3', group: 'other', manualQuery: 'demo=1', title: 'Chọn loại thang khi đổi tầng', steps: 'Chọn Thang máy / Thang bộ / Thang cuốn, tìm đường tới tầng khác.', expected: 'Tuyến dùng đúng loại thang; loại không có trong toà nhà thì báo lỗi rõ, không tự đổi sang loại khác.' },
  { id: 'O4', group: 'other', manualQuery: 'demo=1', title: 'Mô phỏng đi bộ', steps: 'Có tuyến, bật mô phỏng, thử tốc độ 1x/2x.', expected: 'Các bước tự chạy tuần tự kể cả chờ thang và đổi tầng; dừng ở bước cuối.' },
  { id: 'O5', group: 'other', manualQuery: 'demo=1', title: 'BE lỗi thì tính offline', steps: 'Tắt BE (hoặc ngắt mạng) sau khi trang đã nạp, bấm Tìm đường.', expected: 'Vẫn có tuyến; hiện thông báo "đang dùng định tuyến trên thiết bị".' },
]

/** Link mở trang Guest cho một case. */
export function guestCaseUrl(testCase: GuestTestCase, buildingId: string, qrToken?: string) {
  const base = `/guest/${buildingId}/map`
  if (testCase.scenario) return `${base}?scenario=${encodeURIComponent(testCase.scenario)}`
  if (testCase.needsQrToken) return qrToken ? `${base}?qr=${encodeURIComponent(qrToken)}` : undefined
  return testCase.manualQuery ? `${base}?${testCase.manualQuery}` : base
}

export type GuestTestResult = 'pass' | 'fail' | 'skip'

export function summarizeResults(results: Record<string, GuestTestResult | undefined>) {
  const all = GUEST_TEST_CASES.length
  const values = GUEST_TEST_CASES.map((item) => results[item.id])
  return {
    all,
    pass: values.filter((value) => value === 'pass').length,
    fail: values.filter((value) => value === 'fail').length,
    skip: values.filter((value) => value === 'skip').length,
    pending: values.filter((value) => !value).length,
  }
}

/** Biên bản kiểm thử dạng Markdown để dán vào báo cáo. */
export function buildTestReport(buildingName: string, results: Record<string, GuestTestResult | undefined>, notes: Record<string, string | undefined>, now = new Date()) {
  const label: Record<GuestTestResult, string> = { pass: 'Đạt', fail: 'Không đạt', skip: 'Bỏ qua' }
  const sum = summarizeResults(results)
  const lines = [
    `# Biên bản kiểm thử luồng Guest`,
    '',
    `- Toà nhà: ${buildingName}`,
    `- Thời gian: ${now.toLocaleString('vi-VN')}`,
    `- Kết quả: ${sum.pass} đạt / ${sum.fail} không đạt / ${sum.skip} bỏ qua / ${sum.pending} chưa kiểm thử (tổng ${sum.all})`,
    '',
    '| Mã | Nội dung | Kết quả | Ghi chú |',
    '| --- | --- | --- | --- |',
    ...GUEST_TEST_CASES.map((item) => {
      const result = results[item.id]
      return `| ${item.id} | ${item.title} | ${result ? label[result] : 'Chưa kiểm thử'} | ${(notes[item.id] ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')} |`
    }),
  ]
  return lines.join('\n')
}
