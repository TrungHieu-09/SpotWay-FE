import { useEffect } from 'react'
import { Button, Empty, Skeleton, Statistic } from 'antd'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GuestShell } from '../../components/navigation/GuestShell'
import { useNavigationStore } from '../../store/useNavigationStore'

export function GuestBuildingPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const floors = useNavigationStore((state) => state.floors)
  const destinations = useNavigationStore((state) => state.destinations)
  const isLoading = useNavigationStore((state) => state.isLoading)
  const loadedBuildingId = useNavigationStore((state) => state.buildingId)
  const load = useNavigationStore((state) => state.load)

  useEffect(() => {
    if (buildingId && loadedBuildingId !== buildingId) void load(buildingId)
  }, [buildingId, loadedBuildingId, load])

  if (!buildingId) return <Navigate to="/" replace />
  const sortedFloors = [...floors].sort((a, b) => a.floorNumber - b.floorNumber)

  return (
    <GuestShell buildingId={buildingId} active="building">
      <h1 className="guest-shell__title">{t('building.title')}</h1>
      {isLoading ? (
        <Skeleton active />
      ) : floors.length === 0 ? (
        <Empty description={t('building.empty')} />
      ) : (
        <>
          <div className="guest-shell__card guest-shell__row" style={{ justifyContent: 'space-around' }}>
            <Statistic title={t('building.floors')} value={floors.length} />
            <Statistic title={t('building.stores')} value={destinations.filter((item) => item.type === 'STORE').length} />
            <Statistic title={t('building.pois')} value={destinations.filter((item) => item.type === 'POI').length} />
          </div>
          <div className="guest-shell__card">
            {sortedFloors.map((floor) => (
              <div key={floor.id} className="guest-shell__row" style={{ padding: '6px 0' }}>
                <span>{floor.name}</span>
                <span className="guest-shell__muted">{t('search.floor')} {floor.floorNumber}</span>
              </div>
            ))}
          </div>
          <Button type="primary" size="large" block onClick={() => navigate(`/guest/${buildingId}/map`)}>
            {t('building.enter')}
          </Button>
        </>
      )}
    </GuestShell>
  )
}
