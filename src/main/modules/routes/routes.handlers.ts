import { ipcMain } from 'electron'
import { routeSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'
import { createValidatedHandler } from '../../lib/utils'

export function registerRouteHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('routes:list', () => db().prepare('SELECT * FROM routes ORDER BY name').all())

  createValidatedHandler('routes:create', routeSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO routes (name, distance_km) VALUES (?,?)')
      .run(data.name, data.distance_km)
    return { id: r.lastInsertRowid }
  })
}
