import { useEffect, useState } from 'react'
import { App as AntApp, Button, Form, InputNumber, Modal, Select, Spin } from 'antd'
import {
  CreditCardOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  CheckOutlined,
  DollarOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import {
  getTenantInvoices,
  getTenantOverview,
  getTenantPlans,
  renewTenantSubscription,
} from '../../api/tenant'
import type { Invoice, Plan, TenantOverview } from '../../types/auth'
import { GlassCard } from '../../components/ui'
import './OwnerSubscriptionPage.css'

export function OwnerSubscriptionPage() {
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<{ planId: string; months: number }>()
  const { message } = AntApp.useApp()

  async function reload() {
    try {
      const [nextOverview, nextInvoices, nextPlans] = await Promise.all([
        getTenantOverview(),
        getTenantInvoices(),
        getTenantPlans(),
      ])
      setOverview(nextOverview)
      setInvoices(nextInvoices)
      setPlans(nextPlans)
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  useEffect(() => {
    reload()
  }, [])

  async function submit(values: { planId: string; months: number }) {
    setSubmitting(true)
    try {
      await renewTenantSubscription(values.planId, values.months)
      message.success('✅ Đã gia hạn gói dịch vụ thành công!')
      setOpen(false)
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amountVnd, 0)

  return (
    <main className="workspace subp-workspace">
      {/* ── Header ── */}
      <section className="subp-header">
        <div>
          <span className="subp-header__eyebrow">Building Owner</span>
          <h1 className="subp-header__title">Gói dịch vụ</h1>
          <p className="subp-header__sub">
            Quản lý gói đăng ký, gia hạn và lịch sử thanh toán.
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={() => setOpen(true)}
        >
          Gia hạn / Nâng cấp
        </Button>
      </section>

      {!overview ? (
        <div className="subp-loading">
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* ── Current plan card ── */}
          <div className="subp-top-row">
            <GlassCard className="subp-current-plan" accent>
              <div className="subp-plan-badge">
                <ThunderboltOutlined />
                <span>{overview.plan.name}</span>
              </div>
              <p className="subp-plan-expire">
                <CalendarOutlined />
                Hết hạn:{' '}
                <strong>
                  {new Intl.DateTimeFormat('vi-VN').format(
                    new Date(overview.tenant.planExpiresAt),
                  )}
                </strong>
              </p>

              <div className="subp-plan-limits">
                <LimitItem label="Tòa nhà" used={overview.usage.buildings} max={overview.plan.maxBuildings} />
                <LimitItem label="Quản lý" used={overview.usage.managers} max={overview.plan.maxManagers} />
                <LimitItem label="Chủ gian hàng" used={overview.usage.storeOwners} max={overview.plan.maxStoreOwners} />
              </div>

              <button className="subp-upgrade-btn" onClick={() => setOpen(true)}>
                <ThunderboltOutlined /> Nâng cấp gói
              </button>
            </GlassCard>

            {/* Stats */}
            <div className="subp-stats">
              <div className="subp-stat subp-stat--violet">
                <DollarOutlined className="subp-stat__icon" />
                <div>
                  <div className="subp-stat__value">
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="subp-stat__label">Tổng đã thanh toán</div>
                </div>
              </div>
              <div className="subp-stat subp-stat--cyan">
                <HistoryOutlined className="subp-stat__icon" />
                <div>
                  <div className="subp-stat__value">{invoices.length}</div>
                  <div className="subp-stat__label">Số hóa đơn</div>
                </div>
              </div>
              <div className="subp-stat subp-stat--fuchsia">
                <CalendarOutlined className="subp-stat__icon" />
                <div>
                  <div className="subp-stat__value">
                    {invoices.reduce((sum, inv) => sum + inv.months, 0)}
                  </div>
                  <div className="subp-stat__label">Tổng tháng đã gia hạn</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Invoice history ── */}
          <GlassCard title={`Lịch sử hóa đơn (${invoices.length})`}>
            {invoices.length === 0 ? (
              <div className="subp-empty">
                <CreditCardOutlined className="subp-empty__icon" />
                <p>Chưa có hóa đơn nào</p>
              </div>
            ) : (
              <div className="subp-invoice-table">
                <div className="subp-invoice-table__head">
                  <span>Ngày thanh toán</span>
                  <span>Gói dịch vụ</span>
                  <span>Số tháng</span>
                  <span>Số tiền</span>
                  <span>Trạng thái</span>
                </div>
                {invoices.map((inv, idx) => (
                  <div key={inv.id} className="subp-invoice-row" style={{ animationDelay: `${idx * 0.04}s` }}>
                    <span className="subp-invoice-row__date">
                      {new Intl.DateTimeFormat('vi-VN').format(new Date(inv.paidAt))}
                    </span>
                    <span className="subp-invoice-row__plan">
                      {plans.find((p) => p.id === inv.planId)?.name ?? inv.planId}
                    </span>
                    <span className="subp-invoice-row__months">{inv.months} tháng</span>
                    <span className="subp-invoice-row__amount">
                      {inv.amountVnd.toLocaleString('vi-VN')} đ
                    </span>
                    <div className="subp-paid-badge">
                      <CheckOutlined /> Đã thanh toán
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* ── Renewal modal ── */}
      <Modal
        title={
          <span className="subp-modal__title">
            <ThunderboltOutlined /> Gia hạn / Nâng cấp gói
          </span>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Xác nhận thanh toán"
        cancelText="Hủy"
        confirmLoading={submitting}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={submit} className="subp-form">
          <Form.Item
            name="planId"
            label="Gói dịch vụ"
            rules={[{ required: true, message: 'Chọn gói dịch vụ' }]}
          >
            <Select
              placeholder="Chọn gói..."
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ${p.priceVnd.toLocaleString('vi-VN')} đ/tháng`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="months"
            label="Số tháng gia hạn"
            initialValue={12}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={36} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  )
}

function LimitItem({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(max, 1)) * 100))
  return (
    <div className="subp-limit">
      <div className="subp-limit__header">
        <span>{label}</span>
        <span className="subp-limit__count">{used}/{max}</span>
      </div>
      <div className="subp-limit__track">
        <div className="subp-limit__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
