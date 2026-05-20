import { ipcMain } from 'electron'
import { truckSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerTruckHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('trucks:list', (_e, filters: any = {}) => {
    let query = 'SELECT * FROM trucks WHERE 1=1'
    const params: any[] = []

    if (filters.license_plate) {
      query += ' AND license_plate LIKE ?'
      params.push(`%${filters.license_plate}%`)
    }
    if (filters.capacity_ton) {
      query += ' AND capacity_ton >= ?'
      params.push(Number(filters.capacity_ton))
    }

    query += ' ORDER BY license_plate'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('trucks:create', truckSchema, (data) => {
    const r = db()
      .prepare(
        'INSERT INTO trucks (license_plate, model, year, capacity_ton, current_odometer, customId) VALUES (?,?,?,?,?,?)',
      )
      .run(
        data.license_plate,
        data.model,
        data.year,
        data.capacity_ton,
        data.current_odometer || 0,
        data.customId,
      )
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('trucks:update', truckSchema, (id, data) => {
    const result = db()
      .prepare(
        'UPDATE trucks SET license_plate=?, model=?, year=?, capacity_ton=?, current_odometer=?, customId=? WHERE id=?',
      )
      .run(
        data.license_plate,
        data.model,
        data.year,
        data.capacity_ton,
        data.current_odometer,
        data.customId,
        id,
      )

    if (result.changes === 0) {
      throw new Error(`Caminhão com ID ${id} não encontrado.`)
    }

    return { ok: true, changes: result.changes }
  })

  createIdValidatedHandler('trucks:delete', (id) => {
    db().prepare('DELETE FROM trucks WHERE id = ?').run(id)
    return { ok: true }
  })
}
