import React from 'react'

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
    'inline-flex items-center justify-center font-semibold rounded transition-colors focus:outline-none disabled:opacity-50'
  const variants = {
    primary: 'bg-[#7B5B2E] text-white hover:bg-[#5e4320] active:bg-[#4a3419]',
    ghost:
      'border border-[#7B5B2E] text-[#7B5B2E] bg-transparent hover:bg-[#7B5B2E] hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm' }
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
}
export function Input({ label, optional, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-[#4a3419]">
          {label}{' '}
          {optional && <span className="text-[#9e8c75] font-normal normal-case">(opcional)</span>}
        </label>
      )}
      <input
        className={`border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#7B5B2E] transition-colors ${error ? 'border-red-500' : 'border-[#d5c9bb]'} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  optional?: boolean
  options: { value: string | number; label: string }[]
}
export function Select({ label, optional, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wide text-[#4a3419]">
          {label}{' '}
          {optional && <span className="text-[#9e8c75] font-normal normal-case">(opcional)</span>}
        </label>
      )}
      <select
        className={`border border-[#d5c9bb] rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#7B5B2E] transition-colors ${className}`}
        {...props}
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[color]}`}>{label}</span>
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
    <div className={`bg-white rounded-xl border border-[#e8dfd4] shadow-sm p-5 ${className}`}>
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
      className={`rounded-xl p-5 flex flex-col gap-1 ${accent ? 'bg-[#7B5B2E] text-white' : 'bg-white border border-[#e8dfd4]'}`}
    >
      <span
        className={`text-xs font-semibold uppercase tracking-widest ${accent ? 'text-[#d4b896]' : 'text-[#9e8c75]'}`}
      >
        {label}
      </span>
      <span className="text-2xl font-bold">{value}</span>
      {sub && (
        <span className={`text-xs ${accent ? 'text-[#d4b896]' : 'text-[#9e8c75]'}`}>{sub}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#f5f0ea] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8dfd4]">
          <h2 className="font-bold text-[#2a1f14] text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#9e8c75] hover:text-[#4a3419] text-xl font-bold"
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
    <div className="overflow-x-auto rounded-xl border border-[#e8dfd4] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e8dfd4] bg-[#f5f0ea]">
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9e8c75]"
              >
                {c.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#9e8c75]">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-8 text-[#9e8c75]">
                Nenhum registro encontrado
              </td>
            </tr>
          )}
          {data.map((row, i) => (
            <tr
              key={row.id ?? i}
              className="border-b border-[#f0e9e0] hover:bg-[#faf7f3] transition-colors"
            >
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-[#2a1f14]">
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="text-[#7B5B2E] hover:text-[#4a3419]"
                        title="Editar"
                      >
                        ✏️
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="text-red-400 hover:text-red-600"
                        title="Excluir"
                      >
                        🗑️
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

// ── Toast (simple) ───────────────────────────────────────────────────────────
interface ToastProps {
  message: string
  type: 'success' | 'error'
}
export function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
    >
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
