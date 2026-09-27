import type Database from 'better-sqlite3'

export interface OilMeasures {
  amount: number
  liters: number
  price_per_liter: number
}

export function calculateOilMeasures(input: {
  amount?: number | null
  liters?: number | null
  price_per_liter?: number | null
}): OilMeasures | { error: string } {
  const amount = input.amount ?? null
  const liters = input.liters ?? null
  const price = input.price_per_liter ?? null
  const supplied = [amount, liters, price].filter(
    (value) => value != null && Number.isFinite(value) && value > 0,
  )
  if (supplied.length < 2) {
    return { error: 'Informe pelo menos duas medidas: valor, litros ou preço por litro.' }
  }
  if (amount == null && liters != null && price != null) {
    return { amount: liters * price, liters, price_per_liter: price }
  }
  if (liters == null && amount != null && price != null) {
    return { amount, liters: amount / price, price_per_liter: price }
  }
  if (price == null && amount != null && liters != null) {
    return { amount, liters, price_per_liter: amount / liters }
  }
  if (amount != null && liters != null && price != null) {
    return { amount, liters, price_per_liter: price }
  }
  return { error: 'As medidas informadas devem ser positivas.' }
}

export function ensureSupplierCustomer(
  database: Database.Database,
  supplierId: number,
  customerId?: number,
) {
  const supplier = database
    .prepare('SELECT customer_id FROM suppliers WHERE id = ?')
    .get(supplierId) as { customer_id: number | null } | undefined
  if (!supplier) {
    return { error: 'Fornecedor não encontrado.' }
  }
  if (!supplier.customer_id) {
    return { error: 'Vincule o fornecedor a um cliente antes de usar crédito.' }
  }
  if (customerId && supplier.customer_id !== customerId) {
    return { error: 'Fornecedor não está vinculado ao cliente selecionado.' }
  }
  return { customer_id: supplier.customer_id }
}

export function getOilAccount(database: Database.Database, customerId: number, supplierId: number) {
  return database
    .prepare('SELECT * FROM oil_credit_accounts WHERE customer_id = ? AND supplier_id = ?')
    .get(customerId, supplierId) as any
}

export function getOilBalance(database: Database.Database, accountId: number) {
  return database
    .prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN movement_type IN ('credit','adjustment') THEN amount ELSE -amount END), 0) AS amount,
      COALESCE(SUM(CASE WHEN movement_type IN ('credit','adjustment') THEN liters ELSE -liters END), 0) AS liters
    FROM oil_credit_movements WHERE account_id = ?
  `)
    .get(accountId) as { amount: number; liters: number }
}

export function dateIsPast(date?: string | null) {
  return !!date && date < new Date().toISOString().slice(0, 10)
}
