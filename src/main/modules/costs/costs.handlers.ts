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

  // Creditor-based report: unions operational costs with both fuel sources
  // (standalone fuel_records and trip_fuel_stops), all of which carry a real
  // supplier_id, so Accounts Payable can be reconciled by creditor including fuel
  // spend. Costs without a supplier are intentionally excluded (inner joins) —
  // there's no creditor to group them under. Not filtered by is_third_party: a
  // trip's fuel is still owed to the supplier regardless of the trip's own
  // revenue classification.
  ipcMain.handle('costs:byCreditor', (_e, filters: any = {}) => {
    const params: any[] = []

    let costsPart = `
      SELECT co.id as id, 'cost' as source, co.date as date, co.category as category,
        co.value as value, co.description as description,
        co.supplier_id as supplier_id, s.name as supplier_name
      FROM costs co
      JOIN suppliers s ON co.supplier_id = s.id
      WHERE 1=1
    `
    if (filters.startDate) {
      costsPart += ' AND co.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      costsPart += ' AND co.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.supplier_id) {
      costsPart += ' AND co.supplier_id = ?'
      params.push(filters.supplier_id)
    }

    let fuelRecordsPart = `
      SELECT fr.id as id, 'fuel_record' as source, fr.date as date, 'fuel' as category,
        fr.value as value, ('Abastecimento — ' || t.license_plate) as description,
        fr.supplier_id as supplier_id, s.name as supplier_name
      FROM fuel_records fr
      JOIN trucks t ON fr.truck_id = t.id
      JOIN suppliers s ON fr.supplier_id = s.id
      WHERE 1=1
    `
    if (filters.startDate) {
      fuelRecordsPart += ' AND fr.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      fuelRecordsPart += ' AND fr.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.supplier_id) {
      fuelRecordsPart += ' AND fr.supplier_id = ?'
      params.push(filters.supplier_id)
    }

    let tripFuelStopsPart = `
      SELECT fs.id as id, 'trip_fuel_stop' as source, tr.date as date, 'fuel' as category,
        fs.value as value, ('Abastecimento em viagem — ' || tr.ticket_number) as description,
        fs.supplier_id as supplier_id, s.name as supplier_name
      FROM trip_fuel_stops fs
      JOIN trips tr ON fs.trip_id = tr.id
      JOIN suppliers s ON fs.supplier_id = s.id
      WHERE 1=1
    `
    if (filters.startDate) {
      tripFuelStopsPart += ' AND tr.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      tripFuelStopsPart += ' AND tr.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.supplier_id) {
      tripFuelStopsPart += ' AND fs.supplier_id = ?'
      params.push(filters.supplier_id)
    }

    const query = `${costsPart} UNION ALL ${fuelRecordsPart} UNION ALL ${tripFuelStopsPart} ORDER BY date ASC`
    return db()
      .prepare(query)
      .all(...params)
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
