import { ipcMain } from 'electron'
import { supplierSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerSupplierHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('suppliers:list', (_e, search = '') => {
    return db()
      .prepare('SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name')
      .all(`%${search}%`)
  })

  createValidatedHandler('suppliers:create', supplierSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO suppliers (name, type, phone) VALUES (?,?,?)')
      .run(data.name, data.type, data.phone)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('suppliers:update', supplierSchema, (id, data) => {
    db()
      .prepare('UPDATE suppliers SET name=?, type=?, phone=? WHERE id=?')
      .run(data.name, data.type, data.phone, id)
    return { ok: true }
  })

  createIdValidatedHandler('suppliers:delete', (id) => {
    db().prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return { ok: true }
  })
}
