import { useCallback, useEffect, useMemo, useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd'
import { DeleteOutlined, GiftOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useFloorStore } from '../../store/useFloorStore'
import { useGraphStore } from '../../store/useGraphStore'
import { useLoadFloorData } from '../../hooks/useLoadFloorData'
import { AppSelect as Select } from '../../components/ui/AppSelect'
import { createStore, deleteStore, getStoresByFloor, updateStore } from '../../api/stores'
import { createStorePromotion, deletePromotion, getStorePromotions, updatePromotion } from '../../api/promotions'
import type { Store } from '../../types/store'
import type { Promotion } from '../../types/promotion'
import type { GraphNode } from '../../types/graph'

const { Text } = Typography
const NO_NODES: GraphNode[] = []

type StoreForm = { name: string; description?: string; nodeId?: string }
type PromoForm = { title: string; description?: string; dates: [Dayjs, Dayjs] }

/**
 * Gian hàng và khuyến mãi của tầng đang chọn. Chủ gian hàng đăng ký với Manager của tòa;
 * Manager nhập ở đây và khách của đúng tòa này thấy trên điện thoại.
 */
export function ShopPromotionsPanel({ buildingId, readOnly = false }: { buildingId: string; readOnly?: boolean }) {
  const floor = useFloorStore((state) => state.selectedFloor)
  const nodes: GraphNode[] = useGraphStore((state) => (floor ? state.nodesByFloor[floor.id] : undefined)) ?? NO_NODES
  useLoadFloorData(floor ? [floor] : [])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(false)
  const [storeModal, setStoreModal] = useState<Store | 'new' | null>(null)
  const [promoStore, setPromoStore] = useState<Store | null>(null)
  const [promos, setPromos] = useState<Promotion[]>([])
  const [promoEdit, setPromoEdit] = useState<Promotion | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [storeForm] = Form.useForm<StoreForm>()
  const [promoForm] = Form.useForm<PromoForm>()
  const { message } = AntApp.useApp()
  const floorId = floor?.id
  const canEdit = !readOnly && Boolean(floor)

  const loadStores = useCallback(async () => {
    if (!floorId) return setStores([])
    setLoading(true)
    try {
      setStores(await getStoresByFloor(floorId))
    } catch (error) {
      setStores([])
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [floorId, message])

  useEffect(() => {
    setPromoStore(null)
    void loadStores()
  }, [loadStores, buildingId])

  const nodeOptions = useMemo(
    () => nodes.map((node) => ({ value: node.id, label: node.name?.trim() || `${node.type} · ${node.id.slice(0, 6)}` })),
    [nodes],
  )
  const nodeLabel = (id?: string | null) => nodeOptions.find((option) => option.value === id)?.label

  function openStore(target: Store | 'new') {
    storeForm.resetFields()
    if (target !== 'new') storeForm.setFieldsValue({ name: target.name, description: target.description, nodeId: target.nodeId ?? undefined })
    setStoreModal(target)
  }

  async function saveStore(values: StoreForm) {
    if (!floorId || !storeModal) return
    setSaving(true)
    try {
      if (storeModal === 'new') {
        await createStore({ buildingId, floorId, nodeId: values.nodeId, name: values.name.trim(), description: values.description?.trim() ?? '', status: 'active' })
        message.success('Đã thêm gian hàng')
      } else {
        await updateStore(storeModal.id, { name: values.name.trim(), description: values.description?.trim() ?? '', nodeId: values.nodeId ?? null })
        message.success('Đã lưu gian hàng')
      }
      setStoreModal(null)
      await loadStores()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStore(store: Store, active: boolean) {
    try {
      await updateStore(store.id, { status: active ? 'active' : 'inactive' })
      await loadStores()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function removeStore(store: Store) {
    try {
      await deleteStore(store.id)
      if (promoStore?.id === store.id) setPromoStore(null)
      await loadStores()
      message.success('Đã xóa gian hàng')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function openPromos(store: Store) {
    setPromoStore(store)
    setPromos([])
    try {
      setPromos(await getStorePromotions(store.id))
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  function openPromo(target: Promotion | 'new') {
    promoForm.resetFields()
    if (target === 'new') promoForm.setFieldsValue({ dates: [dayjs(), dayjs().add(7, 'day')] })
    else promoForm.setFieldsValue({ title: target.title, description: target.description, dates: [dayjs(target.startDate), dayjs(target.endDate)] })
    setPromoEdit(target)
  }

  async function savePromo(values: PromoForm) {
    if (!promoStore || !promoEdit) return
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() ?? '',
      discountText: '',
      status: 'published' as const,
      startDate: values.dates[0].startOf('day').toISOString(),
      endDate: values.dates[1].endOf('day').toISOString(),
    }
    setSaving(true)
    try {
      if (promoEdit === 'new') await createStorePromotion(promoStore.id, payload)
      else await updatePromotion(promoEdit.id, payload)
      setPromoEdit(null)
      setPromos(await getStorePromotions(promoStore.id))
      message.success('Đã đăng khuyến mãi. Khách của tòa này sẽ thấy trên điện thoại.')
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function removePromo(promo: Promotion) {
    try {
      await deletePromotion(promo.id)
      setPromos((current) => current.filter((item) => item.id !== promo.id))
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return (
    <Space direction="vertical" size={16} className="full-width">
      <Card
        className="tool-card"
        title={<Space><ShopOutlined />Gian hàng {floor ? `· ${floor.name}` : ''}</Space>}
        extra={<Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={() => openStore('new')}>Thêm gian hàng</Button>}
      >
        {floor ? (
          <Table<Store>
            rowKey="id"
            size="small"
            loading={loading}
            dataSource={stores}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tầng này chưa có gian hàng" /> }}
            columns={[
              { title: 'Gian hàng', dataIndex: 'name' },
              { title: 'Vị trí trên bản đồ', render: (_: unknown, store) => nodeLabel(store.nodeId) ?? <Text type="secondary">Chưa gắn node</Text> },
              { title: 'Hiển thị cho khách', render: (_: unknown, store) => <Switch checked={store.status === 'active'} disabled={!canEdit} onChange={(checked) => void toggleStore(store, checked)} /> },
              {
                title: '',
                render: (_: unknown, store) => (
                  <Space>
                    <Button size="small" icon={<GiftOutlined />} onClick={() => void openPromos(store)}>Khuyến mãi</Button>
                    <Button size="small" disabled={!canEdit} onClick={() => openStore(store)}>Sửa</Button>
                    <Popconfirm title="Xóa gian hàng?" okText="Xóa" cancelText="Hủy" onConfirm={() => void removeStore(store)} disabled={!canEdit}>
                      <Button size="small" danger disabled={!canEdit} icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="Chọn tầng ở thanh phía trên" />
        )}
      </Card>

      {promoStore ? (
        <Card
          className="tool-card"
          title={<Space><GiftOutlined />Khuyến mãi của {promoStore.name}</Space>}
          extra={<Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={() => openPromo('new')}>Đăng khuyến mãi</Button>}
        >
          <Table<Promotion>
            rowKey="id"
            size="small"
            dataSource={promos}
            pagination={false}
            locale={{ emptyText: 'Gian hàng này chưa có khuyến mãi' }}
            columns={[
              { title: 'Tiêu đề', dataIndex: 'title' },
              { title: 'Thời gian', render: (_: unknown, p) => `${dayjs(p.startDate).format('DD/MM/YYYY')} - ${dayjs(p.endDate).format('DD/MM/YYYY')}` },
              { title: 'Trạng thái', render: (_: unknown, p) => (dayjs().isAfter(dayjs(p.endDate)) ? <Tag>Hết hạn</Tag> : dayjs().isBefore(dayjs(p.startDate)) ? <Tag color="gold">Sắp diễn ra</Tag> : <Tag color="green">Đang chạy</Tag>) },
              {
                title: '',
                render: (_: unknown, p) => (
                  <Space>
                    <Button size="small" disabled={!canEdit} onClick={() => openPromo(p)}>Sửa</Button>
                    <Popconfirm title="Xóa khuyến mãi?" okText="Xóa" cancelText="Hủy" onConfirm={() => void removePromo(p)} disabled={!canEdit}>
                      <Button size="small" danger disabled={!canEdit} icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      <Modal title={storeModal === 'new' ? 'Thêm gian hàng' : 'Sửa gian hàng'} open={Boolean(storeModal)} okText="Lưu" cancelText="Hủy" confirmLoading={saving} onCancel={() => setStoreModal(null)} onOk={() => storeForm.submit()}>
        <Form form={storeForm} layout="vertical" onFinish={(values) => void saveStore(values)}>
          <Form.Item name="name" label="Tên gian hàng" rules={[{ required: true, message: 'Nhập tên gian hàng' }]}><Input maxLength={120} /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
          <Form.Item name="nodeId" label="Vị trí trên bản đồ (node)" extra="Khách tìm gian hàng và được chỉ đường tới node này."><Select showSearch optionFilterProp="label" allowClear options={nodeOptions} placeholder="Chọn node" /></Form.Item>
        </Form>
      </Modal>
      <Modal title={promoEdit === 'new' ? 'Đăng khuyến mãi' : 'Sửa khuyến mãi'} open={Boolean(promoEdit)} okText="Lưu" cancelText="Hủy" confirmLoading={saving} onCancel={() => setPromoEdit(null)} onOk={() => promoForm.submit()}>
        <Form form={promoForm} layout="vertical" onFinish={(values) => void savePromo(values)}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}><Input maxLength={120} /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
          <Form.Item name="dates" label="Thời gian áp dụng" rules={[{ required: true, message: 'Chọn thời gian' }]}><DatePicker.RangePicker className="full-width" /></Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
