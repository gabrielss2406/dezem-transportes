import { ipcMain } from 'electron'
import { taxRateSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'

export function registerTaxRateHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('taxRates:list', () => {
    return db().prepare('SELECT * FROM tax_rates ORDER BY name').all()
  })

  createValidatedHandler('taxRates:create', taxRateSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO tax_rates (name, rate) VALUES (?, ?)')
      .run(data.name, data.rate)
    return { id: r.lastInsertRowid }
  })

  createValidatedHandlerWithId('taxRates:update', taxRateSchema, (id, data) => {
    db()
      .prepare('UPDATE tax_rates SET name = ?, rate = ? WHERE id = ?')
      .run(data.name, data.rate, id)
    return { ok: true }
  })

  createIdValidatedHandler('taxRates:delete', (id) => {
    const { count } = db()
      .prepare('SELECT COUNT(*) as count FROM customers WHERE tax_rate_id = ?')
      .get(id) as { count: number }
    if (count > 0) {
      return {
        ok: false,
        errors: {
          form: `Não é possível excluir: alíquota usada por ${count} cliente${count > 1 ? 's' : ''}.`,
        },
      }
    }
    db().prepare('DELETE FROM tax_rates WHERE id = ?').run(id)
    return { ok: true }
  })
}
