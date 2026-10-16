import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useStoreStore } from '../../store/useStoreStore'
import { useAuthStore } from '../../auth/store'
import { getStorePromotions, createStorePromotion, updatePromotion, deletePromotion } from '../../api/promotions'
import type { Promotion, PromotionPayload } from '../../types/promotion'

const { Title } = Typography
type PromotionForm = Omit<PromotionPayload, 'startDate' | 'endDate'> & { dates: [Dayjs, Dayjs] }

export function StorePromotionsPage() {
  const ownerStores = useStoreStore((state) => state.ownerStores)
  const loadStoresByOwner = useStoreStore((state) => state.loadStoresByOwner)
  const currentUser = useAuthStore((state) => state.user)
  const [storeId, setStoreId] = useState<string>()
  const [items, setItems] = useState<Promotion[]>([])
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form] = Form.useForm<PromotionForm>()
  const { message } = AntApp.useApp()
  useEffect(() => { if (currentUser) void loadStoresByOwner(currentUser.id).catch((error: Error) => message.error(error.message)) }, [currentUser, loadStoresByOwner, message])
  useEffect(() => { if (!storeId && ownerStores[0]) setStoreId(ownerStores[0].id) }, [ownerStores, storeId])
  useEffect(() => { if (storeId) getStorePromotions(storeId).then(setItems).catch((error: Error) => message.error(error.message)) }, [message, storeId])
  function openCreate() { form.resetFields(); form.setFieldsValue({ status: 'draft', dates: [dayjs(), dayjs().add(7, 'day')] }); setEditing({ id: '', storeId: storeId ?? '', title: '', description: '', discountText: '', startDate: '', endDate: '', status: 'draft' }) }
  function openEdit(item: Promotion) { form.setFieldsValue({ title: item.title, description: item.description, discountText: item.discountText, status: item.status, dates: [dayjs(item.startDate), dayjs(item.endDate)] }); setEditing(item) }
  async function save(values: PromotionForm) { if (!storeId) return; const payload: PromotionPayload = { title: values.title, description: values.description, discountText: values.discountText, imageUrl: values.imageUrl, status: values.status, startDate: values.dates[0].toISOString(), endDate: values.dates[1].toISOString() }; try { const result = editing?.id ? await updatePromotion(editing.id, payload) : await createStorePromotion(storeId, payload); setItems((current) => editing?.id ? current.map((item) => item.id === result.id ? result : item) : [...current, result]); setEditing(null); message.success('Đã lưu khuyến mãi') } catch (error) { message.error((error as Error).message) } }
  return <main className="workspace"><section className="page-heading"><div><Typography.Text type="secondary">Chủ gian hàng</Typography.Text><Title level={1}>Khuyến mãi</Title></div></section><Card className="tool-card"><Space className="full-width" style={{ justifyContent: 'space-between', marginBottom: 16 }}><Select value={storeId} placeholder="Chọn gian hàng" onChange={setStoreId} options={ownerStores.map((store) => ({ value: store.id, label: store.name }))} /><Button type="primary" icon={<PlusOutlined />} disabled={!storeId} onClick={openCreate}>Thêm khuyến mãi</Button></Space>{storeId ? <Table<Promotion> rowKey="id" dataSource={items} pagination={false} locale={{ emptyText: 'Chưa có khuyến mãi' }} columns={[{ title: 'Tiêu đề', dataIndex: 'title' }, { title: 'Ưu đãi', dataIndex: 'discountText' }, { title: 'Thời gian', render: (_: unknown, item: Promotion) => `${dayjs(item.startDate).format('DD/MM/YYYY')} - ${dayjs(item.endDate).format('DD/MM/YYYY')}` }, { title: 'Trạng thái', dataIndex: 'status', render: (status: Promotion['status']) => <Tag color={status === 'published' ? 'green' : 'gold'}>{status === 'published' ? 'Đã đăng' : 'Bản nháp'}</Tag> }, { title: 'Hành động', render: (_: unknown, item: Promotion) => <Space><Button size="small" onClick={() => openEdit(item)}>Sửa</Button><Popconfirm title="Xoá khuyến mãi?" okText="Xoá" cancelText="Hủy" onConfirm={() => void deletePromotion(item.id).then(() => setItems((current) => current.filter((entry) => entry.id !== item.id))).then(() => message.success('Đã xoá khuyến mãi')).catch((error: Error) => message.error(error.message))}><Button danger size="small" icon={<DeleteOutlined />} /></Popconfirm></Space> }]} /> : <Empty description="Bạn chưa có gian hàng nào" />}</Card><Modal title={editing?.id ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'} open={Boolean(editing)} okText="Lưu" cancelText="Hủy" onCancel={() => setEditing(null)} onOk={() => form.submit()}><Form form={form} layout="vertical" onFinish={save}><Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="discountText" label="Ưu đãi" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="description" label="Mô tả"><Input.TextArea /></Form.Item><Form.Item name="imageUrl" label="URL ảnh"><Input /></Form.Item><Form.Item name="dates" label="Thời gian" rules={[{ required: true }]}><DatePicker.RangePicker /></Form.Item><Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã đăng' }]} /></Form.Item></Form></Modal></main>
}
