import { useEffect, useState } from 'react'
import { App as AntApp, Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Space, Table, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useStoreStore } from '../../store/useStoreStore'
import { useAuthStore } from '../../auth/store'
import { getStorePromotions, createStorePromotion, updatePromotion, deletePromotion } from '../../api/promotions'
import type { Promotion, PromotionPayload } from '../../types/promotion'
import { AppSelect as Select } from '../../components/ui/AppSelect'
import { PageHeader } from '../../components/ui/PageHeader'

type PromotionForm = Omit<PromotionPayload, 'startDate' | 'endDate'> & { dates: [Dayjs, Dayjs] }

export function StorePromotionsPage() {
  const ownerStores = useStoreStore((state) => state.ownerStores)
  const loadStoresByOwner = useStoreStore((state) => state.loadStoresByOwner)
  const currentUser = useAuthStore((state) => state.user)
  const [storeId, setStoreId] = useState<string>()
  const [items, setItems] = useState<Promotion[]>([])
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form] = Form.useForm<PromotionForm>()
  const { message } = AntApp.useApp()
  useEffect(() => { if (currentUser) void loadStoresByOwner(currentUser.id).catch((error: Error) => message.error(error.message)) }, [currentUser, loadStoresByOwner, message])
  useEffect(() => { if (!storeId && ownerStores[0]) setStoreId(ownerStores[0].id) }, [ownerStores, storeId])
  useEffect(() => {
    if (!storeId) {
      setItems([])
      return
    }

    setIsLoading(true)
    getStorePromotions(storeId)
      .then(setItems)
      .catch((error: Error) => {
        setItems([])
        message.error(`Không thể tải khuyến mãi: ${error.message}`)
      })
      .finally(() => setIsLoading(false))
  }, [message, storeId])
  function openCreate() { form.resetFields(); form.setFieldsValue({ status: 'draft', dates: [dayjs(), dayjs().add(7, 'day')] }); setEditing({ id: '', storeId: storeId ?? '', title: '', description: '', discountText: '', startDate: '', endDate: '', status: 'draft' }) }
  function openEdit(item: Promotion) { form.setFieldsValue({ title: item.title, description: item.description, discountText: item.discountText, status: item.status, dates: [dayjs(item.startDate), dayjs(item.endDate)] }); setEditing(item) }
  async function save(values: PromotionForm) {
    if (!storeId) return
    const payload: PromotionPayload = {
      title: values.title,
      description: values.description,
      discountText: values.discountText,
      imageUrl: values.imageUrl,
      status: values.status,
      startDate: values.dates[0].toISOString(),
      endDate: values.dates[1].toISOString(),
    }

    setIsSaving(true)
    try {
      const result = editing?.id
        ? await updatePromotion(editing.id, payload)
        : await createStorePromotion(storeId, payload)
      setItems((current) =>
        editing?.id
          ? current.map((item) => (item.id === result.id ? result : item))
          : [...current, result],
      )
      setEditing(null)
      message.success('Đã lưu khuyến mãi')
    } catch (error) {
      message.error(`Không thể lưu khuyến mãi: ${(error as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function removePromotion(id: string) {
    setIsSaving(true)
    try {
      await deletePromotion(id)
      setItems((current) => current.filter((entry) => entry.id !== id))
      message.success('Đã xoá khuyến mãi')
    } catch (error) {
      message.error(`Không thể xoá khuyến mãi: ${(error as Error).message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="workspace">
      <PageHeader eyebrow="Chủ gian hàng" title="Khuyến mãi" description="Tạo và quản lý ưu đãi hiển thị trong bản đồ khách tham quan." />
      <Card className="tool-card">
        <Space className="full-width" style={{ justifyContent: 'space-between', marginBottom: 16 }} wrap>
          <Select
            value={storeId}
            placeholder="Chọn gian hàng"
            onChange={setStoreId}
            options={ownerStores.map((store) => ({ value: store.id, label: store.name }))}
            loading={ownerStores.length === 0 && isLoading}
            style={{ minWidth: 240 }}
          />
          <Button type="primary" icon={<PlusOutlined />} disabled={!storeId || isSaving} onClick={openCreate}>
            Thêm khuyến mãi
          </Button>
        </Space>
        {storeId ? (
          <Table<Promotion>
            rowKey="id"
            loading={isLoading}
            dataSource={items}
            pagination={false}
            locale={{ emptyText: 'Chưa có khuyến mãi cho gian hàng này' }}
            columns={[
              { title: 'Tiêu đề', dataIndex: 'title' },
              { title: 'Ưu đãi', dataIndex: 'discountText' },
              { title: 'Thời gian', render: (_: unknown, item: Promotion) => `${dayjs(item.startDate).format('DD/MM/YYYY')} - ${dayjs(item.endDate).format('DD/MM/YYYY')}` },
              { title: 'Trạng thái', dataIndex: 'status', render: (status: Promotion['status']) => <Tag color={status === 'published' ? 'green' : 'gold'}>{status === 'published' ? 'Đã đăng' : 'Bản nháp'}</Tag> },
              { title: 'Hành động', render: (_: unknown, item: Promotion) => <Space><Button size="small" disabled={isSaving} onClick={() => openEdit(item)}>Sửa</Button><Popconfirm title="Xoá khuyến mãi?" okText="Xoá" cancelText="Hủy" onConfirm={() => void removePromotion(item.id)}><Button danger size="small" disabled={isSaving} icon={<DeleteOutlined />} /></Popconfirm></Space> },
            ]}
          />
        ) : (
          <Empty description={ownerStores.length === 0 ? 'Bạn chưa được gán gian hàng nào' : 'Chọn gian hàng để quản lý khuyến mãi'} />
        )}
      </Card>
      <Modal title={editing?.id ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi'} open={Boolean(editing)} okText="Lưu" cancelText="Hủy" confirmLoading={isSaving} onCancel={() => setEditing(null)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}><Input /></Form.Item>
          <Form.Item name="discountText" label="Ưu đãi" rules={[{ required: true, message: 'Vui lòng nhập nội dung ưu đãi' }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="imageUrl" label="URL ảnh"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="dates" label="Thời gian" rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}><DatePicker.RangePicker className="full-width" /></Form.Item>
          <Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'draft', label: 'Bản nháp' }, { value: 'published', label: 'Đã đăng' }]} /></Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
