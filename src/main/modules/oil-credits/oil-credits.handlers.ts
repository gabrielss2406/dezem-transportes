import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import { allocateOilCredit } from '../../../shared/oilCredits'
import { oilCreditEntrySchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function getAvailableOilCreditLots(
  database: Database.Database,
  customerId: number,
): Array<{ id: number; available: number; expiresAt: string }> {
  return database
    .prepare(
      `SELECT e.id, e.expires_at,
        ROUND(e.amount - COALESCE(SUM(a.amount), 0), 2) AS available
       FROM oil_credit_entries e
       LEFT JOIN oil_credit_usage_allocations a ON a.entry_id = e.id
       WHERE e.customer_id = ?
       GROUP BY e.id
       HAVING available > 0
       ORDER BY e.expires_at ASC, e.issued_date ASC, e.id ASC`,
    )
    .all(customerId)
    .map((row: any) => ({
      id: row.id,
      available: Number(row.available),
      expiresAt: row.expires_at,
    }))
}

export function consumeOilCredits(
  database: Database.Database,
  input: {
    customerId: number
    fuelRecordId: number
    usageDate: string
    grossAmount: number
    voucherNumber: string
    allowExpired: boolean
  },
): { usageId: number; creditAmount: number; paidAmount: number } {
  const lots = getAvailableOilCreditLots(database, input.customerId)
  const allocation = allocateOilCredit(lots, input.grossAmount, input.usageDate, input.allowExpired)
  const creditAmount = roundMoney(allocation.creditAmount)
  const paidAmount = roundMoney(input.grossAmount - creditAmount)
  const usage = database
    .prepare(
      `INSERT INTO oil_credit_usages
        (customer_id, fuel_record_id, voucher_number, usage_date, gross_amount, credit_amount, paid_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.customerId,
      input.fuelRecordId,
      input.voucherNumber,
      input.usageDate,
      roundMoney(input.grossAmount),
      creditAmount,
      paidAmount,
    )
  const usageId = Number(usage.lastInsertRowid)
  const insertAllocation = database.prepare(
    'INSERT INTO oil_credit_usage_allocations (usage_id, entry_id, amount) VALUES (?, ?, ?)',
  )
  for (const item of allocation.allocations) {
    insertAllocation.run(usageId, item.entryId, roundMoney(item.amount))
  }
  database
    .prepare(
      'UPDATE fuel_records SET credit_usage_id = ?, credit_value = ?, value = ? WHERE id = ?',
    )
    .run(usageId, creditAmount, paidAmount, input.fuelRecordId)
  return { usageId, creditAmount, paidAmount }
}

export function releaseOilCredits(database: Database.Database, fuelRecordId: number): void {
  const usage = database
    .prepare('SELECT id FROM oil_credit_usages WHERE fuel_record_id = ?')
    .get(fuelRecordId) as { id: number } | undefined
  if (usage) {
    database.prepare('DELETE FROM oil_credit_usages WHERE id = ?').run(usage.id)
  }
}

export function registerOilCreditHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('oilCredits:list', (_event, filters: any = {}) => {
    let query = `
      SELECT e.*, c.name AS customer_name,
        ROUND(e.amount - COALESCE((SELECT SUM(a.amount) FROM oil_credit_usage_allocations a WHERE a.entry_id = e.id), 0), 2) AS available_amount,
        CASE WHEN e.expires_at < date('now') THEN 'expired'
             WHEN ROUND(e.amount - COALESCE((SELECT SUM(a.amount) FROM oil_credit_usage_allocations a WHERE a.entry_id = e.id), 0), 2) <= 0 THEN 'exhausted'
             ELSE 'active' END AS status
      FROM oil_credit_entries e
      JOIN customers c ON c.id = e.customer_id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.customer_id) {
      query += ' AND e.customer_id = ?'
      params.push(filters.customer_id)
    }
    if (filters.status === 'active') {
      query +=
        " AND e.expires_at >= date('now') AND (e.amount - COALESCE((SELECT SUM(a2.amount) FROM oil_credit_usage_allocations a2 WHERE a2.entry_id = e.id), 0)) > 0"
    }
    if (filters.status === 'expired') {
      query +=
        " AND e.expires_at < date('now') AND (e.amount - COALESCE((SELECT SUM(a2.amount) FROM oil_credit_usage_allocations a2 WHERE a2.entry_id = e.id), 0)) > 0"
    }
    query += ' ORDER BY e.expires_at ASC, e.issued_date ASC, e.id ASC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('oilCredits:create', oilCreditEntrySchema, (data) => {
    if (data.expires_at < data.issued_date) {
      return {
        ok: false,
        errors: { expires_at: 'Vencimento deve ser igual ou posterior à emissão.' },
      }
    }
    const result = db()
      .prepare(
        'INSERT INTO oil_credit_entries (customer_id, amount, issued_date, expires_at, description) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        data.customer_id,
        data.amount,
        data.issued_date,
        data.expires_at,
        data.description || null,
      )
    return { id: result.lastInsertRowid }
  })

  createValidatedHandlerWithId('oilCredits:update', oilCreditEntrySchema, (id, data) => {
    if (data.expires_at < data.issued_date) {
      return {
        ok: false,
        errors: { expires_at: 'Vencimento deve ser igual ou posterior à emissão.' },
      }
    }
    const used = db()
      .prepare('SELECT 1 FROM oil_credit_usage_allocations WHERE entry_id = ? LIMIT 1')
      .get(id)
    if (used) {
      return { ok: false, errors: { form: 'Créditos já consumidos não podem ser alterados.' } }
    }
    db()
      .prepare(
        'UPDATE oil_credit_entries SET customer_id = ?, amount = ?, issued_date = ?, expires_at = ?, description = ? WHERE id = ?',
      )
      .run(
        data.customer_id,
        data.amount,
        data.issued_date,
        data.expires_at,
        data.description || null,
        id,
      )
    return { ok: true }
  })

  createIdValidatedHandler('oilCredits:delete', (id) => {
    const used = db()
      .prepare('SELECT 1 FROM oil_credit_usage_allocations WHERE entry_id = ? LIMIT 1')
      .get(id)
    if (used) {
      return { ok: false, errors: { form: 'Créditos já consumidos não podem ser excluídos.' } }
    }
    db().prepare('DELETE FROM oil_credit_entries WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('oilCredits:summary', () => {
    const row = db()
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN e.expires_at >= date('now') THEN available_amount ELSE 0 END), 0) AS active_amount,
          COALESCE(SUM(CASE WHEN e.expires_at < date('now') THEN available_amount ELSE 0 END), 0) AS expired_amount,
          COUNT(CASE WHEN e.expires_at >= date('now') AND available_amount > 0 THEN 1 END) AS active_lots,
          COUNT(CASE WHEN e.expires_at < date('now') AND available_amount > 0 THEN 1 END) AS expired_lots
         FROM (
           SELECT e.*, ROUND(e.amount - COALESCE(SUM(a.amount), 0), 2) AS available_amount
           FROM oil_credit_entries e
           LEFT JOIN oil_credit_usage_allocations a ON a.entry_id = e.id
           GROUP BY e.id
         ) e`,
      )
      .get() as any
    return {
      active_amount: Number(row.active_amount || 0),
      expired_amount: Number(row.expired_amount || 0),
      active_lots: Number(row.active_lots || 0),
      expired_lots: Number(row.expired_lots || 0),
    }
  })

  ipcMain.handle('oilCredits:movements', (_event, filters: any = {}) => {
    const entryParams: any[] = []
    const usageParams: any[] = []
    let entries = `
      SELECT e.issued_date AS date, 'entry' AS type, e.id AS reference_id,
        c.name AS customer_name, e.amount AS gross_amount, 0 AS credit_amount,
        e.amount AS balance_amount, NULL AS voucher_number, e.description
      FROM oil_credit_entries e JOIN customers c ON c.id = e.customer_id WHERE 1=1`
    let usages = `
      SELECT u.usage_date AS date, 'usage' AS type, u.id AS reference_id,
        c.name AS customer_name, u.gross_amount, u.credit_amount,
        -u.credit_amount AS balance_amount, u.voucher_number,
        ('Abastecimento ' || t.license_plate || ' em ' || COALESCE(s.name, 'posto não informado')) AS description
      FROM oil_credit_usages u
      JOIN customers c ON c.id = u.customer_id
      JOIN fuel_records f ON f.id = u.fuel_record_id
      JOIN trucks t ON t.id = f.truck_id
      LEFT JOIN suppliers s ON s.id = f.supplier_id
      WHERE 1=1`
    if (filters.customer_id) {
      entries += ' AND e.customer_id = ?'
      usages += ' AND u.customer_id = ?'
      entryParams.push(filters.customer_id)
      usageParams.push(filters.customer_id)
    }
    if (filters.startDate) {
      entries += ' AND e.issued_date >= ?'
      usages += ' AND u.usage_date >= ?'
      entryParams.push(filters.startDate)
      usageParams.push(filters.startDate)
    }
    if (filters.endDate) {
      entries += ' AND e.issued_date <= ?'
      usages += ' AND u.usage_date <= ?'
      entryParams.push(filters.endDate)
      usageParams.push(filters.endDate)
    }
    return db()
      .prepare(
        `SELECT * FROM (${entries} UNION ALL ${usages}) ORDER BY date DESC, reference_id DESC`,
      )
      .all(...entryParams, ...usageParams)
  })
}
