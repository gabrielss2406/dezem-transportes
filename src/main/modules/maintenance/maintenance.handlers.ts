import type Database from 'better-sqlite3'
import { ipcMain } from 'electron'
import { maintenanceRecordSchema, maintenanceTypeSchema } from '../../../shared/schemas'
import type { TruckMaintenanceStatus } from '../../../shared/types'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function getMaintenanceStatus(
  db: Database.Database,
  filters: any = {},
): TruckMaintenanceStatus[] {
  let trucksQuery = 'SELECT id, license_plate, model, current_odometer FROM trucks'
  const truckParams: any[] = []
  if (filters.truck_id) {
    trucksQuery += ' WHERE id = ?'
    truckParams.push(filters.truck_id)
  }
  trucksQuery += ' ORDER BY license_plate'
  const trucks = db.prepare(trucksQuery).all(...truckParams) as any[]

  const types = db
    .prepare('SELECT * FROM maintenance_types WHERE is_active = 1 ORDER BY name')
    .all() as any[]

  const getLastRecord = db.prepare(
    'SELECT * FROM maintenance_records WHERE truck_id = ? AND maintenance_type_id = ? ORDER BY date DESC, id DESC LIMIT 1',
  )

  const dueSoonKm = (interval_km: number) => Math.min(interval_km * 0.2, 500)

  return trucks.map((truck) => ({
    truck_id: truck.id,
    truck_license_plate: truck.license_plate,
    truck_model: truck.model,
    current_odometer: truck.current_odometer,
    types: types.map((type) => {
      const lastRecord = getLastRecord.get(truck.id, type.id) as any
      const km_since_last =
        lastRecord != null ? truck.current_odometer - lastRecord.odometer_at_service : null
      const km_remaining = km_since_last != null ? type.interval_km - km_since_last : null

      let status: string
      if (!lastRecord) {
        status = 'never'
      } else if (km_remaining !== null && km_remaining <= 0) {
        status = 'overdue'
      } else if (km_remaining !== null && km_remaining <= dueSoonKm(type.interval_km)) {
        status = 'due_soon'
      } else {
        status = 'ok'
      }

      return {
        type_id: type.id,
        type_name: type.name,
        interval_km: type.interval_km,
        last_record_id: lastRecord?.id ?? null,
        last_date: lastRecord?.date ?? null,
        odometer_at_service: lastRecord?.odometer_at_service ?? null,
        km_since_last,
        km_remaining,
        status,
      }
    }),
  }))
}

export function registerMaintenanceHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('maintenance:listTypes', (_e, includeInactive = false) => {
    const sql = includeInactive
      ? 'SELECT * FROM maintenance_types ORDER BY name'
      : 'SELECT * FROM maintenance_types WHERE is_active = 1 ORDER BY name'
    return db().prepare(sql).all()
  })

  createValidatedHandler('maintenance:createType', maintenanceTypeSchema, (data) => {
    const r = db()
      .prepare(
        'INSERT INTO maintenance_types (name, description, interval_km, is_active) VALUES (?,?,?,?)',
      )
      .run(
        data.name,
        (data as any).description || null,
        (data as any).interval_km,
        (data as any).is_active ?? 1,
      )
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('maintenance:updateType', maintenanceTypeSchema, (id, data) => {
    db()
      .prepare(
        'UPDATE maintenance_types SET name=?, description=?, interval_km=?, is_active=? WHERE id=?',
      )
      .run(
        data.name,
        (data as any).description || null,
        (data as any).interval_km,
        (data as any).is_active ?? 1,
        id,
      )
    return { ok: true }
  })

  ipcMain.handle('maintenance:deleteType', (_e, id: number) => {
    const type = db()
      .prepare('SELECT is_deletable FROM maintenance_types WHERE id=?')
      .get(id) as any
    if (!type?.is_deletable) {
      return { ok: false, error: 'Este tipo de manutenção não pode ser excluído.' }
    }
    db().prepare('DELETE FROM maintenance_types WHERE id=?').run(id)
    return { ok: true }
  })

  ipcMain.handle('maintenance:listRecords', (_e, filters: any = {}) => {
    let query = `
      SELECT mr.*,
        t.license_plate as truck_license_plate, t.model as truck_model,
        mt.name as type_name, mt.interval_km
      FROM maintenance_records mr
      JOIN trucks t ON mr.truck_id = t.id
      JOIN maintenance_types mt ON mr.maintenance_type_id = mt.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.truck_id) {
      query += ' AND mr.truck_id = ?'
      params.push(filters.truck_id)
    }
    if (filters.maintenance_type_id) {
      query += ' AND mr.maintenance_type_id = ?'
      params.push(filters.maintenance_type_id)
    }
    if (filters.startDate) {
      query += ' AND mr.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND mr.date <= ?'
      params.push(filters.endDate)
    }
    query += ' ORDER BY mr.date DESC, mr.id DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('maintenance:createRecord', maintenanceRecordSchema, (data) => {
    const r = db()
      .prepare(
        'INSERT INTO maintenance_records (truck_id, maintenance_type_id, date, odometer_at_service, notes) VALUES (?,?,?,?,?)',
      )
      .run(
        (data as any).truck_id,
        (data as any).maintenance_type_id,
        data.date,
        (data as any).odometer_at_service,
        (data as any).notes || null,
      )
    return { id: r.lastInsertRowid }
  })

  createIdValidatedHandler('maintenance:deleteRecord', (id) => {
    db().prepare('DELETE FROM maintenance_records WHERE id=?').run(id)
    return { ok: true }
  })

  ipcMain.handle('maintenance:getStatus', (_e, filters: any = {}) => {
    return getMaintenanceStatus(db(), filters)
  })
}
