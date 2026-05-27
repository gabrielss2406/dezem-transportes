import { ipcMain } from 'electron'
import { tripSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerTripHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('trips:list', (_e, filters: any = {}) => {
    let query = `
      SELECT t.*,
        tr.license_plate as truck_license_plate, tr.model as truck_model,
        d.name           as driver_name,
        p.name           as product_name,
        c.name           as customer_name,
        (SELECT COUNT(*) FROM trip_fuel_stops WHERE trip_id = t.id) as fuel_stops_count
      FROM trips t
      JOIN trucks tr ON t.truck_id = tr.id
      JOIN drivers d ON t.driver_id = d.id
      JOIN products p ON t.product_id = p.id
      LEFT JOIN customers c ON t.customer_id = c.id
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
    query += ' ORDER BY t.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  ipcMain.handle('trips:getFuelStops', (_e, tripId: number) => {
    const sql = `
      SELECT fs.*, s.name as supplier_name
      FROM trip_fuel_stops fs
      JOIN suppliers s ON fs.supplier_id = s.id
      WHERE fs.trip_id = ?
      ORDER BY fs.id ASC
    `
    return db().prepare(sql).all(tripId)
  })

  createValidatedHandler('trips:create', tripSchema, (data) => {
    const { fuel_stops, ...tripData } = data
    const r = db().transaction(() => {
      const res = db()
        .prepare(
          `
        INSERT INTO trips (date, truck_id, driver_id, product_id, customer_id, supplier_id, weight_ton, price_charged, km_driven, observation)
        VALUES (?,?,?,?,?,?,?,?,?,?)
      `,
        )
        .run(
          tripData.date,
          tripData.truck_id,
          tripData.driver_id,
          tripData.product_id,
          tripData.customer_id || null,
          tripData.supplier_id || null,
          tripData.weight_ton,
          tripData.price_charged,
          tripData.km_driven,
          tripData.observation || null,
        )

      const tripId = res.lastInsertRowid

      // Insert fuel stops
      if (fuel_stops && fuel_stops.length > 0) {
        const insertStop = db().prepare(
          'INSERT INTO trip_fuel_stops (trip_id, supplier_id, value, liters, km_driven) VALUES (?, ?, ?, ?, ?)',
        )
        for (const stop of fuel_stops) {
          insertStop.run(tripId, stop.supplier_id, stop.value, stop.liters, stop.km_driven)
        }
      }

      // Update truck odometer automatically
      db()
        .prepare('UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?')
        .run(tripData.km_driven, tripData.truck_id)
      return res
    })()
    return { id: (r as any).lastInsertRowid }
  })

  createValidatedHandlerWithId('trips:update', tripSchema, (id, data) => {
    const { fuel_stops, ...tripData } = data
    db().transaction(() => {
      const oldTrip = db()
        .prepare('SELECT truck_id, km_driven FROM trips WHERE id = ?')
        .get(id) as any

      db()
        .prepare(
          `UPDATE trips SET date=?, truck_id=?, driver_id=?, product_id=?, customer_id=?,
            supplier_id=?, weight_ton=?, price_charged=?, km_driven=?, observation=?
          WHERE id=?`,
        )
        .run(
          tripData.date,
          tripData.truck_id,
          tripData.driver_id,
          tripData.product_id,
          tripData.customer_id || null,
          tripData.supplier_id || null,
          tripData.weight_ton,
          tripData.price_charged,
          tripData.km_driven,
          tripData.observation || null,
          id,
        )

      if (oldTrip) {
        db()
          .prepare('UPDATE trucks SET current_odometer = current_odometer - ? WHERE id = ?')
          .run(oldTrip.km_driven, oldTrip.truck_id)
      }
      db()
        .prepare('UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?')
        .run(tripData.km_driven, tripData.truck_id)

      db().prepare('DELETE FROM trip_fuel_stops WHERE trip_id = ?').run(id)
      if (fuel_stops && fuel_stops.length > 0) {
        const insertStop = db().prepare(
          'INSERT INTO trip_fuel_stops (trip_id, supplier_id, value, liters, km_driven) VALUES (?, ?, ?, ?, ?)',
        )
        for (const stop of fuel_stops) {
          insertStop.run(id, stop.supplier_id, stop.value, stop.liters, stop.km_driven)
        }
      }
    })()
    return { ok: true }
  })

  createIdValidatedHandler('trips:delete', (id) => {
    db().prepare('DELETE FROM trips WHERE id = ?').run(id)
    return { ok: true }
  })
}
