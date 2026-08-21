import { ipcMain } from 'electron'
import { receivableSchema, receivablesMarkPaidSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'

export function registerReceivablesHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('receivables:list', (_e, filters: any = {}) => {
    let query = `
      SELECT r.*,
        t.ticket_number as trip_ticket_number,
        t.date          as trip_date,
        c.name          as customer_name
      FROM receivables r
      LEFT JOIN trips t ON r.trip_id = t.id
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.customer_id) {
      query += ' AND r.customer_id = ?'
      params.push(filters.customer_id)
    }
    if (filters.status) {
      query += ' AND r.status = ?'
      params.push(filters.status)
    }
    if (filters.startDate) {
      query += ' AND COALESCE(t.date, r.due_date) >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND COALESCE(t.date, r.due_date) <= ?'
      params.push(filters.endDate)
    }
    query += ' ORDER BY COALESCE(t.date, r.due_date) ASC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('receivables:markPaid', receivablesMarkPaidSchema, (data) => {
    const placeholders = data.ids.map(() => '?').join(',')
    const r = db()
      .prepare(
        `UPDATE receivables SET status = 'paid', paid_date = ? WHERE status = 'open' AND id IN (${placeholders})`,
      )
      .run(data.paid_date, ...data.ids)
    return { ok: true, updated: r.changes }
  })

  createValidatedHandler('receivables:create', receivableSchema, (data) => {
    const r = db()
      .prepare(
        `INSERT INTO receivables (customer_id, amount, status, due_date, description, created_at)
         VALUES (?, ?, 'open', ?, ?, datetime('now'))`,
      )
      .run(data.customer_id, data.amount, data.due_date, data.description || null)
    return { ok: true, id: r.lastInsertRowid }
  })

  createIdValidatedHandler('receivables:delete', (id) => {
    const r = db().prepare('DELETE FROM receivables WHERE id = ? AND trip_id IS NULL').run(id)
    if (r.changes === 0) {
      return {
        ok: false,
        errors: {
          form: 'Este recebível está vinculado a uma viagem e não pode ser excluído aqui.',
        },
      }
    }
    return { ok: true }
  })

  ipcMain.handle('receivables:summaryByCustomer', () => {
    return db()
      .prepare(
        `SELECT r.customer_id, c.name as customer_name,
           COALESCE(SUM(CASE WHEN r.status = 'open' THEN r.amount ELSE 0 END), 0) as open_amount,
           COUNT(CASE WHEN r.status = 'open' THEN 1 END) as open_count
         FROM receivables r
         LEFT JOIN customers c ON r.customer_id = c.id
         GROUP BY r.customer_id
         HAVING open_count > 0
         ORDER BY open_amount DESC`,
      )
      .all()
  })
}
