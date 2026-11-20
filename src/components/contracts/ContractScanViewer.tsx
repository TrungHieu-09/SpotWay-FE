import { useEffect, useMemo, useState } from 'react'
import { Modal } from 'antd'
import type { ContractScanPage, ServiceContract } from '../../types/contract'
import './ContractScanViewer.css'

interface ContractScanViewerProps {
  contract: ServiceContract
  /** Fetches the full contract (with its scanned pages); the list responses leave the files out. */
  loadDetail: (id: string) => Promise<ServiceContract>
  large?: boolean
}

function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const [head, body] = dataUrl.split(',')
    const mime = head.slice(5, head.indexOf(';')) || 'application/octet-stream'
    const bin = atob(body)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: mime }))
  } catch {
    return null
  }
}

function downloadPage(contract: ServiceContract, scan: ContractScanPage, index: number) {
  const a = document.createElement('a')
  a.href = scan.dataUrl
  a.download = scan.fileName || `${contract.contractCode}-trang-${index + 1}`
  a.click()
}

/** Shows only what was really uploaded for the contract: no placeholder document is ever drawn. */
export function ContractScanViewer({ contract, loadDetail, large = false }: ContractScanViewerProps) {
  const key = `${contract.id}:${contract.updatedAt}`
  const [loaded, setLoaded] = useState<{ key: string; pages: ContractScanPage[] } | null>(null)
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [lastKey, setLastKey] = useState(key)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  if (lastKey !== key) {
    setLastKey(key)
    setPage(1)
    setRotation(0)
  }

  useEffect(() => {
    if (!contract.hasScan) return
    let cancelled = false
    loadDetail(contract.id)
      .then((detail) => {
        if (!cancelled) setLoaded({ key, pages: detail.scanPages })
      })
      .catch((error: Error) => {
        if (!cancelled) setFailed({ key, message: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [key, contract.id, contract.hasScan, loadDetail, attempt])

  const pages = loaded?.key === key ? loaded.pages : []
  const loading = contract.hasScan && loaded?.key !== key && failed?.key !== key
  const error = contract.hasScan && loaded?.key !== key && failed?.key === key ? failed.message : null
  const totalPages = pages.length
  const current = totalPages > 0 ? pages[Math.min(page, totalPages) - 1] : null
  const isPdf = current?.mime === 'application/pdf'

  const pdfBlobUrl = useMemo(() => (current && isPdf ? dataUrlToBlobUrl(current.dataUrl) : null), [current, isPdf])
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl)
    }
  }, [pdfBlobUrl])

  function downloadAll() {
    // Browsers drop rapid-fire downloads, so they are spaced out slightly.
    pages.forEach((scan, index) => window.setTimeout(() => downloadPage(contract, scan, index), index * 350))
  }

  function renderPaper(isLargeView: boolean) {
    if (!contract.hasScan) {
      return <div className="csv-empty">Hợp đồng này chưa có bản scan. Hãy tải bản scan lên bằng nút “Sửa hợp đồng”.</div>
    }
    if (loading) return <div className="csv-empty">Đang tải bản scan hợp đồng...</div>
    if (error) {
      return (
        <div className="csv-empty">
          <div>Không tải được bản scan: {error}</div>
          <button
            type="button"
            className="csv-fullscreen-btn"
            onClick={() => {
              setFailed(null)
              setAttempt((n) => n + 1)
            }}
          >
            Thử lại
          </button>
        </div>
      )
    }
    if (!current) return <div className="csv-empty">Bản scan của hợp đồng này bị trống.</div>

    return (
      <div
        className={`csv-paper ${isLargeView ? 'csv-paper--large' : ''}`}
        style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
      >
        {isPdf ? (
          pdfBlobUrl ? (
            <iframe
              title={current.fileName}
              src={pdfBlobUrl}
              style={{ width: '100%', height: isLargeView ? 760 : 480, border: 0, background: '#fff' }}
            />
          ) : (
            <div style={{ padding: 24, color: '#444' }}>Không thể hiển thị tệp PDF này.</div>
          )
        ) : (
          <img
            src={current.dataUrl}
            alt={`${contract.contractCode} - ${current.fileName}`}
            className="csv-uploaded-img"
            style={{ maxHeight: isLargeView ? 760 : 480 }}
          />
        )}
      </div>
    )
  }

  const canBrowse = totalPages > 0

  return (
    <>
      <div className="csv-viewer">
        <div className="csv-toolbar">
          <div className="csv-toolbar__left">
            <div className="csv-toolbar__pdf-box">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isPdf ? 'picture_as_pdf' : 'image'}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="csv-toolbar__title">
                {canBrowse
                  ? `Bản scan hợp đồng (${totalPages} tệp) - ${current?.fileName ?? ''}`
                  : `Bản scan hợp đồng #${contract.contractCode}`}
              </div>
              <div className="csv-toolbar__hash">
                <span className="csv-toolbar__hash-dot" />
                <span>
                  {canBrowse
                    ? `Tệp do Quản trị viên tải lên · ${current?.sizeText ?? ''}`
                    : contract.hasScan
                      ? 'Đang lấy tệp từ máy chủ'
                      : 'Chưa có tệp scan'}
                </span>
              </div>
            </div>
          </div>

          {canBrowse ? (
            <div className="csv-toolbar__controls">
              <div className="csv-ctrl-group">
                <button type="button" className="csv-ctrl-btn" title="Tệp trước" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>chevron_left</span>
                </button>
                <span className="csv-ctrl-label">Tệp {Math.min(page, totalPages)} / {totalPages}</span>
                <button type="button" className="csv-ctrl-btn" title="Tệp tiếp" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>chevron_right</span>
                </button>

                <div className="csv-ctrl-divider" />

                <button type="button" className="csv-ctrl-btn" title="Thu nhỏ" disabled={zoom <= 75} onClick={() => setZoom((z) => Math.max(75, z - 10))}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>zoom_out</span>
                </button>
                <span className="csv-ctrl-label csv-ctrl-label--cyan">{zoom}%</span>
                <button type="button" className="csv-ctrl-btn" title="Phóng to" disabled={zoom >= 135} onClick={() => setZoom((z) => Math.min(135, z + 10))}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>zoom_in</span>
                </button>
                <button type="button" className="csv-ctrl-btn" title="Xoay 90 độ" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>rotate_right</span>
                </button>
              </div>

              <button type="button" className="csv-fullscreen-btn" title="Xem toàn màn hình" onClick={() => setFullscreenOpen(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>fullscreen</span>
                <span>Toàn màn hình</span>
              </button>

              <button
                type="button"
                className="csv-download-btn"
                onClick={() => (totalPages > 1 ? downloadAll() : current && downloadPage(contract, current, 0))}
                title="Tải xuống bản scan"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>download</span>
                <span>{totalPages > 1 ? `Tải ${totalPages} tệp` : 'Tải xuống'}</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className={`csv-stage ${large ? 'csv-stage--large' : ''}`}>{renderPaper(large)}</div>

        {totalPages > 1 ? (
          <div className="csv-thumbs">
            {pages.map((scan, index) => (
              <button
                key={`${scan.fileName}-${index}`}
                type="button"
                className={`csv-thumb ${page === index + 1 ? 'csv-thumb--active' : ''}`}
                onClick={() => setPage(index + 1)}
                title={scan.fileName}
              >
                <div className="csv-thumb__sheet" style={{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                  {scan.mime === 'application/pdf' ? (
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#5de6ff' }}>picture_as_pdf</span>
                  ) : (
                    <img src={scan.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <span className="csv-thumb__label">Tệp {index + 1}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Modal
        open={fullscreenOpen}
        onCancel={() => setFullscreenOpen(false)}
        footer={null}
        width={880}
        centered
        title={`Bản scan hợp đồng #${contract.contractCode} — ${contract.customerName}`}
      >
        <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}>{renderPaper(true)}</div>
      </Modal>
    </>
  )
}
