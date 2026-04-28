import { Button } from './ui'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, actionLabel, onAction, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2a1f14]">{title}</h1>
        {subtitle && <p className="text-[#9e8c75] text-sm capitalize">{subtitle}</p>}
      </div>
      <div className="flex gap-3">
        {children}
        {actionLabel && onAction && (
          <Button onClick={onAction}>+ {actionLabel}</Button>
        )}
      </div>
    </div>
  )
}
