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
    let query = `
      SELECT t.*, c.name as contractor_name
      FROM trucks t
      LEFT JOIN contractors c ON t.contractor_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.license_plate) {
      query += ' AND t.license_plate LIKE ?'
      params.push(`%${filters.license_plate}%`)
    }
    if (filters.capacity_ton) {
      query += ' AND t.capacity_ton >= ?'
      params.push(Number(filters.capacity_ton))
    }
    if (filters.is_outsourced !== undefined) {
      query += ' AND t.is_outsourced = ?'
      params.push(filters.is_outsourced ? 1 : 0)
    }

    query += ' ORDER BY t.license_plate'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('trucks:create', truckSchema, (data) => {
    let customId = data.customId

    if (!customId) {
      const maxId = db().prepare('SELECT MAX(customId) as max_id FROM trucks').get() as any
      customId = (maxId?.max_id || 0) + 1
    }

    const r = db()
      .prepare(
        'INSERT INTO trucks (license_plate, model, year, capacity_ton, current_odometer, customId, is_outsourced, contractor_id) VALUES (?,?,?,?,?,?,?,?)',
      )
      .run(
        data.license_plate,
        data.model ?? '',
        data.year,
        data.capacity_ton,
        data.current_odometer || 0,
        customId,
        data.is_outsourced ?? 0,
        data.contractor_id || null,
      )
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('trucks:update', truckSchema, (id, data) => {
    const result = db()
      .prepare(
        'UPDATE trucks SET license_plate=?, model=?, year=?, capacity_ton=?, current_odometer=?, customId=?, is_outsourced=?, contractor_id=? WHERE id=?',
      )
      .run(
        data.license_plate,
        data.model ?? '',
        data.year,
        data.capacity_ton,
        data.current_odometer,
        data.customId,
        data.is_outsourced ?? 0,
        data.contractor_id || null,
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
