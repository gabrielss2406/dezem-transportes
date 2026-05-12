import { ipcMain } from 'electron'
import { z } from 'zod'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'

const costCategorySchema = z.object({
  value: z.string().min(1, 'O valor não pode ser vazio.'),
  label: z.string().min(1, 'O rótulo não pode ser vazio.'),
})

export function registerCostCategoryHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('cost-categories:list', () => {
    return db().prepare('SELECT * FROM cost_categories ORDER BY is_deletable ASC, label ASC').all()
  })

  createValidatedHandler('cost-categories:create', costCategorySchema, (data) => {
    const r = db()
      .prepare('INSERT INTO cost_categories (value, label, is_deletable) VALUES (?, ?, 1)')
      .run(data.value, data.label)
    return { id: r.lastInsertRowid }
  })

  createIdValidatedHandler('cost-categories:delete', (id) => {
    // Check if the type is deletable
    const type = db().prepare('SELECT is_deletable FROM cost_categories WHERE id = ?').get(id) as {
      is_deletable: number
    }
    if (type && type.is_deletable === 0) {
      return { ok: false, error: 'Esta categoria padrão não pode ser excluída.' }
    }

    // Check if any cost is using this category
    const usage = db()
      .prepare(
        'SELECT COUNT(*) as c FROM costs WHERE category = (SELECT value FROM cost_categories WHERE id = ?)',
      )
      .get(id) as { c: number }

    if (usage.c > 0) {
      return { ok: false, error: 'Esta categoria está em uso e não pode ser excluída.' }
    }

    db().prepare('DELETE FROM cost_categories WHERE id = ?').run(id)
    return { ok: true }
  })
}
