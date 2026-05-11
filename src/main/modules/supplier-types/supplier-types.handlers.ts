import { ipcMain } from 'electron'
import { z } from 'zod'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'

const supplierTypeSchema = z.object({
  value: z.string().min(1, 'O valor não pode ser vazio.'),
  label: z.string().min(1, 'O rótulo não pode ser vazio.'),
})

export function registerSupplierTypesHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('supplier-types:list', () => {
    return db().prepare('SELECT * FROM supplier_types ORDER BY is_deletable ASC, label ASC').all()
  })

  createValidatedHandler('supplier-types:create', supplierTypeSchema, (data) => {
    const r = db()
      .prepare('INSERT INTO supplier_types (value, label, is_deletable) VALUES (?, ?, 1)')
      .run(data.value, data.label)
    return { id: r.lastInsertRowid }
  })

  createIdValidatedHandler('supplier-types:delete', (id) => {
    // Check if the type is deletable
    const type = db().prepare('SELECT is_deletable FROM supplier_types WHERE id = ?').get(id) as {
      is_deletable: number
    }
    if (type && type.is_deletable === 0) {
      return { ok: false, error: 'Este tipo padrão não pode ser excluído.' }
    }

    // Check if any supplier is using this type
    const usage = db()
      .prepare(
        'SELECT COUNT(*) as c FROM suppliers WHERE type = (SELECT value FROM supplier_types WHERE id = ?)',
      )
      .get(id) as { c: number }

    if (usage.c > 0) {
      return { ok: false, error: 'Este tipo está em uso e não pode ser excluído.' }
    }

    db().prepare('DELETE FROM supplier_types WHERE id = ?').run(id)
    return { ok: true }
  })
}
