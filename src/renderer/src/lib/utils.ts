export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function currentMonthRange(): { inicio: string; fim: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    inicio: `${y}-${m}-01`,
    fim: `${y}-${m}-${lastDay}`
  }
}

export function currentMonthKey(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export const CATEGORIAS_CUSTO = [
  { value: 'combustivel', label: 'Combustível' },
  { value: 'oleo', label: 'Óleo' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'salario', label: 'Salário' },
  { value: 'pedagio', label: 'Pedágio' },
  { value: 'outros', label: 'Outros' }
]

export const TIPOS_FORNECEDOR = [
  { value: 'posto', label: 'Posto' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'pedreira', label: 'Pedreira' },
  { value: 'outro', label: 'Outro' }
]
