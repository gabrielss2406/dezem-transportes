import React, { forwardRef, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import InputMask from 'react-input-mask'

// ── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-bold rounded transition-all focus:outline-none disabled:opacity-50 active:scale-95'
  const variants = {
    primary: 'bg-primary text-on-primary hover:brightness-110 shadow-lg shadow-primary/20',
    ghost:
      'border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary/60 bg-transparent',
    danger: 'bg-error-container text-on-error-container hover:brightness-110',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-6 py-2.5 text-sm' }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  optional?: boolean
  error?: string
  mask?: string
  maskChar?: string | null
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, optional, error, mask, maskChar, className = '', ...props }, ref) => {
    const InputComponent = mask ? (InputMask as any) : 'input'
    const maskProps = mask ? { mask, maskChar, inputRef: ref } : { ref }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {label}{' '}
            {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
          </label>
        )}
        <InputComponent
          {...maskProps}
          className={`bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${error ? 'border-error' : ''} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    )
  },
)

// ── DatePicker ───────────────────────────────────────────────────────────────
interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  optional?: boolean
  error?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, optional, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {label}{' '}
            {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
          </label>
        )}
        <div className="relative group">
          <input
            type="date"
            ref={ref}
            className={`w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none ${error ? 'border-error' : ''} ${className}`}
            {...props}
          />
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none group-hover:text-primary transition-colors text-lg">
            calendar_today
          </span>
        </div>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    )
  },
)

// ── CurrencyInput ────────────────────────────────────────────────────────────
interface CurrencyInputProps {
  label?: string
  optional?: boolean
  error?: string
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  className?: string
}

export function CurrencyInput({
  label,
  optional,
  error,
  value,
  onChange,
  placeholder = '0,00',
  className = '',
}: CurrencyInputProps) {
  const format = (val: number | string) => {
    const n = typeof val === 'number' ? val : Number(val) || 0
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const cents = Number(digits) / 100
    onChange(cents)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}{' '}
          {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
        </label>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-sm font-bold">
          R$
        </span>
        <input
          type="text"
          value={format(value)}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-10 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${error ? 'border-error' : ''} ${className}`}
        />
      </div>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────────────────
interface SelectProps {
  label?: string
  optional?: boolean
  error?: string
  options: { value: string | number; label: string }[]
  value?: string | number
  onChange?: (value: any) => void
  placeholder?: string
  className?: string
  icon?: string
}

export function Select({
  label,
  optional,
  error,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  icon,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const uniqueId = useRef(Math.random())

  useEffect(() => {
    const handleClose = (e: CustomEvent) => {
      if (e.detail.id !== uniqueId.current) {
        setIsOpen(false)
      }
    }
    document.addEventListener('close-other-selects', handleClose as EventListener)
    return () => {
      document.removeEventListener('close-other-selects', handleClose as EventListener)
    }
  }, [])

  const selectedOption = options.find((o) => String(o.value) === String(value))

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords, true)
    }
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}{' '}
          {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          const newIsOpen = !isOpen
          setIsOpen(newIsOpen)
          if (newIsOpen) {
            document.dispatchEvent(
              new CustomEvent('close-other-selects', { detail: { id: uniqueId.current } }),
            )
          }
        }}
        className={`flex items-center justify-between bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface text-left focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${error ? 'border-error' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && (
            <span className="material-symbols-outlined text-on-surface-variant/60 text-lg">
              {icon}
            </span>
          )}
          <span className={`truncate ${!selectedOption ? 'text-on-surface-variant/40' : ''}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <span
          className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {isOpen &&
        createPortal(
          <button
            className="fixed z-[9999] bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: coords.top + 4,
              left: coords.left,
              width: coords.width,
            }}
          >
            <div className="max-h-60 overflow-y-auto py-2">
              {optional && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange?.('')
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 text-on-surface-variant italic"
                >
                  Nenhum
                </button>
              )}
              {options.length === 0 ? (
                <div className="px-4 py-3 text-xs text-on-surface-variant italic">
                  Nenhuma opção disponível
                </div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onChange?.(option.value)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-primary/10 ${
                      String(value) === String(option.value)
                        ? 'bg-primary/20 text-primary font-bold'
                        : 'text-on-surface'
                    }`}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </button>,
          document.body,
        )}

      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string
  color?: 'green' | 'amber' | 'red' | 'blue' | 'gray'
}
export function Badge({ label, color = 'gray' }: BadgeProps) {
  const colors = {
    green: 'bg-tertiary-container/30 text-tertiary',
    amber: 'bg-secondary-container text-on-secondary-container',
    red: 'bg-error-container/30 text-error',
    blue: 'bg-tertiary-container/20 text-tertiary',
    gray: 'bg-surface-container-highest text-on-surface-variant',
  }
  return (
    <span
      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded ${colors[color]}`}
    >
      {label}
    </span>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`bg-surface-container rounded-xl border border-outline-variant/10 p-6 ${className}`}
    >
      {children}
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}
export function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl p-6 flex flex-col gap-2 ${
        accent
          ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary'
          : 'bg-surface-container border border-outline-variant/10'
      }`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${accent ? 'text-on-primary/70' : 'text-on-surface-variant'}`}
      >
        {label}
      </span>
      <span
        className={`text-2xl font-black font-headline ${accent ? 'text-on-primary' : 'text-on-surface'}`}
      >
        {value}
      </span>
      {sub && (
        <span className={`text-xs ${accent ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
          {sub}
        </span>
      )}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}
export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <h2 className="font-headline font-bold text-on-surface text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface text-2xl font-light leading-none transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────
interface TableProps {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[]
  data: any[]
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
}
export function Table({ columns, data, onEdit, onDelete }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl bg-surface-container overflow-hidden border border-outline-variant/10">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-high">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
              >
                {c.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-12 text-on-surface-variant text-sm"
              >
                Nenhum registro encontrado
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={`hover:bg-surface-bright/10 transition-colors group ${i % 2 === 1 ? 'bg-surface-container-lowest/30' : ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className="px-6 py-4 text-sm text-on-surface">
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-6 py-4">
                  <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps {
  message: string
  type: 'success' | 'error'
}
export function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 ${
        type === 'success'
          ? 'bg-surface-container-high text-tertiary border border-tertiary/20'
          : 'bg-error-container/20 text-error border border-error/20'
      }`}
    >
      <span className="material-symbols-outlined text-sm">
        {type === 'success' ? 'check_circle' : 'error'}
      </span>
      {message}
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(
    null,
  )
  const show = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}
