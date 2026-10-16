import { useEffect, useState } from 'react'
import { App as AntApp, Avatar, Button, Empty, Form, Image, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ShopOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { useStoreStore } from '../../store/useStoreStore'
import { usePermissions } from '../../auth/usePermissions'
import { getStoreOwners, type StoreOwnerSummary } from '../../api/storeOwners'
import type { Store, StoreStatus } from '../../types/store'

const { Paragraph, Text, Title } = Typography
type StoreFormValues = { name: string; category: string; description: string; ownerUserId: string | null }
function statusColor(status: StoreStatus) { return status === 'active' ? 'green' : 'gold' }

export function StoreListPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [detailStore, setDetailStore] = useState<Store | null>(null)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [owners, setOwners] = useState<StoreOwnerSummary[]>([])
  const [form] = Form.useForm<StoreFormValues>()
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const storesByFloorId = useStoreStore((state) => state.storesByFloorId)
  const isLoading = useStoreStore((state) => state.isLoading)
  const isSaving = useStoreStore((state) => state.isSaving)
  const loadStoresByFloor = useStoreStore((state) => state.loadStoresByFloor)
  const createStore = useStoreStore((state) => state.createStore)
  const updateStore = useStoreStore((state) => state.updateStore)
  const deleteStore = useStoreStore((state) => state.deleteStore)
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = Boolean(selectedFloor && !readOnly && permissions.canEditFloor(selectedFloor))
  const stores = selectedFloor ? storesByFloorId[selectedFloor.id] ?? [] : []

  useEffect(() => { if (selectedFloor) loadStoresByFloor(selectedFloor.id).catch((error: Error) => message.error(error.message)) }, [loadStoresByFloor, message, selectedFloor])
  useEffect(() => { if (canEdit) getStoreOwners().then(setOwners).catch(() => setOwners([])) }, [canEdit])

  function openCreate() {
    if (!selectedFloor) return
    form.resetFields()
    form.setFieldsValue({ category: 'Dịch vụ', description: '', ownerUserId: null })
    setEditingStore({ id: '', ownerUserId: null, createdByUserId: '', buildingId: selectedFloor.buildingId, floorId: selectedFloor.id, name: '', logoUrl: null, galleryImageUrls: [], description: '', category: 'Dịch vụ', status: 'active' })
  }
  function openEdit(store: Store) { form.setFieldsValue({ name: store.name, category: store.category, description: store.description, ownerUserId: store.ownerUserId }); setEditingStore(store) }
  async function saveStore(values: StoreFormValues) {
    if (!selectedFloor || !editingStore) return
    try {
      if (editingStore.id) await updateStore(editingStore.id, values)
      else await createStore({ ...values, buildingId: selectedFloor.buildingId, floorId: selectedFloor.id, status: 'active' })
      await loadStoresByFloor(selectedFloor.id)
      setEditingStore(null)
      message.success(editingStore.id ? 'Đã cập nhật gian hàng' : 'Đã tạo gian hàng')
    } catch (error) { message.error((error as Error).message) }
  }

  if (!selectedFloor) return <div className="store-list-empty"><Empty description="Chọn tầng để xem danh sách gian hàng" /></div>
  return <div className="store-list-panel">
    <Space className="full-width" style={{ justifyContent: 'space-between', marginBottom: 16 }}><Title level={3} style={{ margin: 0 }}>Gian hàng trong tầng</Title><Button type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={openCreate}>Thêm gian hàng</Button></Space>
    <Table<Store> rowKey="id" loading={isLoading} dataSource={stores} pagination={false} locale={{ emptyText: 'Tầng này chưa có gian hàng' }} columns={[
      { title: 'Logo', dataIndex: 'logoUrl', width: 76, render: (logoUrl: Store['logoUrl'], store: Store) => <Avatar shape="square" size={42} src={logoUrl ?? undefined} icon={logoUrl ? undefined : <ShopOutlined />}>{store.name.slice(0, 1)}</Avatar> },
      { title: 'Tên gian hàng', dataIndex: 'name', render: (name: string) => <Text strong>{name}</Text> },
      { title: 'Nhóm dịch vụ', dataIndex: 'category', width: 140 },
      { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (status: StoreStatus) => <Tag color={statusColor(status)}>{status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}</Tag> },
      { title: 'Hành động', key: 'actions', width: 270, render: (_value: unknown, store: Store) => <Space wrap><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailStore(store)}>Xem chi tiết</Button><Button size="small" icon={<EditOutlined />} disabled={!canEdit} onClick={() => openEdit(store)}>Sửa</Button><Popconfirm title={`Xoá gian hàng ${store.name}?`} okText="Xoá" cancelText="Hủy" onConfirm={() => void deleteStore(store.id).then(() => loadStoresByFloor(selectedFloor.id)).then(() => message.success('Đã xoá gian hàng')).catch((error: Error) => message.error(error.message))}><Button danger size="small" icon={<DeleteOutlined />} disabled={!canEdit} /></Popconfirm></Space> },
    ]} />
    <Modal title={detailStore?.name} open={Boolean(detailStore)} footer={null} onCancel={() => setDetailStore(null)}>{detailStore ? <Space orientation="vertical" size="middle" className="full-width"><Space><Avatar shape="square" size={56} src={detailStore.logoUrl ?? undefined} icon={detailStore.logoUrl ? undefined : <ShopOutlined />} /><Space orientation="vertical" size={2}><Text strong>{detailStore.category}</Text><Tag color={statusColor(detailStore.status)}>{detailStore.status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}</Tag></Space></Space><Paragraph>{detailStore.description}</Paragraph>{detailStore.galleryImageUrls.length > 0 ? <Image.PreviewGroup><div className="store-gallery-grid">{detailStore.galleryImageUrls.map((url) => <Image key={url} src={url} alt={detailStore.name} />)}</div></Image.PreviewGroup> : <Empty description="Chưa có ảnh thực tế" />}</Space> : null}</Modal>
    <Modal title={editingStore?.id ? 'Sửa gian hàng' : 'Thêm gian hàng'} open={Boolean(editingStore)} okText="Lưu" cancelText="Hủy" confirmLoading={isSaving} onCancel={() => setEditingStore(null)} onOk={() => form.submit()} destroyOnHidden><Form form={form} layout="vertical" onFinish={saveStore}><Form.Item name="name" label="Tên gian hàng" rules={[{ required: true, message: 'Vui lòng nhập tên gian hàng' }]}><Input /></Form.Item><Form.Item name="category" label="Nhóm dịch vụ" rules={[{ required: true, message: 'Vui lòng chọn nhóm dịch vụ' }]}><Select options={['Thời trang', 'Ăn uống', 'Dịch vụ'].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item name="description" label="Mô tả"><Input.TextArea rows={4} /></Form.Item><Form.Item name="ownerUserId" label="Chủ gian hàng"><Select allowClear placeholder="Chưa gán" options={owners.filter((owner) => owner.status === 'active').map((owner) => ({ value: owner.id, label: `${owner.name} (${owner.email})` }))} /></Form.Item></Form></Modal>
  </div>
}
