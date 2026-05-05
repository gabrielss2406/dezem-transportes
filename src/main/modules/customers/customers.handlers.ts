import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { customerSchema, idSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

export function registerCustomerHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('customers:list', (_e, search = '') => {
    return db()
      .prepare('SELECT * FROM customers WHERE name LIKE ? ORDER BY name')
      .all(`%${search}%`)
  })

  ipcMain.handle('customers:create', (_e, data: any) => {
    try {
      const validatedData = customerSchema.parse(data)
      const r = db()
        .prepare('INSERT INTO customers (name, cnpj, ie, phone, address) VALUES (?,?,?,?,?)')
        .run(
          validatedData.name,
          validatedData.cnpj,
          validatedData.ie,
          validatedData.phone,
          validatedData.address,
        )
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('customers:update', (_e, id: number, data: any) => {
    try {
      const validatedId = idSchema.parse(id)
      const validatedData = customerSchema.parse(data)
      db()
        .prepare('UPDATE customers SET name=?, cnpj=?, ie=?, phone=?, address=? WHERE id=?')
        .run(
          validatedData.name,
          validatedData.cnpj,
          validatedData.ie,
          validatedData.phone,
          validatedData.address,
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

  ipcMain.handle('customers:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM customers WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
