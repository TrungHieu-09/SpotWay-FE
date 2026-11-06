import { useRef, useState } from 'react'
import { Alert, Modal } from 'antd'
import { extractQrToken } from '../../utils/qrToken'

type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike

type QrScanModalProps = {
  open: boolean
  onClose: () => void
  /** Gọi khi đọc được mã QR hợp lệ của hệ thống (đã tách lấy token). */
  onToken: (token: string) => void
}

/**
 * Quét mã QR ngay trong ứng dụng (camera + `BarcodeDetector` của trình duyệt) để cập nhật vị trí mà không phải
 * mở lại trang, nên điểm đến đang chọn được giữ nguyên. Trình duyệt không hỗ trợ thì hướng dẫn dùng camera điện thoại.
 */
export function QrScanModal({ open, onClose, onToken }: QrScanModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<() => void>(() => undefined)
  const [problem, setProblem] = useState<string>()
  const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector

  async function start() {
    setProblem(undefined)
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setProblem('Trình duyệt này chưa hỗ trợ quét QR trong ứng dụng. Hãy dùng camera điện thoại quét mã, trang sẽ tự cập nhật vị trí.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      video.srcObject = stream
      await video.play()
      const detector = new Detector({ formats: ['qr_code'] })
      const timer = window.setInterval(() => {
        void detector
          .detect(video)
          .then((codes) => {
            const token = codes.map((code) => extractQrToken(code.rawValue)).find(Boolean)
            if (token) {
              stopRef.current()
              onToken(token)
            }
          })
          .catch(() => undefined)
      }, 400)
      stopRef.current = () => {
        window.clearInterval(timer)
        stream.getTracks().forEach((track) => track.stop())
        stopRef.current = () => undefined
      }
    } catch {
      setProblem('Không mở được camera. Hãy cho phép truy cập camera cho trang này (cần HTTPS hoặc localhost).')
    }
  }

  return (
    <Modal
      title="Quét mã QR để cập nhật vị trí"
      open={open}
      footer={null}
      onCancel={() => {
        stopRef.current()
        onClose()
      }}
      afterOpenChange={(isOpen) => {
        if (isOpen) void start()
        else stopRef.current()
      }}
      destroyOnHidden
    >
      {problem ? (
        <Alert type="warning" showIcon message={problem} />
      ) : (
        <video ref={videoRef} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000' }} />
      )}
    </Modal>
  )
}
