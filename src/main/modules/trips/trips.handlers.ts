import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { idSchema, tripSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

export function registerTripHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('trips:list', (_e, filters: any = {}) => {
    let query = `
      SELECT t.*,
        tr.license_plate as truck_license_plate, tr.model as truck_model,
        d.name           as driver_name,
        p.name           as product_name,
        c.name           as customer_name,
        r.name           as route_name
      FROM trips t
      JOIN trucks tr ON t.truck_id = tr.id
      JOIN drivers d ON t.driver_id = d.id
      JOIN products p ON t.product_id = p.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN routes r ON t.route_id = r.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.startDate) {
      query += ' AND t.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND t.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.truck_id) {
      query += ' AND t.truck_id = ?'
      params.push(filters.truck_id)
    }
    if (filters.driver_id) {
      query += ' AND t.driver_id = ?'
      params.push(filters.driver_id)
    }
    query += ' ORDER BY t.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  ipcMain.handle('trips:create', (_e, data: any) => {
    try {
      const validatedData = tripSchema.parse(data)
      const r = db().transaction(() => {
        const res = db()
          .prepare(
            `
        INSERT INTO trips (date, truck_id, driver_id, product_id, customer_id, route_id, supplier_id, weight_ton, price_charged, km_driven, observation)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `,
          )
          .run(
            validatedData.date,
            validatedData.truck_id,
            validatedData.driver_id,
            validatedData.product_id,
            validatedData.customer_id || null,
            validatedData.route_id || null,
            validatedData.supplier_id || null,
            validatedData.weight_ton,
            validatedData.price_charged,
            validatedData.km_driven,
            validatedData.observation || null,
          )
        // Update truck odometer automatically
        db()
          .prepare('UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?')
          .run(validatedData.km_driven, validatedData.truck_id)
        return res
      })()
      return { id: (r as any).lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('trips:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM trips WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
