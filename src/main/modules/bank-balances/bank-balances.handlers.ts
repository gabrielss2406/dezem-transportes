import { ipcMain } from 'electron'
import { bankBalanceSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createValidatedHandler } from '../../lib/utils'

const SELECT_FIELDS = 'month, balance, created_at, updated_at'

export function registerBankBalanceHandlers(): void {
  const db = () => getDb()

  // Full history, most recent month first. Months the user never informed have no row
  // at all — the caller shows them as "não informado" instead of filling a value in.
  ipcMain.handle('bank-balances:list', () => {
    return db().prepare(`SELECT ${SELECT_FIELDS} FROM bank_balances ORDER BY month DESC`).all()
  })

  ipcMain.handle('bank-balances:get', (_e, month: string) => {
    return (
      db().prepare(`SELECT ${SELECT_FIELDS} FROM bank_balances WHERE month = ?`).get(month) ?? null
    )
  })

  // Recording and editing are the same upsert, and it touches exactly one month: the
  // bank balance is a manual snapshot, so no other month is read, recalculated or
  // rewritten here. created_at keeps the original registration date on an edit.
  createValidatedHandler('bank-balances:set', bankBalanceSchema, (data) => {
    db()
      .prepare(
        `INSERT INTO bank_balances (month, balance) VALUES (?, ?)
         ON CONFLICT(month) DO UPDATE SET
           balance    = excluded.balance,
           updated_at = datetime('now', 'localtime')`,
      )
      .run(data.month, data.balance)
    return { ok: true }
  })
}
