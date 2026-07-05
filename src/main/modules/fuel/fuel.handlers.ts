import { ipcMain } from 'electron'
import { fuelRecordSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'

function recalcTruckOdometer(truckId: number): void {
  const database = getDb()
  const row = database
    .prepare('SELECT MAX(odometer_at_service) as max_odo FROM fuel_records WHERE truck_id = ?')
    .get(truckId) as { max_odo: number | null }
  if (row.max_odo !== null) {
    database
      .prepare('UPDATE trucks SET current_odometer = ? WHERE id = ?')
      .run(row.max_odo, truckId)
  }
}

export function registerFuelHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('fuel:list', (_e, filters: any = {}) => {
    let query = `
      SELECT fr.*,
        t.license_plate as truck_license_plate,
        t.model as truck_model,
        s.name as supplier_name
      FROM fuel_records fr
      JOIN trucks t ON fr.truck_id = t.id
      LEFT JOIN suppliers s ON fr.supplier_id = s.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.truck_id) {
      query += ' AND fr.truck_id = ?'
      params.push(filters.truck_id)
    }
    if (filters.startDate) {
      query += ' AND fr.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND fr.date <= ?'
      params.push(filters.endDate)
    }
    query += ' ORDER BY fr.date DESC, fr.id DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('fuel:create', fuelRecordSchema, (data) => {
    const maxRow = db()
      .prepare('SELECT MAX(odometer_at_service) as max_odo FROM fuel_records WHERE truck_id = ?')
      .get(data.truck_id) as { max_odo: number | null }

    if (maxRow.max_odo !== null && data.odometer_at_service <= maxRow.max_odo) {
      return {
        ok: false,
        errors: {
          odometer_at_service: `Hodômetro deve ser maior que o último registro (${maxRow.max_odo.toFixed(0)} km)`,
        },
      }
    }

    const r = db()
      .prepare(
        'INSERT INTO fuel_records (truck_id, date, liters, value, odometer_at_service, supplier_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        data.truck_id,
        data.date,
        data.liters || null,
        data.value,
        data.odometer_at_service,
        data.supplier_id || null,
        data.notes || null,
      )

    recalcTruckOdometer(data.truck_id)
    return { id: r.lastInsertRowid }
  })

  createIdValidatedHandler('fuel:delete', (id) => {
    const record = db().prepare('SELECT truck_id FROM fuel_records WHERE id = ?').get(id) as any
    db().prepare('DELETE FROM fuel_records WHERE id = ?').run(id)
    if (record?.truck_id) {
      recalcTruckOdometer(record.truck_id)
    }
    return { ok: true }
  })
}
