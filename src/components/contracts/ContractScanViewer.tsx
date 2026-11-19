import { useState, useEffect } from 'react'
import { Modal } from 'antd'
import type { ServiceContract } from '../../types/contract'
import {
  formatContractValue,
  formatDateVN,
  getContractLifecycle,
} from '../../types/contract'
import './ContractScanViewer.css'

interface ContractScanViewerProps {
  contract: ServiceContract
}

export function ContractScanViewer({ contract }: ContractScanViewerProps) {
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const totalPages = Math.max(3, Math.min(5, contract.pageCount || 3))
  const lifecycle = getContractLifecycle(contract)

  useEffect(() => {
    setPage(1)
  }, [contract.id])

  const repShortName = contract.representative.split('(')[0].trim() || contract.customerName

  function handlePrintOrDownload() {
    if (contract.scanDataUrl) {
      const a = document.createElement('a')
      a.href = contract.scanDataUrl
      a.download = contract.scanFileName || `${contract.contractCode}-Scan.png`
      a.click()
      return
    }

    const printWin = window.open('', '_blank', 'width=840,height=920')
    if (!printWin) return

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Hợp đồng ${contract.contractCode} - ${contract.customerName}</title>
        <style>
          body { font-family: "Times New Roman", serif; padding: 36px 48px; color: #111; line-height: 1.6; }
          .header { text-align: center; border-bottom: 1px solid #888; padding-bottom: 14px; margin-bottom: 20px; }
          h2, h3 { margin: 6px 0; text-transform: uppercase; }
          .clause { font-weight: bold; margin-top: 14px; text-transform: uppercase; }
          .party { background: #f7f7f7; padding: 10px 14px; border-left: 3px solid #6d3bd7; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; }
          .sigs { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
          <div><em>Độc lập – Tự do – Hạnh phúc</em></div>
          <h3>HỢP ĐỒNG DỊCH VỤ ĐỊNH VỊ KHÔNG GIAN 3D SPATIAL OS</h3>
          <div>Số: <strong>${contract.contractCode}/HĐ-SPOTWAY</strong></div>
        </div>
        <p><em>Hôm nay, ngày ${lifecycle.formattedStartDate}, tại Văn phòng Công nghệ SpotWay Spatial OS, chúng tôi gồm có:</em></p>
        <div class="party">
          <strong>BÊN A (ĐƠN VỊ CUNG CẤP HỆ THỐNG - ADMIN):</strong> CÔNG TY CỔ PHẦN CÔNG NGHỆ SPOTWAY SPATIAL OS<br/>
          Đại diện: Ông Lê Hải Đăng – Chức vụ: Tổng Giám đốc Công nghệ (Quản trị viên Hệ thống).
        </div>
        <div class="party">
          <strong>BÊN B (CHỦ TÒA NHÀ / KHÁCH HÀNG):</strong> ${contract.customerName.toUpperCase()}<br/>
          Đại diện: ${contract.representative} – Email tài khoản Owner: ${contract.ownerEmail}<br/>
          Định danh không gian: ${contract.workspaceDomain}
        </div>
        <div class="clause">ĐIỀU 1: PHẠM VI CẤP QUYỀN TÒA NHÀ & MẶT SÀN 3D</div>
        <p>Bên A cấp quyền cho Bên B (Chủ tòa nhà) khởi tạo và vận hành tối đa <strong>${contract.maxBuildings} tòa nhà</strong> và <strong>${contract.maxFloors} mặt sàn 3D/2D</strong> cùng hệ thống phân quyền Quản lý khu vực & Chủ gian hàng trên nền tảng SpotWay Spatial OS.</p>
        <div class="clause">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG & THỜI HẠN HIỆU LỰC</div>
        <table>
          <tr><th>Hạng mục</th><th>Nội dung cam kết</th></tr>
          <tr><td>Thời hạn hợp đồng</td><td>Từ ${lifecycle.formattedStartDate} đến ${lifecycle.formattedEndDate} (${lifecycle.durationMonths} tháng)</td></tr>
          <tr><td>Giá trị hợp đồng</td><td>${formatContractValue(contract)} / năm (${contract.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'})</td></tr>
          <tr><td>Hạn mức hạ tầng</td><td>Tối đa ${contract.maxBuildings} tòa nhà · ${contract.maxFloors} mặt sàn dẫn đường A*</td></tr>
        </table>
        <p><strong>Ghi chú lưu trữ:</strong> ${contract.notes}</p>
        <div class="sigs">
          <div>
            <strong>ĐẠI DIỆN BÊN B (CHỦ TÒA NHÀ)</strong><br/>
            <em>(Đã ký xác nhận)</em><br/><br/><br/>
            <strong>${repShortName}</strong>
          </div>
          <div>
            <strong>ĐẠI DIỆN BÊN A (ADMIN SPOTWAY)</strong><br/>
            <em>(Đã ký & đóng dấu chứng thực)</em><br/><br/><br/>
            <strong>Lê Hải Đăng</strong>
          </div>
        </div>
      </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    printWin.print()
  }

  function renderPaperContent() {
    if (contract.scanDataUrl && contract.scanDataUrl.startsWith('data:image/')) {
      return (
        <div className="csv-paper" style={{ transform: `scale(${zoom / 100})` }}>
          <div className="csv-paper__header">
            <h3 className="csv-paper__title">
              BẢN SCAN ĐÍNH KÈM — #{contract.contractCode}
            </h3>
            <p className="csv-paper__code">
              Tệp gốc: {contract.scanFileName || `${contract.contractCode}.png`} · Chủ tòa nhà:{' '}
              {contract.customerName}
            </p>
          </div>
          <img
            src={contract.scanDataUrl}
            alt={`Bản scan hợp đồng ${contract.contractCode}`}
            className="csv-uploaded-img"
          />
        </div>
      )
    }

    return (
      <div className="csv-paper" style={{ transform: `scale(${zoom / 100})` }}>
        {/* Watermark */}
        <div className="csv-watermark">
          <span>SPOTWAY OS</span>
        </div>

        {/* Paper Header */}
        <div className="csv-paper__header">
          <h4 className="csv-paper__country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
          <p className="csv-paper__motto">Độc lập – Tự do – Hạnh phúc</p>
          <div className="csv-paper__divider" />
          <h3 className="csv-paper__title">
            HỢP ĐỒNG DỊCH VỤ ĐỊNH VỊ KHÔNG GIAN SPATIAL OS
          </h3>
          <p className="csv-paper__code">
            Số: {contract.contractCode}/HĐ-SPOTWAY · Trang {page}/{totalPages}
          </p>
        </div>

        {/* Page 1: Parties & Scope */}
        {page === 1 && (
          <div className="csv-paper__body">
            <p style={{ fontStyle: 'italic', margin: 0 }}>
              Hôm nay, ngày {formatDateVN(contract.startDate)}, tại Văn phòng Công nghệ SpotWay
              Spatial OS, chúng tôi gồm có:
            </p>

            <div className="csv-paper__party">
              <strong>BÊN A (BÊN CUNG CẤP / ADMIN HỆ THỐNG):</strong> SPOTWAY TECHNOLOGIES JSC
              <br />
              Đại diện: Ông Lê Hải Đăng – Chức vụ: Tổng Giám đốc Công nghệ.
            </div>

            <div className="csv-paper__party" style={{ borderLeftColor: '#0891b2' }}>
              <strong>BÊN B (CHỦ TÒA NHÀ / KHÁCH HÀNG):</strong>{' '}
              {contract.customerName.toUpperCase()}
              <br />
              Đại diện: {contract.representative} · Email Owner: {contract.ownerEmail}
              <br />
              Không gian định danh: <strong>{contract.workspaceDomain}</strong>
            </div>

            <div className="csv-paper__clause-title">
              ĐIỀU 1: PHẠM VI CẤP QUYỀN TÒA NHÀ &amp; SỐ HÓA 3D
            </div>
            <p style={{ margin: 0 }}>
              Hai bên thống nhất ký kết hợp đồng cấp quyền quản trị hạ tầng, nạp bản đồ Mesh 3D
              trong nhà và thuật toán dẫn đường A* cho tổ hợp của Bên B với hạn mức cam kết tối đa{' '}
              <strong>{contract.maxBuildings} tòa nhà</strong> và{' '}
              <strong>{contract.maxFloors} mặt sàn 3D/2D</strong> cùng đầy đủ quyền phân công Quản
              lý khu vực và Chủ gian hàng.
            </p>

            {/* Signatures Preview on Page 1 */}
            <div className="csv-paper__signatures">
              <div className="csv-sig-col">
                <p className="csv-sig-role">ĐẠI DIỆN BÊN B</p>
                <p className="csv-sig-note">(Chủ tòa nhà ký, ghi rõ họ tên)</p>
                <div className="csv-sig-handwriting">{repShortName}</div>
              </div>

              <div className="csv-sig-col">
                <div className="csv-red-seal">
                  <span className="csv-red-seal__top">
                    CÔNG TY CỔ PHẦN
                    <br />
                    SPOTWAY SPATIAL
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    verified
                  </span>
                  <span className="csv-red-seal__bottom">ĐÃ CHỨNG THỰC</span>
                </div>
                <p className="csv-sig-role">ĐẠI DIỆN BÊN A</p>
                <p className="csv-sig-note">(Admin ký, đóng dấu)</p>
                <div className="csv-sig-handwriting" style={{ color: '#1e3a8a' }}>
                  Lê Hải Đăng
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page 2: Financial Value, SLA & Infrastructure Quota Table */}
        {page === 2 && (
          <div className="csv-paper__body">
            <div className="csv-paper__clause-title">
              ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG &amp; HẠN MỨC HẠ TẦNG
            </div>
            <p style={{ margin: 0 }}>
              Thay vì đăng ký gói tự động nhỏ lẻ, Bên B được cấp phát trực tiếp hạn mức tài nguyên
              doanh nghiệp theo biên bản nghiệm thu giữa Admin và Chủ tòa nhà như sau:
            </p>

            <table className="csv-paper__table">
              <thead>
                <tr>
                  <th>Hạng mục cấp quyền</th>
                  <th>Thông số cam kết</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Số lượng Tòa nhà 3D tối đa</td>
                  <td>{contract.maxBuildings} Tòa nhà độc lập</td>
                  <td>Đã kích hoạt</td>
                </tr>
                <tr>
                  <td>Số lượng Mặt sàn &amp; Đồ thị A*</td>
                  <td>{contract.maxFloors} Tầng (CAD / GeoJSON / 3D)</td>
                  <td>Đã kích hoạt</td>
                </tr>
                <tr>
                  <td>Tài khoản Quản lý &amp; Gian hàng</td>
                  <td>Chủ tòa nhà toàn quyền cấp phát</td>
                  <td>Không giới hạn</td>
                </tr>
                <tr>
                  <td>Giá trị hợp đồng thường niên</td>
                  <td>
                    <strong>{formatContractValue(contract)}</strong> / năm
                  </td>
                  <td>
                    {contract.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="csv-paper__clause-title">
              ĐIỀU 3: THỜI HẠN HIỆU LỰC &amp; CAM KẾT SLA
            </div>
            <p style={{ margin: 0 }}>
              Hợp đồng có hiệu lực từ ngày <strong>{lifecycle.formattedStartDate}</strong> đến hết
              ngày <strong>{lifecycle.formattedEndDate}</strong> ({lifecycle.durationMonths} tháng).
              Bên A cam kết thời gian hoạt động hệ thống định vị đạt <strong>99.98%</strong>.
            </p>
          </div>
        )}

        {/* Page 3+: Multi-Tenant Isolation, Notes & Final Certification */}
        {page >= 3 && (
          <div className="csv-paper__body">
            <div className="csv-paper__clause-title">
              ĐIỀU 4: BẢO MẬT ĐA KHÁCH THUÊ &amp; GHI CHÚ LƯU TRỮ
            </div>
            <p style={{ margin: 0 }}>
              1. Toàn bộ sơ đồ mặt bằng, tọa độ nút dẫn đường và dữ liệu lưu lượng của Bên B (
              <strong>{contract.customerName}</strong>) được cách ly độc lập trên phân vùng{' '}
              <code>{contract.workspaceDomain}</code>.
            </p>
            <p style={{ margin: 0 }}>
              2. Khi hợp đồng sắp hết hạn (trước 30 ngày), Chủ tòa nhà có thể gửi yêu cầu gia hạn
              trực tiếp trên bảng điều khiển để Admin phê duyệt gia hạn mà không làm gián đoạn dịch
              vụ dẫn đường 3D.
            </p>

            <div className="csv-paper__party" style={{ borderLeftColor: '#d97706' }}>
              <strong>GHI CHÚ HỒ SƠ PHÁP CHẾ (#{contract.contractCode}):</strong>
              <br />
              “{contract.notes}”
            </div>

            <div className="csv-paper__signatures">
              <div className="csv-sig-col">
                <p className="csv-sig-role">ĐẠI DIỆN CHỦ TÒA NHÀ</p>
                <p className="csv-sig-note">(Ký, đóng dấu xác nhận)</p>
                <div className="csv-sig-handwriting">{repShortName}</div>
              </div>

              <div className="csv-sig-col">
                <div className="csv-red-seal">
                  <span className="csv-red-seal__top">
                    CÔNG TY CỔ PHẦN
                    <br />
                    SPOTWAY SPATIAL
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    verified
                  </span>
                  <span className="csv-red-seal__bottom">ĐÃ CHỨNG THỰC</span>
                </div>
                <p className="csv-sig-role">QUẢN TRỊ VIÊN SPOTWAY</p>
                <p className="csv-sig-note">(Ký, đóng dấu pháp nhân)</p>
                <div className="csv-sig-handwriting" style={{ color: '#1e3a8a' }}>
                  Lê Hải Đăng
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="csv-viewer">
        {/* Toolbar */}
        <div className="csv-toolbar">
          <div className="csv-toolbar__left">
            <span className="material-symbols-outlined csv-toolbar__icon">description</span>
            <span>
              Bản scan hợp đồng ({totalPages} trang)
            </span>
          </div>

          <div className="csv-toolbar__controls">
            {/* Zoom */}
            <div className="csv-ctrl-group">
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Thu nhỏ"
                disabled={zoom <= 80}
                onClick={() => setZoom((z) => Math.max(80, z - 10))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  zoom_out
                </span>
              </button>
              <span className="csv-ctrl-label">{zoom}%</span>
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Phóng to"
                disabled={zoom >= 120}
                onClick={() => setZoom((z) => Math.min(120, z + 10))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  zoom_in
                </span>
              </button>
            </div>

            {/* Page Switcher */}
            <div className="csv-ctrl-group">
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Trang trước"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  chevron_left
                </span>
              </button>
              <span className="csv-ctrl-label">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Trang sau"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  chevron_right
                </span>
              </button>
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              className="csv-ctrl-btn"
              style={{
                background: 'rgba(18, 18, 36, 0.85)',
                border: '1px solid rgba(255,255,255,0.09)',
              }}
              title="Xem toàn màn hình"
              onClick={() => setFullscreenOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                fullscreen
              </span>
            </button>

            {/* Download / Print PDF */}
            <button
              type="button"
              className="csv-download-btn"
              onClick={handlePrintOrDownload}
              title="In hoặc tải bản PDF hợp đồng"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                download
              </span>
              <span>Tải xuống (PDF)</span>
            </button>
          </div>
        </div>

        {/* Paper Canvas */}
        <div className="csv-stage">{renderPaperContent()}</div>

        {/* Thumbnails Strip */}
        <div className="csv-thumbs">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
            <button
              key={pNum}
              type="button"
              className={`csv-thumb ${page === pNum ? 'csv-thumb--active' : ''}`}
              onClick={() => setPage(pNum)}
            >
              <div className="csv-thumb__sheet">
                <div className="csv-thumb__line" style={{ width: '100%', height: 3 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div className="csv-thumb__line" style={{ width: '100%' }} />
                  <div className="csv-thumb__line" style={{ width: '80%' }} />
                  <div className="csv-thumb__line" style={{ width: '90%' }} />
                </div>
                {(pNum === 1 || pNum === totalPages) && <div className="csv-thumb__seal" />}
              </div>
              <span className="csv-thumb__label">Trang {pNum}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Modal
        open={fullscreenOpen}
        onCancel={() => setFullscreenOpen(false)}
        footer={null}
        width={760}
        centered
        title={`Bản scan hợp đồng #${contract.contractCode} — ${contract.customerName}`}
      >
        <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'center' }}>
          {renderPaperContent()}
        </div>
      </Modal>
    </>
  )
}

