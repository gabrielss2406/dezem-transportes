import React, { forwardRef } from 'react'
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

// ── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  optional?: boolean
  error?: string
  options: { value: string | number; label: string }[]
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, optional, error, options, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            {label}{' '}
            {optional && <span className="text-outline font-normal normal-case">(opcional)</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${error ? 'border-error' : ''} ${className}`}
          {...props}
        >
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    )
  },
)

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
