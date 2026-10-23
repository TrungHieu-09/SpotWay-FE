export function FloorPlanIllustration() {
  return (
    <svg className="floor-plan-illustration" viewBox="0 0 640 420" role="img" aria-label="Minh hoạ bản đồ mặt bằng trong nhà">
      <rect x="28" y="28" width="584" height="364" rx="18" className="illustration-surface" />
      <path d="M78 82h194v104H78zM318 82h244v104H318zM78 238h134v104H78zM248 238h144v104H248zM428 238h134v104H428z" className="illustration-room" />
      <path d="M292 82v260M78 210h484M78 186h484" className="illustration-wall" />
      <path d="M108 360h350" className="illustration-route" />
      <circle cx="106" cy="360" r="11" className="illustration-start" />
      <circle cx="468" cy="132" r="12" className="illustration-destination" />
      <path d="m455 142 13-10 13 10" className="illustration-route-arrow" />
      <text x="104" y="386" className="illustration-label">Cổng vào</text>
      <text x="440" y="112" className="illustration-label">Điểm đến</text>
      <text x="134" y="139" className="illustration-room-label">Gian hàng</text>
      <text x="370" y="139" className="illustration-room-label">Sảnh chính</text>
      <text x="113" y="296" className="illustration-room-label">Dịch vụ</text>
      <text x="282" y="296" className="illustration-room-label">Thang máy</text>
      <text x="464" y="296" className="illustration-room-label">Văn phòng</text>
    </svg>
  )
}
