import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import { costSchema, costsMarkPaidSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

// Adds `monthsToAdd` calendar months to an ISO date string, keeping the day-of-month
// but clamping to the last day of the target month (e.g. Jan 31 + 1 month -> Feb 28/29).
function addMonthsClamped(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const totalMonths = m - 1 + monthsToAdd
  const targetYear = y + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const clampedDay = Math.min(d, lastDay)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

export function registerCostHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('costs:list', (_e, filters: any = {}) => {
    let query = `
      SELECT co.*,
        t.license_plate as truck_license_plate,
        s.name          as supplier_name,
        d.name          as driver_name
      FROM costs co
      LEFT JOIN trucks t ON co.truck_id = t.id
      LEFT JOIN suppliers s ON co.supplier_id = s.id
      LEFT JOIN drivers d ON co.driver_id = d.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.startDate) {
      query += ' AND co.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND co.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.category) {
      query += ' AND co.category = ?'
      params.push(filters.category)
    }
    if (filters.truck_id) {
      query += ' AND co.truck_id = ?'
      params.push(filters.truck_id)
    }
    if (filters.supplier_id) {
      query += ' AND co.supplier_id = ?'
      params.push(filters.supplier_id)
    }
    if (filters.status) {
      query += ' AND co.status = ?'
      params.push(filters.status)
    }
    query += ' ORDER BY co.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('costs:create', costSchema, (data) => {
    const insert = db().prepare(`
      INSERT INTO costs (date, category, value, truck_id, supplier_id, driver_id, description, installment_group_id, installment_number, installment_total, kind, status, paid_date)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)

    if (data.installments <= 1) {
      const r = insert.run(
        data.date,
        data.category,
        data.value,
        data.truck_id || null,
        data.supplier_id || null,
        data.driver_id || null,
        data.description || null,
        null,
        null,
        null,
        data.kind,
        'paid',
        data.date,
      )
      return { id: r.lastInsertRowid }
    }

    // Split the total into N installments in integer cents; the rounding remainder
    // goes entirely into the LAST installment so the sum matches the total exactly.
    const totalCents = Math.round(data.value * 100)
    const baseCents = Math.floor(totalCents / data.installments)
    const remainderCents = totalCents - baseCents * data.installments
    const groupId = randomUUID()

    const firstId = db().transaction(() => {
      let firstInsertedId: number | null = null
      for (let i = 0; i < data.installments; i++) {
        const isLast = i === data.installments - 1
        const cents = isLast ? baseCents + remainderCents : baseCents
        const r = insert.run(
          addMonthsClamped(data.date, i),
          data.category,
          cents / 100,
          data.truck_id || null,
          data.supplier_id || null,
          data.driver_id || null,
          data.description || null,
          groupId,
          i + 1,
          data.installments,
          data.kind,
          'open',
          null,
        )
        if (i === 0) {
          firstInsertedId = r.lastInsertRowid as number
        }
      }
      return firstInsertedId
    })()

    return { id: firstId }
  })

  createValidatedHandlerWithId('costs:update', costSchema, (id, data) => {
    db()
      .prepare(
        `
      UPDATE costs SET date=?, category=?, value=?, truck_id=?, supplier_id=?, driver_id=?, description=?, kind=?
      WHERE id=?
    `,
      )
      .run(
        data.date,
        data.category,
        data.value,
        data.truck_id || null,
        data.supplier_id || null,
        data.driver_id || null,
        data.description || null,
        data.kind,
        id,
      )
    return { ok: true }
  })

  createValidatedHandler('costs:markPaid', costsMarkPaidSchema, (data) => {
    const placeholders = data.ids.map(() => '?').join(',')
    const r = db()
      .prepare(
        `UPDATE costs SET status = 'paid', paid_date = ? WHERE status = 'open' AND id IN (${placeholders})`,
      )
      .run(data.paid_date, ...data.ids)
    return { ok: true, updated: r.changes }
  })

  createIdValidatedHandler('costs:delete', (id) => {
    db().prepare('DELETE FROM costs WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('costs:issueMonthlySalaries', (_e, monthYear: string) => {
    // monthYear format: 'YYYY-MM'
    const drivers = db()
      .prepare(
        'SELECT * FROM drivers WHERE active = 1 AND (is_outsourced = 0 OR is_outsourced IS NULL)',
      )
      .all() as any[]
    const date = `${monthYear}-01`
    let issued = 0
    const insert = db().prepare(`
      INSERT INTO costs (date, category, value, driver_id, description)
      VALUES (?, 'salary', ?, ?, ?)
    `)
    const transaction = db().transaction(() => {
      for (const d of drivers) {
        // Check if already issued
        const existing = db()
          .prepare(
            `
          SELECT id FROM costs WHERE category='salary' AND driver_id=? AND date LIKE ?
        `,
          )
          .get(d.id, `${monthYear}%`)
        if (!existing) {
          insert.run(date, d.monthly_salary, d.id, `Salário ${d.name} — ${monthYear}`)
          issued++
        }
      }
    })
    transaction()
    return { ok: true, issued }
  })
}
