import { Breadcrumb, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  breadcrumb?: Array<{ title: string }>
}

export function PageHeader({ eyebrow, title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumb ? <Breadcrumb items={breadcrumb} /> : null}
      <div className="page-header-row">
        <div>
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <Typography.Title level={1}>{title}</Typography.Title>
          {description ? <Typography.Paragraph>{description}</Typography.Paragraph> : null}
        </div>
        {actions ? <Space wrap>{actions}</Space> : null}
      </div>
    </header>
  )
}
