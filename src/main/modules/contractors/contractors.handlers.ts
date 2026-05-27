import { ipcMain } from 'electron'
import { contractorSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerContractorHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('contractors:list', (_e, filters: any = {}) => {
    let query = 'SELECT * FROM contractors WHERE 1=1'
    const params: any[] = []

    if (filters.name) {
      query += ' AND name LIKE ?'
      params.push(`%${filters.name}%`)
    }

    query += ' ORDER BY name'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('contractors:create', contractorSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO contractors (name, cnpj, phone) VALUES (?,?,?)')
      .run(data.name, data.cnpj || null, data.phone || null)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('contractors:update', contractorSchema, (id, data) => {
    const result = db()
      .prepare('UPDATE contractors SET name=?, cnpj=?, phone=? WHERE id=?')
      .run(data.name, data.cnpj || null, data.phone || null, id)

    if (result.changes === 0) {
      throw new Error(`Terceirizado com ID ${id} não encontrado.`)
    }
    return { ok: true }
  })

  createIdValidatedHandler('contractors:delete', (id) => {
    const driversCount = (
      db().prepare('SELECT COUNT(*) as c FROM drivers WHERE contractor_id = ?').get(id) as any
    ).c
    if (driversCount > 0) {
      return { ok: false, error: 'Este terceirizado possui motoristas vinculados.' }
    }

    const trucksCount = (
      db().prepare('SELECT COUNT(*) as c FROM trucks WHERE contractor_id = ?').get(id) as any
    ).c
    if (trucksCount > 0) {
      return { ok: false, error: 'Este terceirizado possui caminhões vinculados.' }
    }

    db().prepare('DELETE FROM contractors WHERE id = ?').run(id)
    return { ok: true }
  })
}
