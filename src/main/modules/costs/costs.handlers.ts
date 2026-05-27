import { ipcMain } from 'electron'
import { costSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'

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
    query += ' ORDER BY co.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('costs:create', costSchema, (data) => {
    const r = db()
      .prepare(
        `
      INSERT INTO costs (date, category, value, truck_id, supplier_id, driver_id, description)
      VALUES (?,?,?,?,?,?,?)
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
      )
    return { id: r.lastInsertRowid }
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
