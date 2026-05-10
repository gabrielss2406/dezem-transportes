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

  ipcMain.handle('drivers:list', () => {
    return db()
      .prepare(
        `
      SELECT d.*, t.license_plate as truck_license_plate
      FROM drivers d
      LEFT JOIN trucks t ON d.truck_id = t.id
      ORDER BY d.name
    `,
      )
      .all()
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
