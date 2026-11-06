import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, Input, Space, Tag } from 'antd'
import { StarFilled, StarOutlined } from '@ant-design/icons'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GuestShell } from '../../components/navigation/GuestShell'
import { selectBuildingLists, useGuestMemoryStore } from '../../store/useGuestMemoryStore'
import { useNavigationStore } from '../../store/useNavigationStore'
import type { PublicSearchResult } from '../../types/navigation'

export function GuestSearchPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const floors = useNavigationStore((state) => state.floors)
  const destinations = useNavigationStore((state) => state.destinations)
  const loadedBuildingId = useNavigationStore((state) => state.buildingId)
  const load = useNavigationStore((state) => state.load)
  const lists = useGuestMemoryStore((state) => selectBuildingLists(state, buildingId ?? ''))
  const toggleFavorite = useGuestMemoryStore((state) => state.toggleFavorite)
  const addRecent = useGuestMemoryStore((state) => state.addRecent)
  const clearRecent = useGuestMemoryStore((state) => state.clearRecent)

  useEffect(() => {
    if (buildingId && loadedBuildingId !== buildingId) void load(buildingId)
  }, [buildingId, loadedBuildingId, load])

  const byId = useMemo(() => new Map(destinations.map((item) => [item.id, item])), [destinations])
  const floorName = useMemo(() => new Map(floors.map((floor) => [floor.id, floor.name])), [floors])
  const normalized = query.trim().toLowerCase()
  const results = normalized ? destinations.filter((item) => item.name.toLowerCase().includes(normalized)) : []
  const recent = lists.recent.map((id) => byId.get(id)).filter((item): item is PublicSearchResult => Boolean(item))
  const favorites = lists.favorites.map((id) => byId.get(id)).filter((item): item is PublicSearchResult => Boolean(item))

  if (!buildingId) return <Navigate to="/" replace />
  const id = buildingId

  function go(destination: PublicSearchResult) {
    addRecent(id, destination.id)
    navigate(`/guest/${id}/map?toStoreId=${encodeURIComponent(destination.id)}`)
  }

  function renderItem(destination: PublicSearchResult) {
    const isFavorite = lists.favorites.includes(destination.id)
    return (
      <div key={destination.id} className="guest-shell__row" style={{ padding: '8px 0' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{destination.name}</div>
          <Space size={6}>
            <Tag>{destination.type === 'STORE' ? t('building.stores') : t('building.pois')}</Tag>
            <span className="guest-shell__muted">{floorName.get(destination.floorId) ?? ''}</span>
          </Space>
        </div>
        <Space>
          <Button
            type="text"
            aria-label={isFavorite ? t('search.favoriteRemove') : t('search.favoriteAdd')}
            icon={isFavorite ? <StarFilled style={{ color: '#f59e0b' }} /> : <StarOutlined />}
            onClick={() => toggleFavorite(id, destination.id)}
          />
          <Button type="primary" onClick={() => go(destination)}>{t('search.go')}</Button>
        </Space>
      </div>
    )
  }

  return (
    <GuestShell buildingId={id} active="search">
      <Input.Search size="large" allowClear placeholder={t('search.placeholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
      <div style={{ marginTop: 16 }}>
        {normalized ? (
          <div className="guest-shell__card">
            <strong>{t('search.results')}</strong>
            {results.length === 0 ? <Empty description={t('search.empty')} /> : results.map(renderItem)}
          </div>
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="guest-shell__card">
                <strong>{t('search.favorites')}</strong>
                {favorites.map(renderItem)}
              </div>
            )}
            {recent.length > 0 && (
              <div className="guest-shell__card">
                <div className="guest-shell__row">
                  <strong>{t('search.recent')}</strong>
                  <Button size="small" type="link" onClick={() => clearRecent(id)}>{t('search.clearRecent')}</Button>
                </div>
                {recent.map(renderItem)}
              </div>
            )}
          </>
        )}
      </div>
    </GuestShell>
  )
}
