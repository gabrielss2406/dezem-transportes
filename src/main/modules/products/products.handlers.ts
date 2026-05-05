import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { idSchema, productSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

export function registerProductHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('products:list', (_e, search = '') => {
    return db().prepare('SELECT * FROM products WHERE name LIKE ? ORDER BY name').all(`%${search}%`)
  })

  ipcMain.handle('products:create', (_e, data: any) => {
    try {
      const validatedData = productSchema.parse(data)
      const r = db()
        .prepare('INSERT INTO products (name, unit) VALUES (?,?)')
        .run(validatedData.name, validatedData.unit || 'ton')
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('products:update', (_e, id: number, data: any) => {
    try {
      const validatedId = idSchema.parse(id)
      const validatedData = productSchema.parse(data)
      db()
        .prepare('UPDATE products SET name=?, unit=? WHERE id=?')
        .run(validatedData.name, validatedData.unit, validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('products:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM products WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
