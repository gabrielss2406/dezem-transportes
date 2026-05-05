import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { costSchema, idSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

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

  ipcMain.handle('costs:create', (_e, data: any) => {
    try {
      const validatedData = costSchema.parse(data)
      const r = db()
        .prepare(
          `
      INSERT INTO costs (date, category, value, truck_id, supplier_id, driver_id, description)
      VALUES (?,?,?,?,?,?,?)
    `,
        )
        .run(
          validatedData.date,
          validatedData.category,
          validatedData.value,
          validatedData.truck_id || null,
          validatedData.supplier_id || null,
          validatedData.driver_id || null,
          validatedData.description || null,
        )
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('costs:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM costs WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('costs:issueMonthlySalaries', (_e, monthYear: string) => {
    // monthYear format: 'YYYY-MM'
    const drivers = db().prepare('SELECT * FROM drivers WHERE active = 1').all() as any[]
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
