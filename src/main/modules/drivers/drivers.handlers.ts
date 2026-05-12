import { ipcMain } from 'electron'
import { driverSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerDriverHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('drivers:list', (_e, filters: any = {}) => {
    let query = `
      SELECT d.*, t.license_plate as truck_license_plate
      FROM drivers d
      LEFT JOIN trucks t ON d.truck_id = t.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.name) {
      query += ' AND d.name LIKE ?'
      params.push(`%${filters.name}%`)
    }
    if (filters.cpf) {
      query += ' AND d.cpf LIKE ?'
      params.push(`%${filters.cpf}%`)
    }
    if (filters.truck_id) {
      query += ' AND d.truck_id = ?'
      params.push(filters.truck_id)
    }

    query += ' ORDER BY d.name'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('drivers:create', driverSchema, (data) => {
    const r = db()
      .prepare(
        'INSERT INTO drivers (name, cpf, phone, monthly_salary, truck_id) VALUES (?,?,?,?,?)',
      )
      .run(data.name, data.cpf, data.phone, data.monthly_salary, data.truck_id || null)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('drivers:update', driverSchema, (id, data) => {
    const result = db()
      .prepare('UPDATE drivers SET name=?, cpf=?, phone=?, monthly_salary=?, truck_id=? WHERE id=?')
      .run(data.name, data.cpf, data.phone, data.monthly_salary, data.truck_id || null, id)

    if (result.changes === 0) {
      throw new Error(`Motorista com ID ${id} não encontrado.`)
    }
    return { ok: true }
  })

  createIdValidatedHandler('drivers:delete', (id) => {
    db().prepare('DELETE FROM drivers WHERE id = ?').run(id)
    return { ok: true }
  })
}
