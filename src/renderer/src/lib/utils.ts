import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) {
    return ''
  }
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Formats a SQLite datetime ('YYYY-MM-DD HH:MM:SS', stored in local time) as
 * 'DD/MM/YYYY HH:MM'. Falls back to the date alone when there is no time part.
 */
export function formatDateTime(value?: string | null): string {
  if (!value) {
    return ''
  }
  const [datePart, timePart] = value.split(' ')
  const date = formatDate(datePart)
  return timePart ? `${date} ${timePart.slice(0, 5)}` : date
}

export function currentMonthKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Full-month date range (first day through last day, inclusive) for a 'YYYY-MM' key. */
export function monthRangeFromKey(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function fortnightRangeFromKey(
  monthKey: string,
  fortnight: 1 | 2,
): { start: string; end: string } {
  const { end: monthEnd } = monthRangeFromKey(monthKey)
  return fortnight === 1
    ? { start: `${monthKey}-01`, end: `${monthKey}-15` }
    : { start: `${monthKey}-16`, end: monthEnd }
}

export function currentMonthRange(): { start: string; end: string } {
  return monthRangeFromKey(currentMonthKey())
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES_PT[m - 1]} ${y}`
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
