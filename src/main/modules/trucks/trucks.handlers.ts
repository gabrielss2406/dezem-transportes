import { ipcMain } from 'electron'
import { truckSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerTruckHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('trucks:list', () => {
    return db().prepare('SELECT * FROM trucks ORDER BY license_plate').all()
  })

  createValidatedHandler('trucks:create', truckSchema, (data) => {
    const r = db()
      .prepare(
        'INSERT INTO trucks (license_plate, model, year, capacity_ton, current_odometer) VALUES (?,?,?,?,?)',
      )
      .run(data.license_plate, data.model, data.year, data.capacity_ton, data.current_odometer || 0)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('trucks:update', truckSchema, (id, data) => {
    db()
      .prepare('UPDATE trucks SET license_plate=?, model=?, year=?, capacity_ton=? WHERE id=?')
      .run(data.license_plate, data.model, data.year, data.capacity_ton, id)
    return { ok: true }
  })

  createIdValidatedHandler('trucks:delete', (id) => {
    db().prepare('DELETE FROM trucks WHERE id = ?').run(id)
    return { ok: true }
  })
}
