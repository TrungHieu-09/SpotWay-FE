import { useNavigate } from 'react-router-dom'
import { useContractAlertStore } from '../../store/useContractAlertStore'
import { formatDateVN } from '../../types/contract'

/** Shown to a Building Owner across the workspace once the contract has about a month left. */
export function ContractExpiryBanner() {
  const alert = useContractAlertStore((state) => state.alert)
  const navigate = useNavigate()
  if (!alert) return null

  const { contract, daysRemaining } = alert
  const expired = daysRemaining < 0
  const when = expired
    ? `đã hết hạn ${Math.abs(daysRemaining)} ngày trước`
    : daysRemaining === 0
      ? 'hết hạn hôm nay'
      : `còn ${daysRemaining} ngày`

  return (
    <div className={`ol-alert ${expired ? 'ol-alert--expired' : ''}`} role="alert">
      <span className="material-symbols-outlined ol-alert__icon">{expired ? 'error' : 'event_busy'}</span>
      <div className="ol-alert__text">
        <strong>
          Hợp đồng #{contract.contractCode} {when}
        </strong>
        <span>
          {' '}
          (kết thúc {formatDateVN(contract.endDate)}).{' '}
          {contract.renewalRequested
            ? 'Bạn đã gửi yêu cầu gia hạn, Quản trị viên sẽ liên hệ để thống nhất.'
            : 'Hãy gửi yêu cầu gia hạn để Quản trị viên liên hệ với bạn.'}
        </span>
      </div>
      {!contract.renewalRequested && (
        <button type="button" className="ol-alert__btn" onClick={() => navigate('/owner/contracts')}>
          Gửi yêu cầu gia hạn
        </button>
      )}
    </div>
  )
}
