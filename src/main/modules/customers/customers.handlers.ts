import { ipcMain } from 'electron'
import { customerSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerCustomerHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('customers:list', (_e, search = '') => {
    return db()
      .prepare('SELECT * FROM customers WHERE name LIKE ? ORDER BY name')
      .all(`%${search}%`)
  })

  createValidatedHandler('customers:create', customerSchema, (data) => {
    const r = db()
      .prepare(
        'INSERT INTO customers (name, cnpj, ie, phone, address, customId) VALUES (?,?,?,?,?,?)',
      )
      .run(data.name, data.cnpj, data.ie, data.phone, data.address, data.customId)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('customers:update', customerSchema, (id, data) => {
    db()
      .prepare(
        'UPDATE customers SET name=?, cnpj=?, ie=?, phone=?, address=?, customId=? WHERE id=?',
      )
      .run(data.name, data.cnpj, data.ie, data.phone, data.address, data.customId, id)
    return { ok: true }
  })

  createIdValidatedHandler('customers:delete', (id) => {
    db().prepare('DELETE FROM customers WHERE id = ?').run(id)
    return { ok: true }
  })
}
