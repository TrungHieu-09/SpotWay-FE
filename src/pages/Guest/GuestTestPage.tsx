import { useEffect, useMemo, useState } from 'react'
import { Alert, App as AntApp, Button, Card, Empty, Input, Progress, Segmented, Space, Tabs, Tag, Typography } from 'antd'
import { CopyOutlined, DownloadOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { Link, useParams } from 'react-router-dom'
import {
  GUEST_GROUP_LABEL,
  GUEST_TEST_CASES,
  buildTestReport,
  guestCaseUrl,
  summarizeResults,
  type GuestTestCase,
  type GuestTestGroup,
  type GuestTestResult,
} from '../../utils/guestTestCases'

const { Text, Paragraph } = Typography

type Saved = { results: Record<string, GuestTestResult | undefined>; notes: Record<string, string | undefined>; qrToken: string }

function readSaved(key: string): Saved {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw) return { results: {}, notes: {}, qrToken: '', ...(JSON.parse(raw) as Partial<Saved>) }
  } catch {
    // localStorage không dùng được: bắt đầu trống.
  }
  return { results: {}, notes: {}, qrToken: '' }
}

/** Bảng kiểm thử luồng Guest: mỗi case có nút chạy, kết quả mong đợi, đánh dấu đạt/không đạt và xuất biên bản. */
export function GuestTestPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const storageKey = `spotway.guestTest.${buildingId ?? 'none'}`
  const [saved, setSaved] = useState<Saved>(() => readSaved(storageKey))
  const { message } = AntApp.useApp()

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(saved))
    } catch {
      // bỏ qua
    }
  }, [saved, storageKey])

  const summary = useMemo(() => summarizeResults(saved.results), [saved.results])

  if (!buildingId) return <Empty description="Thiếu mã toà nhà" />
  const id = buildingId

  function setResult(caseId: string, result: GuestTestResult | undefined) {
    setSaved((current) => ({ ...current, results: { ...current.results, [caseId]: result } }))
  }

  function report() {
    return buildTestReport(id, saved.results, saved.notes)
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report())
      message.success('Đã sao chép biên bản (Markdown).')
    } catch {
      message.error('Không sao chép được; hãy dùng nút tải về.')
    }
  }

  function downloadReport() {
    const blob = new Blob([report()], { type: 'text/markdown;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `bien-ban-guest-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  function renderCase(testCase: GuestTestCase) {
    const url = guestCaseUrl(testCase, id, saved.qrToken || undefined)
    const result = saved.results[testCase.id]
    return (
      <Card key={testCase.id} size="small" style={{ marginBottom: 12 }}>
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
          <Space wrap>
            <Tag color={testCase.group === 'fire' ? 'red' : testCase.group === 'qr' ? 'purple' : testCase.group === 'other' ? 'default' : 'green'}>{testCase.id}</Tag>
            <Text strong>{testCase.title}</Text>
            {result === 'pass' && <Tag color="success">Đạt</Tag>}
            {result === 'fail' && <Tag color="error">Không đạt</Tag>}
            {result === 'skip' && <Tag>Bỏ qua</Tag>}
          </Space>
          <Paragraph style={{ margin: 0 }}><Text type="secondary">Làm: </Text>{testCase.steps}</Paragraph>
          <Paragraph style={{ margin: 0 }}><Text type="secondary">Mong đợi: </Text>{testCase.expected}</Paragraph>
          <Space wrap>
            {url ? (
              <Link to={url} target="_blank" rel="noreferrer">
                <Button type="primary" icon={<PlayCircleOutlined />}>{testCase.scenario ? 'Chạy' : 'Mở'}</Button>
              </Link>
            ) : (
              <Button disabled>Cần dán token QR</Button>
            )}
            <Segmented
              value={result}
              onChange={(value) => setResult(testCase.id, value as GuestTestResult)}
              options={[
                { value: 'pass', label: 'Đạt' },
                { value: 'fail', label: 'Không đạt' },
                { value: 'skip', label: 'Bỏ qua' },
              ]}
            />
            {result && <Button size="small" type="text" onClick={() => setResult(testCase.id, undefined)}>Xoá kết quả</Button>}
          </Space>
          <Input
            size="small"
            placeholder="Ghi chú (hiện trong biên bản)"
            value={saved.notes[testCase.id] ?? ''}
            onChange={(event) => setSaved((current) => ({ ...current, notes: { ...current.notes, [testCase.id]: event.target.value } }))}
          />
        </Space>
      </Card>
    )
  }

  const groups = Object.keys(GUEST_GROUP_LABEL) as GuestTestGroup[]
  const done = summary.all - summary.pending

  return (
    <main className="navigation-page" style={{ maxWidth: 900 }}>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>Bảng kiểm thử luồng Guest</Typography.Title>
          <Text type="secondary">Toà nhà: {id}</Text>
        </div>

        <Alert
          type="info"
          showIcon
          message="Chuẩn bị"
          description="Toà nhà cần có tầng đã xuất bản và graph đã vẽ. Các case H/F dùng thanh kịch bản demo, tự chạy khi bấm Chạy. Case QR cần mã tạo ở Manager (chọn node → Tạo mã QR)."
        />

        <Card size="small">
          <Space orientation="vertical" style={{ width: '100%' }} size={8}>
            <Progress percent={Math.round((done / summary.all) * 100)} format={() => `${done}/${summary.all}`} />
            <Space wrap>
              <Tag color="success">{summary.pass} đạt</Tag>
              <Tag color="error">{summary.fail} không đạt</Tag>
              <Tag>{summary.skip} bỏ qua</Tag>
              <Tag color="processing">{summary.pending} chưa kiểm thử</Tag>
              <Button icon={<CopyOutlined />} onClick={() => void copyReport()}>Sao chép biên bản</Button>
              <Button icon={<DownloadOutlined />} onClick={downloadReport}>Tải biên bản (.md)</Button>
              <Button danger onClick={() => setSaved((current) => ({ ...current, results: {}, notes: {} }))}>Làm lại từ đầu</Button>
            </Space>
            <Input
              placeholder="Dán token QR (cho case Q1)"
              value={saved.qrToken}
              onChange={(event) => setSaved((current) => ({ ...current, qrToken: event.target.value.trim() }))}
            />
          </Space>
        </Card>

        <Tabs
          items={groups.map((group) => ({
            key: group,
            label: `${GUEST_GROUP_LABEL[group]} (${GUEST_TEST_CASES.filter((item) => item.group === group).length})`,
            children: GUEST_TEST_CASES.filter((item) => item.group === group).map(renderCase),
          }))}
        />
      </Space>
    </main>
  )
}
