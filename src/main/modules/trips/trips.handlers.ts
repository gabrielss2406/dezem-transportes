import { ipcMain } from 'electron'
import { tripSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'

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
    if (filters.product_id) {
      query += ' AND t.product_id = ?'
      params.push(filters.product_id)
    }
    if (filters.customer_id) {
      query += ' AND t.customer_id = ?'
      params.push(filters.customer_id)
    }
    if (filters.route_id) {
      query += ' AND t.route_id = ?'
      params.push(filters.route_id)
    }
    query += ' ORDER BY t.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('trips:create', tripSchema, (data) => {
    const r = db().transaction(() => {
      const res = db()
        .prepare(
          `
        INSERT INTO trips (date, truck_id, driver_id, product_id, customer_id, route_id, supplier_id, weight_ton, price_charged, km_driven, observation)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `,
        )
        .run(
          data.date,
          data.truck_id,
          data.driver_id,
          data.product_id,
          data.customer_id || null,
          data.route_id || null,
          data.supplier_id || null,
          data.weight_ton,
          data.price_charged,
          data.km_driven,
          data.observation || null,
        )
      // Update truck odometer automatically
      db()
        .prepare('UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?')
        .run(data.km_driven, data.truck_id)
      return res
    })()
    return { id: (r as any).lastInsertRowid }
  })

  createIdValidatedHandler('trips:delete', (id) => {
    db().prepare('DELETE FROM trips WHERE id = ?').run(id)
    return { ok: true }
  })
}
