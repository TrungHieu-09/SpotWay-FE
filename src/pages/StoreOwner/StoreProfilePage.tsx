import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
} from 'antd'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import { SaveOutlined, ShopOutlined, UploadOutlined } from '@ant-design/icons'
import { getFloors } from '../../api/floors'
import { useBuildingStore } from '../../store/useBuildingStore'
import { useStoreStore } from '../../store/useStoreStore'
import type { Floor } from '../../types/floor'
import type { StoreStatus } from '../../types/store'

const { Text, Title } = Typography
const { TextArea } = Input

// POC only: replace this owner id with the authenticated Store Owner id later.
const STORE_OWNER_ID = 'owner-1'
const STORE_CATEGORIES = ['Thời trang', 'Ăn uống', 'Dịch vụ']

type StoreProfileFormValues = {
  name: string
  category: string
  description: string
  isActive: boolean
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

export function StoreProfilePage() {
  const [form] = Form.useForm<StoreProfileFormValues>()
  const [selectedStoreId, setSelectedStoreId] = useState<string>()
  const [floorsByBuildingId, setFloorsByBuildingId] = useState<
    Record<string, Floor[]>
  >({})
  const [hasLoadedOwnerStores, setHasLoadedOwnerStores] = useState(false)
  const [logoFileList, setLogoFileList] = useState<UploadFile[]>([])
  const [galleryFileList, setGalleryFileList] = useState<UploadFile[]>([])
  const buildings = useBuildingStore((state) => state.buildings)
  const loadBuildings = useBuildingStore((state) => state.loadBuildings)
  const ownerStores = useStoreStore((state) => state.ownerStores)
  const currentStore = useStoreStore((state) => state.currentStore)
  const isLoading = useStoreStore((state) => state.isLoading)
  const isSaving = useStoreStore((state) => state.isSaving)
  const loadStoresByOwner = useStoreStore((state) => state.loadStoresByOwner)
  const loadCurrentStore = useStoreStore((state) => state.loadCurrentStore)
  const updateStore = useStoreStore((state) => state.updateStore)
  const isActive = Form.useWatch('isActive', form)
  const { message } = AntApp.useApp()

  useEffect(() => {
    loadBuildings().catch((error: Error) => message.error(error.message))
    loadStoresByOwner(STORE_OWNER_ID)
      .catch((error: Error) => message.error(error.message))
      .finally(() => setHasLoadedOwnerStores(true))
  }, [loadBuildings, loadStoresByOwner, message])

  useEffect(() => {
    if (ownerStores.length === 0) {
      setSelectedStoreId(undefined)
      return
    }

    if (!selectedStoreId || !ownerStores.some((store) => store.id === selectedStoreId)) {
      setSelectedStoreId(ownerStores[0].id)
    }
  }, [ownerStores, selectedStoreId])

  useEffect(() => {
    if (!selectedStoreId) {
      return
    }

    loadCurrentStore(selectedStoreId).catch((error: Error) =>
      message.error(error.message),
    )
  }, [loadCurrentStore, message, selectedStoreId])

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
        name: values.name,
        category: values.category,
        description: values.description,
        status: values.isActive ? 'active' : 'inactive',
        logoUrl: retainedLogoUrl,
        logoFile,
        galleryImageUrls: retainedGalleryUrls,
        galleryFiles,
      })
      message.success('Lưu thông tin gian hàng thành công')
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

  if (hasLoadedOwnerStores && ownerStores.length === 0 && !isLoading) {
    return (
      <main className="workspace">
        <Card className="tool-card">
          <Empty description="Bạn chưa có gian hàng nào" />
        </Card>
      </main>
    )
  }

  const visibleStatus: StoreStatus = isActive ? 'active' : 'inactive'

  return (
    <main className="workspace">
      <section className="page-heading">
        <div>
          <Text type="secondary">Store Owner</Text>
          <Title level={1}>Hồ sơ gian hàng</Title>
        </div>
        {currentStore ? (
          <Tag color={statusColor(visibleStatus)}>{visibleStatus}</Tag>
        ) : null}
      </section>

      <Spin spinning={isLoading}>
        <Card className="tool-card store-picker-card">
          <Text strong>Chọn gian hàng</Text>
          <Select
            className="store-picker-select"
            value={selectedStoreId}
            onChange={setSelectedStoreId}
            options={ownerStores.map((store) => ({
              value: store.id,
              label: `${store.name} — ${getBuildingName(store.buildingId)}, ${getFloorName(
                store.buildingId,
                store.floorId,
              )}`,
            }))}
            placeholder="Chọn gian hàng để cập nhật"
          />
        </Card>

        {currentStore ? (
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
                  label="Tên store"
                  name="name"
                  rules={[{ required: true, message: 'Vui lòng nhập tên store' }]}
                >
                  <Input prefix={<ShopOutlined />} placeholder="Lumi Fashion" />
                </Form.Item>

                <Form.Item
                  label="Category"
                  name="category"
                  rules={[{ required: true, message: 'Vui lòng chọn category' }]}
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
                  <TextArea rows={6} placeholder="Mô tả dịch vụ của gian hàng" />
                </Form.Item>

                <Form.Item
                  label="Trạng thái hoạt động"
                  name="isActive"
                  valuePropName="checked"
                >
                  <Switch checkedChildren="active" unCheckedChildren="inactive" />
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
                        <span>Gallery</span>
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
        ) : null}
      </Spin>
    </main>
  )
}
