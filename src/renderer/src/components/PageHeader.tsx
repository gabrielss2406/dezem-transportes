import type React from 'react'
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
    <div className="flex items-end justify-between mb-10">
      <div>
        <span className="text-primary font-bold tracking-widest text-xs uppercase block mb-2">
          Dezem Transportes
        </span>
        <h1 className="text-4xl font-black font-headline tracking-tighter text-on-surface">
          {title}
        </h1>
        {subtitle && (
          <p className="text-on-surface-variant text-base mt-1 capitalize">{subtitle}</p>
        )}
      </div>
      <div className="flex gap-3 items-center">
        {children}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
