import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { idSchema, supplierSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

export function registerSupplierHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('suppliers:list', (_e, search = '') => {
    return db()
      .prepare('SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name')
      .all(`%${search}%`)
  })

  ipcMain.handle('suppliers:create', (_e, data: any) => {
    try {
      const validatedData = supplierSchema.parse(data)
      const r = db()
        .prepare('INSERT INTO suppliers (name, type, phone) VALUES (?,?,?)')
        .run(validatedData.name, validatedData.type, validatedData.phone)
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('suppliers:update', (_e, id: number, data: any) => {
    try {
      const validatedId = idSchema.parse(id)
      const validatedData = supplierSchema.parse(data)
      db()
        .prepare('UPDATE suppliers SET name=?, type=?, phone=? WHERE id=?')
        .run(validatedData.name, validatedData.type, validatedData.phone, validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('suppliers:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM suppliers WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
