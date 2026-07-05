import { ipcMain } from 'electron'
import { productSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerProductHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('products:list', (_e, search = '') => {
    return db().prepare('SELECT * FROM products WHERE name LIKE ? ORDER BY name').all(`%${search}%`)
  })

  createValidatedHandler('products:create', productSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO products (name, customId, unit_value) VALUES (?,?,?)')
      .run(data.name, data.customId, data.unit_value ?? null)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('products:update', productSchema, (id, data) => {
    db()
      .prepare('UPDATE products SET name=?, customId=?, unit_value=? WHERE id=?')
      .run(data.name, data.customId, data.unit_value ?? null, id)
    return { ok: true }
  })

  createIdValidatedHandler('products:delete', (id) => {
    db().prepare('DELETE FROM products WHERE id = ?').run(id)
    return { ok: true }
  })
}
