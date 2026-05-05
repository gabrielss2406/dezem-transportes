import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { driverSchema, idSchema } from '../../../renderer/src/lib/schemas'
import { getDb } from '../../database'

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

  ipcMain.handle('drivers:create', (_e, data: any) => {
    try {
      const validatedData = driverSchema.parse(data)
      const r = db()
        .prepare(
          'INSERT INTO drivers (name, cpf, phone, monthly_salary, truck_id) VALUES (?,?,?,?,?)',
        )
        .run(
          validatedData.name,
          validatedData.cpf,
          validatedData.phone,
          validatedData.monthly_salary,
          validatedData.truck_id || null,
        )
      return { id: r.lastInsertRowid }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })

  ipcMain.handle('drivers:update', (_e, id: number, data: any) => {
    try {
      const validatedId = idSchema.parse(id)
      const validatedData = driverSchema.parse(data)
      db()
        .prepare(
          'UPDATE drivers SET name=?, cpf=?, phone=?, monthly_salary=?, truck_id=? WHERE id=?',
        )
        .run(
          validatedData.name,
          validatedData.cpf,
          validatedData.phone,
          validatedData.monthly_salary,
          validatedData.truck_id || null,
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

  ipcMain.handle('drivers:delete', (_e, id: number) => {
    try {
      const validatedId = idSchema.parse(id)
      db().prepare('DELETE FROM drivers WHERE id = ?').run(validatedId)
      return { ok: true }
    } catch (error) {
      if (error instanceof ZodError) {
        return { ok: false, error: error.errors.map((e) => e.message).join(', ') }
      }
      return { ok: false, error: 'Ocorreu um erro inesperado.' }
    }
  })
}
