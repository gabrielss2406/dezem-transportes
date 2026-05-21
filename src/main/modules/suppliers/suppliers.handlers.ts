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

  ipcMain.handle('suppliers:list', (_e, filters: any = {}) => {
    let query = 'SELECT * FROM suppliers WHERE 1=1'
    const params: any[] = []

    const nameSearch = typeof filters === 'string' ? filters : filters.name
    const typeFilter = filters.type

    if (nameSearch) {
      query += ' AND name LIKE ?'
      params.push(`%${nameSearch}%`)
    }
    if (typeFilter) {
      query += ' AND type = ?'
      params.push(typeFilter)
    }

    query += ' ORDER BY name'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('suppliers:create', supplierSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO suppliers (name, type, phone, customId) VALUES (?,?,?,?)')
      .run(data.name, data.type, data.phone, data.customId)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('suppliers:update', supplierSchema, (id, data) => {
    db()
      .prepare('UPDATE suppliers SET name=?, type=?, phone=?, customId=? WHERE id=?')
      .run(data.name, data.type, data.phone, data.customId, id)
    return { ok: true }
  })

  createIdValidatedHandler('suppliers:delete', (id) => {
    db().prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return { ok: true }
  })
}
