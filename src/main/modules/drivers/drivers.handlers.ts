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
      SELECT d.*, t.license_plate as truck_license_plate, c.name as contractor_name
      FROM drivers d
      LEFT JOIN trucks t ON d.truck_id = t.id
      LEFT JOIN contractors c ON d.contractor_id = c.id
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
    if (filters.is_outsourced !== undefined) {
      query += ' AND d.is_outsourced = ?'
      params.push(filters.is_outsourced ? 1 : 0)
    }

    query += ' ORDER BY d.name'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('drivers:create', driverSchema, (data) => {
    let customId = data.customId

    if (!customId) {
      const maxId = db().prepare('SELECT MAX(customId) as max_id FROM drivers').get() as any
      customId = (maxId?.max_id || 0) + 1
    }

    const r = db()
      .prepare(
        'INSERT INTO drivers (name, cpf, phone, monthly_salary, truck_id, customId, is_outsourced, contractor_id, commission_rate_override) VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .run(
        data.name,
        data.cpf,
        data.phone,
        data.monthly_salary,
        data.truck_id || null,
        customId,
        data.is_outsourced ?? 0,
        data.contractor_id || null,
        data.commission_rate_override ?? null,
      )
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('drivers:update', driverSchema, (id, data) => {
    const result = db()
      .prepare(
        'UPDATE drivers SET name=?, cpf=?, phone=?, monthly_salary=?, truck_id=?, customId=?, is_outsourced=?, contractor_id=?, commission_rate_override=? WHERE id=?',
      )
      .run(
        data.name,
        data.cpf,
        data.phone,
        data.monthly_salary,
        data.truck_id || null,
        data.customId,
        data.is_outsourced ?? 0,
        data.contractor_id || null,
        data.commission_rate_override ?? null,
        id,
      )

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
