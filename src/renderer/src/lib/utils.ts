export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function currentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${lastDay}`,
  }
}

export function currentMonthKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export const COST_CATEGORIES = [
  { value: 'fuel', label: 'Combustível' },
  { value: 'oil', label: 'Óleo' },
  { value: 'maintenance', label: 'Manutenção' },
  { value: 'salary', label: 'Salário' },
  { value: 'toll', label: 'Pedágio' },
  { value: 'others', label: 'Outros' },
]
