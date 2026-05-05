import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { idSchema, truckSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

export function registerTruckHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('trucks:list', () => {
    return db().prepare('SELECT * FROM trucks ORDER BY license_plate').all()
  })

  ipcMain.handle('trucks:create', (_e, data: any) => {
    try {
      const validatedData = truckSchema.parse(data)
      const r = db()
        .prepare(
          'INSERT INTO trucks (license_plate, model, year, capacity_ton, current_odometer) VALUES (?,?,?,?,?)',
        )
        .run(
          validatedData.license_plate,
          validatedData.model,
          validatedData.year,
          validatedData.capacity_ton,
          validatedData.current_odometer || 0,
        )
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('trucks:update', (_e, id: number, data: any) => {
    try {
      const validatedId = idSchema.parse(id)
      const validatedData = truckSchema.parse(data)
      db()
        .prepare('UPDATE trucks SET license_plate=?, model=?, year=?, capacity_ton=? WHERE id=?')
        .run(
          validatedData.license_plate,
          validatedData.model,
          validatedData.year,
          validatedData.capacity_ton,
          validatedId,
        )
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('trucks:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM trucks WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
