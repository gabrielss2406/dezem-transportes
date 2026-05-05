import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { routeSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

export function registerRouteHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('routes:list', () => db().prepare('SELECT * FROM routes ORDER BY name').all())

  ipcMain.handle('routes:create', (_e, data: any) => {
    try {
      const validatedData = routeSchema.parse(data)
      const r = db()
        .prepare('INSERT INTO routes (name, distance_km) VALUES (?,?)')
        .run(validatedData.name, validatedData.distance_km)
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
