import { useCallback, useEffect, useState } from 'react'
import {
  App as AntApp,
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Space,
  Spin,
  Switch,
  Tag,
  Table,
  Typography,
  Upload,
} from 'antd'
import { AppSelect as Select } from '../../components/ui/AppSelect'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import {
  PlusOutlined,
  SaveOutlined,
  ShopOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useStoreStore } from '../../store/useStoreStore'
import type { Floor } from '../../types/floor'
import type { Store, StoreStatus } from '../../types/store'
import { useAuthStore } from '../../auth/store'

const { Text, Title } = Typography
const { TextArea } = Input

const STORE_CATEGORIES = ['Thời trang', 'Ăn uống', 'Dịch vụ']

type StoreProfileFormValues = {
  name: string
  category: string
  description: string
  openingHours: string
  isActive: boolean
}

type CreateStoreFormValues = StoreProfileFormValues & {
  buildingId: string
  floorId: string
}

function statusColor(status: StoreStatus) {
  return status === 'active' ? 'green' : 'gold'
}

function uploadFileFromUrl(uid: string, url: string, name: string): UploadFile {
  return {
    uid,
    name,
    status: 'done',
    url,
  }
}

function isRcFile(file: RcFile | undefined): file is RcFile {
  return Boolean(file)
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export function StoreProfilePage() {
  const [form] = Form.useForm<StoreProfileFormValues>()
  const [createForm] = Form.useForm<CreateStoreFormValues>()
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>()
  const [editingStoreId, setEditingStoreId] = useState<string>()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createBuildingId, setCreateBuildingId] = useState<string>()
  const [detailStore, setDetailStore] = useState<Store | null>(null)
  const [floorsByBuildingId, setFloorsByBuildingId] = useState<
    Record<string, Floor[]>
  >({})
  const [logoFileList, setLogoFileList] = useState<UploadFile[]>([])
  const [galleryFileList, setGalleryFileList] = useState<UploadFile[]>([])
  const [createLogoFileList, setCreateLogoFileList] = useState<UploadFile[]>([])
  const [createGalleryFileList, setCreateGalleryFileList] = useState<
    UploadFile[]
  >([])
  const buildings = useBuildingStore((state) => state.buildings)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const ownerStores = useStoreStore((state) => state.ownerStores)
  const currentStore = useStoreStore((state) => state.currentStore)
  const isLoading = useStoreStore((state) => state.isLoading)
  const isSaving = useStoreStore((state) => state.isSaving)
  const loadStoresByOwner = useStoreStore((state) => state.loadStoresByOwner)
  const loadCurrentStore = useStoreStore((state) => state.loadCurrentStore)
  const createStore = useStoreStore((state) => state.createStore)
  const updateStore = useStoreStore((state) => state.updateStore)
  const isActive = Form.useWatch('isActive', form)
  const { message } = AntApp.useApp()
  const currentUser = useAuthStore((state) => state.user)
  const storeOwnerId = currentUser?.id ?? ''

  const loadFloorsForBuilding = useCallback(
    async (buildingId: string) => {
      if (floorsByBuildingId[buildingId]) {
        return floorsByBuildingId[buildingId]
      }

      const buildingFloors = await getFloors(buildingId)
      setFloorsByBuildingId((currentFloors) => ({
        ...currentFloors,
        [buildingId]: buildingFloors,
      }))

      return buildingFloors
    },
    [floorsByBuildingId],
  )

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
    if (!storeOwnerId) return
    loadStoresByOwner(storeOwnerId)
      .catch((error: Error) => message.error(error.message))
  }, [loadBuildings, loadStoresByOwner, message, storeOwnerId])

  useEffect(() => {
    if (ownerStores.length === 0) {
      setSelectedBuildingId(undefined)
      setEditingStoreId(undefined)
      return
    }

    if (
      !selectedBuildingId ||
      !ownerStores.some((store) => store.buildingId === selectedBuildingId)
    ) {
      setSelectedBuildingId(ownerStores[0].buildingId)
      setEditingStoreId(undefined)
    }
  }, [ownerStores, selectedBuildingId])

  useEffect(() => {
    if (!editingStoreId) {
      return
    }

    loadCurrentStore(editingStoreId).catch((error: Error) =>
      message.error(error.message),
    )
  }, [editingStoreId, loadCurrentStore, message])

  useEffect(() => {
    const buildingIds = Array.from(
      new Set(ownerStores.map((store) => store.buildingId)),
    )

    if (buildingIds.length === 0) {
      setFloorsByBuildingId({})
      return
    }

    Promise.all(
      buildingIds.map(async (buildingId) => [
        buildingId,
        await getFloors(buildingId),
      ] as const),
    )
      .then((floorEntries) => {
        setFloorsByBuildingId(Object.fromEntries(floorEntries))
      })
      .catch((error: Error) => message.error(error.message))
  }, [message, ownerStores])

  useEffect(() => {
    if (!currentStore) {
      return
    }

    form.setFieldsValue({
      name: currentStore.name,
      category: currentStore.category,
      description: currentStore.description,
      openingHours: currentStore.openingHours ?? '',
      isActive: currentStore.status === 'active',
    })
    setLogoFileList(
      currentStore.logoUrl
        ? [uploadFileFromUrl('logo-current', currentStore.logoUrl, 'logo')]
        : [],
    )
    setGalleryFileList(
      currentStore.galleryImageUrls.map((url, index) =>
        uploadFileFromUrl(`gallery-current-${index}`, url, `gallery-${index + 1}`),
      ),
    )
  }, [currentStore, form])

  function validateImage(file: RcFile) {
    if (!file.type.startsWith('image/')) {
      message.error('File upload phải là ảnh')
      return Upload.LIST_IGNORE
    }

    if (file.size > MAX_IMAGE_SIZE) {
      message.error('Ảnh không được vượt quá 5 MB')
      return Upload.LIST_IGNORE
    }

    return false
  }

  async function handleSubmit(values: StoreProfileFormValues) {
    if (!currentStore) {
      return
    }

    const logoFile = logoFileList[0]?.originFileObj
    const retainedLogoUrl = logoFile ? undefined : (logoFileList[0]?.url ?? null)
    const galleryFiles = galleryFileList
      .map((file) => file.originFileObj)
      .filter(isRcFile)
    const retainedGalleryUrls = galleryFileList
      .filter((file) => !file.originFileObj && file.url)
      .map((file) => String(file.url))

    try {
      await updateStore(currentStore.id, {
        description: values.description,
        openingHours: values.openingHours.trim(),
        status: values.isActive ? 'active' : 'inactive',
        logoUrl: retainedLogoUrl,
        logoFile,
        galleryImageUrls: retainedGalleryUrls,
        galleryFiles,
      })
      message.success('Lưu thông tin gian hàng thành công')
      setEditingStoreId(undefined)
      form.resetFields()
      setLogoFileList([])
      setGalleryFileList([])
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  function openCreateStoreModal() {
    const defaultBuildingId = selectedBuildingId ?? buildings[0]?.id
    setCreateBuildingId(defaultBuildingId)
    createForm.resetFields()
    createForm.setFieldsValue({
      buildingId: defaultBuildingId,
      description: '',
      openingHours: '',
      isActive: true,
    })
    setCreateLogoFileList([])
    setCreateGalleryFileList([])

    if (defaultBuildingId) {
      loadFloorsForBuilding(defaultBuildingId).catch((error: Error) =>
        message.error(error.message),
      )
    }

    setIsCreateModalOpen(true)
  }

  function handleCreateBuildingChange(buildingId: string) {
    setCreateBuildingId(buildingId)
    createForm.setFieldValue('floorId', undefined)
    loadFloorsForBuilding(buildingId).catch((error: Error) =>
      message.error(error.message),
    )
  }

  async function handleCreateStore(values: CreateStoreFormValues) {
    const logoFile = createLogoFileList[0]?.originFileObj
    const galleryFiles = createGalleryFileList
      .map((file) => file.originFileObj)
      .filter(isRcFile)

    try {
      const store = await createStore({
        ownerUserId: storeOwnerId,
        buildingId: values.buildingId,
        floorId: values.floorId,
        name: values.name,
        category: values.category,
        description: values.description,
        openingHours: values.openingHours.trim(),
        status: values.isActive ? 'active' : 'inactive',
        logoFile,
        galleryFiles,
      })

      message.success('Tạo gian hàng thành công')
      setIsCreateModalOpen(false)
      createForm.resetFields()
      setCreateLogoFileList([])
      setCreateGalleryFileList([])
      setSelectedBuildingId(store.buildingId)
      setEditingStoreId(store.id)
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  function getBuildingName(buildingId: string) {
    return buildings.find((building) => building.id === buildingId)?.name ?? buildingId
  }

  function getFloorName(buildingId: string, floorId: string) {
    return (
      floorsByBuildingId[buildingId]?.find((floor) => floor.id === floorId)?.name ??
      floorId
    )
  }

  const ownerBuildingIds = Array.from(
    new Set(ownerStores.map((store) => store.buildingId)),
  )
  const storesInSelectedBuilding = selectedBuildingId
    ? ownerStores.filter((store) => store.buildingId === selectedBuildingId)
    : []
  const isEditingCurrentStore = Boolean(
    editingStoreId && currentStore?.id === editingStoreId,
  )
  const createFloorOptions = createBuildingId
    ? (floorsByBuildingId[createBuildingId] ?? [])
    : []

  const visibleStatus: StoreStatus = isActive ? 'active' : 'inactive'
  const canCreateStore = currentUser?.role === 'building_owner' || currentUser?.role === 'building_manager'

  return (
    <main className="workspace">
      <section className="page-heading">
        <div>
          <Text type="secondary">Chủ gian hàng</Text>
          <Title level={1}>Hồ sơ gian hàng</Title>
        </div>
        {isEditingCurrentStore ? (
          <Tag color={statusColor(visibleStatus)}>
            {visibleStatus === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
          </Tag>
        ) : null}
      </section>

      <Spin spinning={isLoading}>
        <Card className="tool-card store-picker-card">
          <div className="store-picker-heading">
            <Text strong>Tòa nhà có gian hàng của bạn</Text>
            {canCreateStore ? <Button type="primary" icon={<PlusOutlined />} onClick={openCreateStoreModal}>Thêm gian hàng</Button> : null}
          </div>
          <div className="owner-building-grid">
            {ownerBuildingIds.length > 0 ? (
              ownerBuildingIds.map((buildingId) => {
                const storeCount = ownerStores.filter(
                  (store) => store.buildingId === buildingId,
                ).length
                const isSelected = selectedBuildingId === buildingId

                return (
                  <button
                    className={
                      isSelected
                        ? 'owner-building-card owner-building-card-active'
                        : 'owner-building-card'
                    }
                    key={buildingId}
                    type="button"
                    onClick={() => {
                      setSelectedBuildingId(buildingId)
                      setEditingStoreId(undefined)
                    }}
                  >
                    <Text strong>{getBuildingName(buildingId)}</Text>
                    <Text type="secondary">{storeCount} gian hàng</Text>
                  </button>
                )
              })
            ) : (
              <Empty description="Bạn chưa có gian hàng nào" />
            )}
          </div>
        </Card>

        <Card
          title={
            selectedBuildingId
              ? `Gian hàng tại ${getBuildingName(selectedBuildingId)}`
              : 'Danh sách gian hàng'
          }
          className="tool-card store-owner-list-card"
        >
          <Table<Store>
            rowKey="id"
            dataSource={storesInSelectedBuilding}
            pagination={false}
            locale={{ emptyText: 'Không có gian hàng trong tòa nhà này' }}
            columns={[
              {
                title: 'Logo',
                dataIndex: 'logoUrl',
                width: 76,
                render: (logoUrl: Store['logoUrl'], store) => (
                  <Avatar
                    shape="square"
                    size={42}
                    src={logoUrl ?? undefined}
                    icon={logoUrl ? undefined : <ShopOutlined />}
                  >
                    {store.name.slice(0, 1)}
                  </Avatar>
                ),
              },
              {
                title: 'Tên gian hàng',
                dataIndex: 'name',
                render: (name: string) => <Text strong>{name}</Text>,
              },
              {
                title: 'Tầng',
                dataIndex: 'floorId',
                width: 160,
                render: (floorId: string, store) =>
                  getFloorName(store.buildingId, floorId),
              },
              { title: 'Nhóm dịch vụ', dataIndex: 'category', width: 140 },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                width: 120,
                render: (status: StoreStatus) => (
                  <Tag color={statusColor(status)}>
                    {status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
                  </Tag>
                ),
              },
              {
                title: 'Hành động',
                key: 'actions',
                width: 190,
                render: (_value: unknown, store) => (
                  <Space>
                    <Button size="small" onClick={() => setDetailStore(store)}>
                      Xem chi tiết
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => setEditingStoreId(store.id)}
                    >
                      Chỉnh sửa
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        {isEditingCurrentStore ? (
          <Card className="tool-card store-profile-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              disabled={isSaving}
            >
              <div className="store-profile-grid">
                <div>
                  <Form.Item
                    label="Tên gian hàng"
                    name="name"
                    rules={[{ required: true, message: 'Vui lòng nhập tên gian hàng' }]}
                  >
                    <Input prefix={<ShopOutlined />} placeholder="Lumi Fashion" disabled />
                  </Form.Item>

                  <Form.Item
                    label="Nhóm dịch vụ"
                    name="category"
                    rules={[{ required: true, message: 'Vui lòng chọn nhóm dịch vụ' }]}
                  >
                    <Select
                      disabled
                      options={STORE_CATEGORIES.map((category) => ({
                        label: category,
                        value: category,
                      }))}
                      placeholder="Chọn nhóm dịch vụ"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Mô tả dịch vụ"
                    name="description"
                    rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
                  >
                    <TextArea rows={6} placeholder="Mô tả dịch vụ của gian hàng" />
                  </Form.Item>

                  <Form.Item
                    label="Giờ mở cửa"
                    name="openingHours"
                    extra="Ví dụ: 08:00 - 22:00"
                  >
                    <Input placeholder="08:00 - 22:00" />
                  </Form.Item>

                  <Form.Item
                    label="Trạng thái hoạt động"
                    name="isActive"
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                  </Form.Item>
                </div>

                <div>
                  <Form.Item label="Logo">
                    <Upload
                      accept="image/*"
                      beforeUpload={validateImage}
                      fileList={logoFileList}
                      listType="picture-card"
                      maxCount={1}
                      onChange={({ fileList }) => setLogoFileList(fileList)}
                    >
                      {logoFileList.length >= 1 ? null : (
                        <div className="upload-card-trigger">
                          <UploadOutlined />
                          <span>Logo</span>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>

                  <Form.Item label="Ảnh thực tế gian hàng">
                    <Upload
                      accept="image/*"
                      beforeUpload={validateImage}
                      fileList={galleryFileList}
                      listType="picture-card"
                      maxCount={5}
                      multiple
                      onChange={({ fileList }) =>
                        setGalleryFileList(fileList.slice(0, 5))
                      }
                    >
                      {galleryFileList.length >= 5 ? null : (
                        <div className="upload-card-trigger">
                          <UploadOutlined />
                          <span>Bộ ảnh</span>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>
                </div>
              </div>

              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={isSaving}
                >
                  Lưu thay đổi
                </Button>
              </Space>
            </Form>
          </Card>
        ) : (
          <Card className="tool-card store-edit-empty-card">
            <Empty description="Chọn Chỉnh sửa ở một gian hàng để cập nhật thông tin" />
          </Card>
        )}
      </Spin>

      <Modal
        title={detailStore?.name}
        open={Boolean(detailStore)}
        footer={null}
        onCancel={() => setDetailStore(null)}
      >
        {detailStore ? (
          <Space orientation="vertical" size="middle" className="full-width">
            <Space>
              <Avatar
                shape="square"
                size={56}
                src={detailStore.logoUrl ?? undefined}
                icon={detailStore.logoUrl ? undefined : <ShopOutlined />}
              />
              <Space orientation="vertical" size={2}>
                <Text strong>
                  {getBuildingName(detailStore.buildingId)} —{' '}
                  {getFloorName(detailStore.buildingId, detailStore.floorId)}
                </Text>
                <Space>
                  <Tag color={statusColor(detailStore.status)}>
                    {detailStore.status === 'active'
                      ? 'Đang hoạt động'
                      : 'Tạm ngưng'}
                  </Tag>
                  <Tag>{detailStore.category}</Tag>
                </Space>
              </Space>
            </Space>
            <Text>{detailStore.description}</Text>
            {detailStore.openingHours ? (
              <Text type="secondary">Giờ mở cửa: {detailStore.openingHours}</Text>
            ) : null}
            {detailStore.galleryImageUrls.length > 0 ? (
              <Image.PreviewGroup>
                <div className="store-gallery-grid">
                  {detailStore.galleryImageUrls.map((url) => (
                    <Image key={url} src={url} alt={detailStore.name} />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Empty description="Chưa có ảnh thực tế" />
            )}
          </Space>
        ) : null}
      </Modal>

      <Modal
        title="Thêm gian hàng"
        open={isCreateModalOpen}
        footer={null}
        forceRender
        onCancel={() => {
          setIsCreateModalOpen(false)
          createForm.resetFields()
          setCreateLogoFileList([])
          setCreateGalleryFileList([])
        }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateStore}
          disabled={isSaving}
        >
          <Form.Item
            label="Tòa nhà"
            name="buildingId"
            rules={[{ required: true, message: 'Vui lòng chọn tòa nhà' }]}
          >
            <Select
              placeholder="Chọn tòa nhà"
              options={buildings.map((building) => ({
                label: building.name,
                value: building.id,
              }))}
              onChange={handleCreateBuildingChange}
            />
          </Form.Item>

          <Form.Item
            label="Tầng"
            name="floorId"
            rules={[{ required: true, message: 'Vui lòng chọn tầng' }]}
          >
            <Select
              disabled={!createBuildingId}
              placeholder="Chọn tầng"
              options={createFloorOptions.map((floor) => ({
                label: floor.name,
                value: floor.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Tên gian hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên gian hàng' }]}
          >
            <Input prefix={<ShopOutlined />} placeholder="Tên gian hàng" />
          </Form.Item>

          <Form.Item
            label="Nhóm dịch vụ"
            name="category"
            rules={[{ required: true, message: 'Vui lòng chọn nhóm dịch vụ' }]}
          >
            <Select
              options={STORE_CATEGORIES.map((category) => ({
                label: category,
                value: category,
              }))}
              placeholder="Chọn nhóm dịch vụ"
            />
          </Form.Item>

          <Form.Item
            label="Mô tả dịch vụ"
            name="description"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <TextArea rows={4} placeholder="Mô tả dịch vụ của gian hàng" />
          </Form.Item>

          <Form.Item
            label="Giờ mở cửa"
            name="openingHours"
            extra="Ví dụ: 08:00 - 22:00"
          >
            <Input placeholder="08:00 - 22:00" />
          </Form.Item>

          <Form.Item
            label="Trạng thái hoạt động"
            name="isActive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>

          <div className="store-create-upload-grid">
            <Form.Item label="Logo">
              <Upload
                accept="image/*"
                beforeUpload={validateImage}
                fileList={createLogoFileList}
                listType="picture-card"
                maxCount={1}
                onChange={({ fileList }) => setCreateLogoFileList(fileList)}
              >
                {createLogoFileList.length >= 1 ? null : (
                  <div className="upload-card-trigger">
                    <UploadOutlined />
                    <span>Logo</span>
                  </div>
                )}
              </Upload>
            </Form.Item>

            <Form.Item label="Ảnh thực tế gian hàng">
              <Upload
                accept="image/*"
                beforeUpload={validateImage}
                fileList={createGalleryFileList}
                listType="picture-card"
                maxCount={5}
                multiple
                onChange={({ fileList }) =>
                  setCreateGalleryFileList(fileList.slice(0, 5))
                }
              >
                {createGalleryFileList.length >= 5 ? null : (
                  <div className="upload-card-trigger">
                    <UploadOutlined />
                    <span>Bộ ảnh</span>
                  </div>
                )}
              </Upload>
            </Form.Item>
          </div>

          <Space>
            <Button
              onClick={() => {
                setIsCreateModalOpen(false)
                createForm.resetFields()
                setCreateLogoFileList([])
                setCreateGalleryFileList([])
              }}
            >
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={isSaving}>
              Tạo gian hàng
            </Button>
          </Space>
        </Form>
      </Modal>
    </main>
  )
}
