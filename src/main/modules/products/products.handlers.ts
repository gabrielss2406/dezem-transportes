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
      .prepare('INSERT INTO products (name, unit) VALUES (?,?)')
      .run(data.name, data.unit || 'ton')
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('products:update', productSchema, (id, data) => {
    db().prepare('UPDATE products SET name=?, unit=? WHERE id=?').run(data.name, data.unit, id)
    return { ok: true }
  })

  createIdValidatedHandler('products:delete', (id) => {
    db().prepare('DELETE FROM products WHERE id = ?').run(id)
    return { ok: true }
  })
}
