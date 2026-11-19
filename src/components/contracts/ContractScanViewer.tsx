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
  large?: boolean
}

const PAGE_TITLES: Record<number, string> = {
  1: 'Trang 1 (Chính)',
  2: 'Trang 2 (Biểu phí)',
  3: 'Trang 3 (Phụ lục SLA)',
  4: 'Trang 4 (Bảo mật)',
  5: 'Trang 5 (Nghiệm thu)',
}

export function ContractScanViewer({ contract, large = false }: ContractScanViewerProps) {
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const totalPages = Math.max(3, Math.min(5, contract.pageCount || 3))
  const lifecycle = getContractLifecycle(contract)

  useEffect(() => {
    setPage(1)
    setRotation(0)
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

    const printWin = window.open('', '_blank', 'width=860,height=940')
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
          .party { background: #f7f7f7; padding: 10px 14px; border-left: 3px solid #059669; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; }
          .sigs { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
          <div><em>Độc lập – Tự do – Hạnh phúc</em></div>
          <h3>HỢP ĐỒNG KINH TẾ DỊCH VỤ CÔNG NGHỆ SPATIAL OS</h3>
          <div>Số: <strong>${contract.contractCode}/HĐ-SPOTWAY</strong></div>
        </div>
        <p><em>Hôm nay, ngày ${lifecycle.formattedStartDate}, tại Trung tâm Điều hành Dữ liệu Không gian SpotWay, chúng tôi gồm có:</em></p>
        <div class="party">
          <strong>BÊN A (BÊN CUNG CẤP DỊCH VỤ - ADMIN):</strong> CÔNG TY CỔ PHẦN CÔNG NGHỆ SPOTWAY SPATIAL<br/>
          Đại diện pháp luật: Ông Trần Quang Huy – Chức vụ: Tổng Giám đốc
        </div>
        <div class="party">
          <strong>BÊN B (BÊN THỤ HƯỞNG & SỞ HỮU TÒA NHÀ):</strong> ${contract.customerName.toUpperCase()}<br/>
          Đại diện: ${contract.representative} – Email Chủ tòa nhà: ${contract.ownerEmail}<br/>
          Định danh không gian: ${contract.workspaceDomain}
        </div>
        <div class="clause">ĐIỀU 1: NỘI DUNG & PHẠM VI CẤP QUYỀN TÒA NHÀ 3D</div>
        <p>Bên A cấp quyền cho Bên B khởi tạo và vận hành tối đa <strong>${contract.maxBuildings} tòa nhà</strong> và <strong>${contract.maxFloors} mặt sàn 3D/2D</strong> cùng toàn quyền phân công Quản lý khu vực & Chủ gian hàng trên nền tảng SpotWay Spatial OS.</p>
        <div class="clause">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG & THỜI HẠN HIỆU LỰC</div>
        <table>
          <tr><th>Hạng mục</th><th>Nội dung cam kết</th></tr>
          <tr><td>Thời hạn hợp đồng</td><td>Từ ${lifecycle.formattedStartDate} đến ${lifecycle.formattedEndDate} (${lifecycle.durationMonths} tháng)</td></tr>
          <tr><td>Giá trị hợp đồng</td><td>${formatContractValue(contract)} / năm (${contract.paymentStatus === 'paid' ? 'Đã thanh toán 100%' : 'Chờ thanh toán'})</td></tr>
          <tr><td>Hạn mức hạ tầng</td><td>Tối đa ${contract.maxBuildings} tòa nhà · ${contract.maxFloors} mặt sàn dẫn đường A*</td></tr>
        </table>
        <p><strong>Ghi chú quản trị:</strong> ${contract.notes}</p>
        <div class="sigs">
          <div>
            <strong>ĐẠI DIỆN BÊN B (CHỦ TÒA NHÀ)</strong><br/>
            <em>(Đã ký số hợp lệ)</em><br/><br/><br/>
            <strong>${repShortName}</strong>
          </div>
          <div>
            <strong>ĐẠI DIỆN BÊN A (SPOTWAY SPATIAL)</strong><br/>
            <em>(Đã ký & đóng dấu mộc đỏ)</em><br/><br/><br/>
            <strong>Trần Quang Huy</strong>
          </div>
        </div>
      </body>
      </html>
    `)
    printWin.document.close()
    printWin.focus()
    printWin.print()
  }

  function renderRedStampSvg() {
    return (
      <svg className="csv-svg-stamp" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" stroke="#dc2626" strokeWidth="2.5" fill="none" />
        <circle
          cx="60"
          cy="60"
          r="46"
          stroke="#dc2626"
          strokeDasharray="3,2"
          strokeWidth="1.2"
          fill="none"
        />
        <text
          x="60"
          y="25"
          textAnchor="middle"
          fill="#dc2626"
          fontSize="7.5"
          fontWeight="800"
          letterSpacing="0.5"
        >
          CÔNG TY CP SPOTWAY SPATIAL
        </text>
        <polygon
          fill="#dc2626"
          opacity="0.85"
          points="60,42 64,53 76,53 66,60 70,72 60,65 50,72 54,60 44,53 56,53"
        />
        <text
          x="60"
          y="96"
          textAnchor="middle"
          fill="#dc2626"
          fontSize="7"
          fontWeight="800"
          letterSpacing="0.4"
        >
          * M.S.D.N: 0108929381 *
        </text>
      </svg>
    )
  }

  function renderPaperContent(isLargeView: boolean) {
    const transformStyle = {
      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
    }

    if (contract.scanDataUrl && contract.scanDataUrl.startsWith('data:image/')) {
      return (
        <div
          className={`csv-paper ${isLargeView ? 'csv-paper--large' : ''}`}
          style={transformStyle}
        >
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
      <div
        className={`csv-paper ${isLargeView ? 'csv-paper--large' : ''}`}
        style={transformStyle}
      >
        <div className="csv-paper__grain" />

        {/* Official Watermark across canvas */}
        <div className="csv-watermark">
          <div className="csv-watermark__box">
            BẢN SAO ĐIỆN TỬ - XÁC THỰC SPOTWAY
          </div>
        </div>

        {/* Paper Header */}
        <div className="csv-paper__header">
          <h4 className="csv-paper__country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h4>
          <p className="csv-paper__motto">Độc lập – Tự do – Hạnh phúc</p>
          <div className="csv-paper__divider" />
          <p className="csv-paper__date-line">
            Việt Nam, ngày {formatDateVN(contract.startDate)}
          </p>
          <h3 className="csv-paper__title">
            HỢP ĐỒNG KINH TẾ DỊCH VỤ CÔNG NGHỆ SPATIAL OS
          </h3>
          <p className="csv-paper__code">
            Số: {contract.contractCode}/HĐ-SPOTWAY
          </p>
        </div>

        {/* Page 1: Parties, Scope & Official Signatures */}
        {page === 1 && (
          <div className="csv-paper__body">
            <p style={{ margin: 0, textIndent: 18 }}>
              Hôm nay, ngày {formatDateVN(contract.startDate)}, tại trụ sở Trung tâm Điều hành Dữ
              liệu Không gian SpotWay, chúng tôi gồm các bên:
            </p>

            <div className="csv-paper__party">
              <strong>
                BÊN A (BÊN CUNG CẤP DỊCH VỤ): CÔNG TY CỔ PHẦN CÔNG NGHỆ SPOTWAY SPATIAL
              </strong>
              <div className="csv-paper__party-meta">
                <span>
                  • Đại diện pháp luật: <strong>Ông Trần Quang Huy</strong> — Chức vụ: Tổng Giám
                  Đốc (Quản trị viên Hệ thống)
                </span>
                <span>
                  • Mã số thuế: 0108929381 — Trụ sở: Tầng 28, SpotWay Tower
                </span>
              </div>
            </div>

            <div className="csv-paper__party csv-paper__party--owner">
              <strong>
                BÊN B (BÊN THỤ HƯỞNG &amp; SỞ HỮU TÒA NHÀ):{' '}
                {contract.customerName.toUpperCase()}
              </strong>
              <div className="csv-paper__party-meta">
                <span>
                  • Đại diện theo ủy quyền: <strong>{contract.representative}</strong> — Email
                  tài khoản Owner: <strong>{contract.ownerEmail}</strong>
                </span>
                <span>
                  • Không gian định danh: <strong>{contract.workspaceDomain}</strong>
                </span>
                <span>
                  • Hạn mức cơ sở hạ tầng: Tối đa <strong>{contract.maxBuildings} tòa nhà</strong>{' '}
                  &amp; <strong>{contract.maxFloors} mặt sàn bản đồ 3D/2D</strong>
                </span>
              </div>
            </div>

            <div className="csv-paper__clause-title">
              Điều 1: Nội Dung &amp; Phạm Vi Dịch Vụ Cung Cấp
            </div>
            <p style={{ margin: 0, textIndent: 18 }}>
              1.1. Bên A đồng ý triển khai, cấp quyền khởi tạo tòa nhà, số hóa mặt sàn 2D/3D
              (Spatial Digital Twin), thuật toán tìm đường đa tầng A*, và cấp quyền truy cập Cổng
              Quản trị Tòa nhà SpotWay cho Bên B.
            </p>
            <p style={{ margin: 0, textIndent: 18 }}>
              1.2. Dịch vụ đảm bảo tỷ lệ sẵn sàng của hệ thống dẫn đường 3D đạt tối thiểu{' '}
              <strong>99.9% uptime</strong> theo tiêu chuẩn SLA Enterprise, cho phép Bên B toàn
              quyền phân công Quản lý khu vực và Chủ gian hàng trong các tòa nhà trực thuộc.
            </p>

            {/* Signatures & Red Seal */}
            <div className="csv-paper__signatures">
              <div className="csv-sig-col">
                <p className="csv-sig-role">ĐẠI DIỆN BÊN B</p>
                <p className="csv-sig-note">(Ký, ghi rõ họ tên và đóng dấu)</p>
                <div className="csv-digital-sig-box">
                  <div className="csv-digital-sig-box__badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      verified
                    </span>
                    <span>KÝ SỐ HỢP LỆ</span>
                  </div>
                  <div className="csv-digital-sig-box__signer">
                    Ký bởi: <strong>{repShortName}</strong>
                  </div>
                  <div className="csv-digital-sig-box__time">
                    Thời gian: {formatDateVN(contract.startDate)} 09:14 GMT+7
                  </div>
                </div>
                <span className="csv-sig-name">{repShortName}</span>
              </div>

              <div className="csv-sig-col">
                <p className="csv-sig-role">ĐẠI DIỆN BÊN A</p>
                <p className="csv-sig-note">(Ký, ghi rõ họ tên và đóng dấu)</p>
                {renderRedStampSvg()}
                <span className="csv-sig-name">Trần Quang Huy</span>
                <span className="csv-stamp-verified-tag">ĐÃ ĐỐI SOÁT MỘC ĐỎ</span>
              </div>
            </div>
          </div>
        )}

        {/* Page 2: Pricing & Infrastructure Quota Table */}
        {page === 2 && (
          <div className="csv-paper__body">
            <div className="csv-paper__clause-title">
              Điều 2: Biểu Phí Hợp Đồng &amp; Hạn Mức Cấp Quyền Hạ Tầng
            </div>
            <p style={{ margin: 0, textIndent: 18 }}>
              Hai bên thống nhất biểu phí dịch vụ trọn gói theo hợp đồng ký kết giữa Admin và Chủ
              tòa nhà (không phát sinh chi phí mua gói nhỏ lẻ):
            </p>

            <table className="csv-paper__table">
              <thead>
                <tr>
                  <th>Hạng mục tài nguyên</th>
                  <th>Hạn mức cam kết</th>
                  <th>Tình trạng</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Quyền khởi tạo &amp; quản trị Tòa nhà</td>
                  <td>Tối đa {contract.maxBuildings} Tòa nhà độc lập</td>
                  <td>Đã cấp quyền</td>
                </tr>
                <tr>
                  <td>Số lượng Mặt sàn 2D/3D &amp; Đồ thị A*</td>
                  <td>Tối đa {contract.maxFloors} Mặt sàn</td>
                  <td>Đã cấp quyền</td>
                </tr>
                <tr>
                  <td>Phân quyền Quản lý khu vực &amp; Chủ gian hàng</td>
                  <td>Chủ tòa nhà chủ động khởi tạo &amp; phân công</td>
                  <td>Không giới hạn</td>
                </tr>
                <tr>
                  <td>Giá trị hợp đồng thường niên</td>
                  <td>
                    <strong>{formatContractValue(contract)}</strong> / năm
                  </td>
                  <td>
                    {contract.paymentStatus === 'paid'
                      ? 'Đã thanh toán 100%'
                      : 'Chờ đối soát thanh toán'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="csv-paper__clause-title">
              Điều 3: Chu Kỳ Thanh Toán &amp; Gia Hạn Hợp Đồng
            </div>
            <p style={{ margin: 0, textIndent: 18 }}>
              Hợp đồng có hiệu lực từ ngày <strong>{lifecycle.formattedStartDate}</strong> đến hết
              ngày <strong>{lifecycle.formattedEndDate}</strong>. Trước khi đáo hạn 30 ngày, hệ
              thống sẽ hiển thị thông báo để Bên B gửi yêu cầu gia hạn trực tiếp tới Quản trị viên.
            </p>
          </div>
        )}

        {/* Page 3+: SLA Appendix & Admin Storage Notes */}
        {page >= 3 && (
          <div className="csv-paper__body">
            <div className="csv-paper__clause-title">
              Điều 4: Phụ Lục Cam Kết Chất Lượng SLA &amp; Bảo Mật Multi-Tenant
            </div>
            <p style={{ margin: 0, textIndent: 18 }}>
              4.1. Toàn bộ dữ liệu bản vẽ mặt sàn, nút dẫn đường POI, chương trình khuyến mãi gian
              hàng và thống kê lưu lượng của <strong>{contract.customerName}</strong> được lưu trữ
              cách ly trên phân vùng riêng biệt <code>{contract.workspaceDomain}</code>.
            </p>
            <p style={{ margin: 0, textIndent: 18 }}>
              4.2. Bên A cung cấp đường dây nóng hỗ trợ kỹ thuật 24/7 và bảo đảm toàn vẹn dữ liệu
              sơ đồ 3D trong suốt thời gian hợp đồng còn hiệu lực.
            </p>

            <div className="csv-paper__party" style={{ borderLeftColor: '#d97706' }}>
              <strong>GHI CHÚ LƯU TRỮ &amp; ĐỐI SOÁT PHÁP LÝ:</strong>
              <div className="csv-paper__party-meta">
                <span>“{contract.notes}”</span>
              </div>
            </div>

            <div className="csv-paper__signatures">
              <div className="csv-sig-col">
                <p className="csv-sig-role">ĐẠI DIỆN BÊN B</p>
                <div className="csv-digital-sig-box">
                  <div className="csv-digital-sig-box__badge">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      verified
                    </span>
                    <span>XÁC NHẬN PHỤ LỤC</span>
                  </div>
                  <div className="csv-digital-sig-box__signer">
                    Chủ tòa nhà: <strong>{repShortName}</strong>
                  </div>
                </div>
              </div>

              <div className="csv-sig-col">
                <p className="csv-sig-role">ĐẠI DIỆN BÊN A</p>
                {renderRedStampSvg()}
                <span className="csv-stamp-verified-tag">ĐÃ ĐỐI SOÁT MỘC ĐỎ</span>
              </div>
            </div>
          </div>
        )}

        {/* Document Footer */}
        <div className="csv-paper__footer">
          <span>
            Mã bảo mật văn bản: SPOTWAY-SPATIAL-{contract.contractCode}-SEC#8910
          </span>
          <span>
            Trang {String(page).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="csv-viewer">
        {/* Top Document Toolbar */}
        <div className="csv-toolbar">
          <div className="csv-toolbar__left">
            <div className="csv-toolbar__pdf-box">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                picture_as_pdf
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="csv-toolbar__title">
                Bản scan hợp đồng chính thức ({totalPages} trang) - Đã đối soát pháp lý
              </div>
              <div className="csv-toolbar__hash">
                <span className="csv-toolbar__hash-dot" />
                <span>
                  SHA-256: e8f9...4b12 · Chứng thư số SpotWay-CA
                </span>
              </div>
            </div>
          </div>

          <div className="csv-toolbar__controls">
            {/* Combined Page + Zoom + Rotate Controls */}
            <div className="csv-ctrl-group">
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Trang trước"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  chevron_left
                </span>
              </button>
              <span className="csv-ctrl-label">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Trang tiếp"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  chevron_right
                </span>
              </button>

              <div className="csv-ctrl-divider" />

              <button
                type="button"
                className="csv-ctrl-btn"
                title="Thu nhỏ"
                disabled={zoom <= 75}
                onClick={() => setZoom((z) => Math.max(75, z - 10))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  zoom_out
                </span>
              </button>
              <span className="csv-ctrl-label csv-ctrl-label--cyan">{zoom}%</span>
              <button
                type="button"
                className="csv-ctrl-btn"
                title="Phóng to"
                disabled={zoom >= 135}
                onClick={() => setZoom((z) => Math.min(135, z + 10))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  zoom_in
                </span>
              </button>

              <button
                type="button"
                className="csv-ctrl-btn"
                title="Xoay 90 độ"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                  rotate_right
                </span>
              </button>
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              className="csv-fullscreen-btn"
              title="Xem toàn màn hình"
              onClick={() => setFullscreenOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                fullscreen
              </span>
              <span>Toàn màn hình</span>
            </button>

            {/* Download / Print PDF */}
            <button
              type="button"
              className="csv-download-btn"
              onClick={handlePrintOrDownload}
              title="Tải xuống hoặc in tệp PDF hợp đồng"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                download
              </span>
              <span>Tải xuống tệp PDF</span>
            </button>
          </div>
        </div>

        {/* Paper Canvas */}
        <div className={`csv-stage ${large ? 'csv-stage--large' : ''}`}>
          {renderPaperContent(large)}
        </div>

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
                <div className="csv-thumb__line" style={{ width: '55%', height: 5 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="csv-thumb__line" style={{ width: '100%' }} />
                  <div className="csv-thumb__line" style={{ width: '100%' }} />
                  <div className="csv-thumb__line" style={{ width: '75%' }} />
                </div>
                {(pNum === 1 || pNum === totalPages) && <div className="csv-thumb__seal" />}
              </div>
              <span className="csv-thumb__label">
                {PAGE_TITLES[pNum] || `Trang ${pNum}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal */}
      <Modal
        open={fullscreenOpen}
        onCancel={() => setFullscreenOpen(false)}
        footer={null}
        width={880}
        centered
        title={`Bản scan hợp đồng #${contract.contractCode} — ${contract.customerName}`}
      >
        <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>
          {renderPaperContent(true)}
        </div>
      </Modal>
    </>
  )
}
