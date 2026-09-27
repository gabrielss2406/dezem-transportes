import { ipcMain } from 'electron'
import { oilAdjustmentSchema, oilCreditSchema, oilSettlementSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'
import {
  calculateOilMeasures,
  dateIsPast,
  ensureSupplierCustomer,
  getOilAccount,
  getOilBalance,
} from './oil-credit.service'

function accountView(database: ReturnType<typeof getDb>, customerId: number, supplierId?: number) {
  const params: number[] = [customerId]
  let where = 'a.customer_id = ?'
  if (supplierId) {
    where += ' AND a.supplier_id = ?'
    params.push(supplierId)
  }
  const account = database
    .prepare(`
    SELECT a.*, c.name customer_name, s.name supplier_name,
      COALESCE((SELECT SUM(CASE WHEN movement_type IN ('credit','adjustment') THEN amount ELSE -amount END) FROM oil_credit_movements m WHERE m.account_id = a.id), 0) amount,
      COALESCE((SELECT SUM(CASE WHEN movement_type IN ('credit','adjustment') THEN liters ELSE -liters END) FROM oil_credit_movements m WHERE m.account_id = a.id), 0) liters
    FROM oil_credit_accounts a JOIN customers c ON c.id = a.customer_id JOIN suppliers s ON s.id = a.supplier_id
    WHERE ${where}`)
    .get(...params) as any
  if (!account) {
    return null
  }
  account.expired = dateIsPast(account.due_date)
  return account
}

function validateAccount(
  database: ReturnType<typeof getDb>,
  customerId: number,
  supplierId: number,
) {
  const relation = ensureSupplierCustomer(database, supplierId, customerId)
  if ('error' in relation) {
    return relation
  }
  let account = getOilAccount(database, customerId, supplierId)
  if (!account) {
    const result = database
      .prepare('INSERT INTO oil_credit_accounts (customer_id, supplier_id) VALUES (?, ?)')
      .run(customerId, supplierId)
    account = getOilAccount(database, customerId, supplierId)
    account.id = result.lastInsertRowid
  }
  return { account }
}

function selectedFuelIds(database: ReturnType<typeof getDb>, data: any) {
  if (data.fuel_record_ids?.length) {
    return data.fuel_record_ids
  }
  return (
    database
      .prepare(`
    SELECT fr.id FROM fuel_records fr
    JOIN suppliers s ON s.id = fr.supplier_id
    WHERE fr.fuel_mode = 'credit' AND fr.supplier_id = ? AND s.customer_id = ?
      AND fr.date >= ? AND fr.date <= ?
      AND NOT EXISTS (SELECT 1 FROM oil_settlement_items i WHERE i.fuel_record_id = fr.id)
    ORDER BY fr.date, fr.id`)
      .all(data.supplier_id, data.customer_id, data.start_date, data.end_date) as { id: number }[]
  ).map((row) => row.id)
}

function settlementData(database: ReturnType<typeof getDb>, data: any, currentId?: number) {
  const relation = ensureSupplierCustomer(database, data.supplier_id, data.customer_id)
  if ('error' in relation) {
    return relation
  }
  if (data.start_date > data.end_date) {
    return { error: 'O período do fechamento é inválido.' }
  }
  const gross = (
    database
      .prepare(
        'SELECT COALESCE(SUM(price_charged), 0) gross FROM trips WHERE customer_id = ? AND date BETWEEN ? AND ?',
      )
      .get(data.customer_id, data.start_date, data.end_date) as any
  ).gross
  const ids = selectedFuelIds(database, data)
  const placeholders = ids.map(() => '?').join(',') || 'NULL'
  const fuels = database
    .prepare(`SELECT fr.* FROM fuel_records fr WHERE fr.id IN (${placeholders})`)
    .all(...ids) as any[]
  if (fuels.length !== ids.length) {
    return { error: 'Um ou mais abastecimentos não foram encontrados.' }
  }
  for (const fuel of fuels) {
    if (
      fuel.fuel_mode !== 'credit' ||
      fuel.supplier_id !== data.supplier_id ||
      fuel.date < data.start_date ||
      fuel.date > data.end_date
    ) {
      return {
        error:
          'Todos os abastecimentos devem ser de crédito, do fornecedor e do período selecionados.',
      }
    }
    const existing = database
      .prepare(
        'SELECT settlement_id FROM oil_settlement_items WHERE fuel_record_id = ? AND settlement_id != ?',
      )
      .get(fuel.id, currentId || 0) as any
    if (existing) {
      return { error: 'Um abastecimento já participa de outro fechamento ativo.' }
    }
  }
  const oil = fuels.reduce((sum, fuel) => sum + Number(fuel.value || 0), 0)
  const net = Number(gross || 0) - oil
  if (net < -0.000001) {
    return { error: 'O débito de óleo não pode superar o total de fretes.' }
  }
  return { gross: Number(gross || 0), oil, net: Math.max(0, net), ids, fuels }
}

export function registerOilCreditHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('oilCredits:listAccounts', () =>
    db()
      .prepare(`
    SELECT a.*, c.name customer_name, s.name supplier_name,
      COALESCE(SUM(CASE WHEN m.movement_type IN ('credit','adjustment') THEN m.amount ELSE -m.amount END), 0) amount,
      COALESCE(SUM(CASE WHEN m.movement_type IN ('credit','adjustment') THEN m.liters ELSE -m.liters END), 0) liters
    FROM oil_credit_accounts a JOIN customers c ON c.id = a.customer_id JOIN suppliers s ON s.id = a.supplier_id
    LEFT JOIN oil_credit_movements m ON m.account_id = a.id GROUP BY a.id ORDER BY c.name, s.name`)
      .all(),
  )

  ipcMain.handle('oilCredits:getAccount', (_event, customerId: number, supplierId?: number) => {
    const account = accountView(db(), customerId, supplierId)
    if (!account) {
      return null
    }
    return {
      ...account,
      movements: db()
        .prepare(
          'SELECT * FROM oil_credit_movements WHERE account_id = ? ORDER BY movement_date DESC, id DESC',
        )
        .all(account.id),
      pendingFuel: db()
        .prepare(
          "SELECT fr.*, t.license_plate truck_license_plate FROM fuel_records fr JOIN trucks t ON t.id = fr.truck_id WHERE fr.fuel_mode = 'credit' AND fr.supplier_id = ? AND NOT EXISTS (SELECT 1 FROM oil_settlement_items i WHERE i.fuel_record_id = fr.id) ORDER BY fr.date DESC, fr.id DESC",
        )
        .all(account.supplier_id),
    }
  })

  createValidatedHandler('oilCredits:addCredit', oilCreditSchema, (data) => {
    const measures = calculateOilMeasures(data)
    if ('error' in measures) {
      return { ok: false, errors: { form: measures.error } }
    }
    const valid = validateAccount(db(), data.customer_id, data.supplier_id)
    if ('error' in valid) {
      return { ok: false, errors: { supplier_id: valid.error } }
    }
    const result = db()
      .prepare(
        `INSERT INTO oil_credit_movements (account_id, movement_type, amount, liters, price_per_liter, movement_date, description) VALUES (?, 'credit', ?, ?, ?, ?, ?)`,
      )
      .run(
        valid.account.id,
        measures.amount,
        measures.liters,
        measures.price_per_liter,
        data.movement_date,
        data.description || null,
      )
    db()
      .prepare(
        "UPDATE oil_credit_accounts SET due_date = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(data.due_date, valid.account.id)
    return { id: result.lastInsertRowid, expired: dateIsPast(data.due_date) }
  })

  createValidatedHandler('oilCredits:adjust', oilAdjustmentSchema, (data) => {
    const measures = calculateOilMeasures(data)
    if ('error' in measures) {
      return { ok: false, errors: { form: measures.error } }
    }
    const valid = validateAccount(db(), data.customer_id, data.supplier_id)
    if ('error' in valid) {
      return { ok: false, errors: { supplier_id: valid.error } }
    }
    const balance = getOilBalance(db(), valid.account.id)
    if (
      balance.amount + measures.amount < -0.000001 ||
      balance.liters + measures.liters < -0.000001
    ) {
      return { ok: false, errors: { form: 'O ajuste deixaria o saldo negativo.' } }
    }
    const result = db()
      .prepare(
        `INSERT INTO oil_credit_movements (account_id, movement_type, amount, liters, price_per_liter, movement_date, description) VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`,
      )
      .run(
        valid.account.id,
        measures.amount,
        measures.liters,
        measures.price_per_liter,
        data.movement_date,
        data.description || null,
      )
    db()
      .prepare(
        "UPDATE oil_credit_accounts SET due_date = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(data.due_date, valid.account.id)
    return { id: result.lastInsertRowid }
  })

  const createSettlement = (data: any) => {
    const calculated = settlementData(db(), data)
    if ('error' in calculated) {
      return { ok: false, errors: { form: calculated.error } }
    }
    const created = db().transaction(() => {
      const settlement = db()
        .prepare(
          'INSERT INTO oil_settlements (customer_id, supplier_id, start_date, end_date, due_date, gross_freight, oil_debit, net_amount) VALUES (?,?,?,?,?,?,?,?)',
        )
        .run(
          data.customer_id,
          data.supplier_id,
          data.start_date,
          data.end_date,
          data.due_date,
          calculated.gross,
          calculated.oil,
          calculated.net,
        )
      const receivable = db()
        .prepare(
          "INSERT INTO receivables (customer_id, amount, status, due_date, description, kind, settlement_id) VALUES (?, ?, 'open', ?, ?, 'revenue', ?)",
        )
        .run(
          data.customer_id,
          calculated.net,
          data.due_date,
          `Fechamento de óleo — ${data.start_date} a ${data.end_date}`,
          settlement.lastInsertRowid,
        )
      db()
        .prepare('UPDATE oil_settlements SET receivable_id = ? WHERE id = ?')
        .run(receivable.lastInsertRowid, settlement.lastInsertRowid)
      const item = db().prepare(
        'INSERT INTO oil_settlement_items (settlement_id, fuel_record_id, voucher_number, liters, price_per_liter, amount) SELECT ?, id, voucher_number, liters, price_per_liter, value FROM fuel_records WHERE id = ?',
      )
      for (const id of calculated.ids) {
        item.run(settlement.lastInsertRowid, id)
      }
      db()
        .prepare(
          'UPDATE receivables SET consolidated_into_id = ? WHERE trip_id IN (SELECT id FROM trips WHERE customer_id = ? AND date BETWEEN ? AND ?) AND id != ?',
        )
        .run(
          receivable.lastInsertRowid,
          data.customer_id,
          data.start_date,
          data.end_date,
          receivable.lastInsertRowid,
        )
      return settlement.lastInsertRowid
    })()
    return { id: created }
  }
  createValidatedHandler('oilCredits:createSettlement', oilSettlementSchema, createSettlement)

  createValidatedHandlerWithId('oilCredits:updateSettlement', oilSettlementSchema, (id, data) => {
    const existing = db().prepare('SELECT * FROM oil_settlements WHERE id = ?').get(id) as any
    if (!existing) {
      return { ok: false, errors: { form: 'Fechamento não encontrado.' } }
    }
    if (existing.status !== 'open') {
      return { ok: false, errors: { form: 'Somente fechamentos abertos podem ser editados.' } }
    }
    const calculated = settlementData(db(), data, id)
    if ('error' in calculated) {
      return { ok: false, errors: { form: calculated.error } }
    }
    db().transaction(() => {
      const receivable = db()
        .prepare('SELECT receivable_id FROM oil_settlements WHERE id = ?')
        .get(id) as any
      db()
        .prepare(
          'UPDATE receivables SET consolidated_into_id = NULL WHERE consolidated_into_id = ?',
        )
        .run(receivable.receivable_id)
      db().prepare('DELETE FROM oil_settlement_items WHERE settlement_id = ?').run(id)
      db()
        .prepare(
          "UPDATE oil_settlements SET customer_id=?, supplier_id=?, start_date=?, end_date=?, due_date=?, gross_freight=?, oil_debit=?, net_amount=?, updated_at=datetime('now') WHERE id=?",
        )
        .run(
          data.customer_id,
          data.supplier_id,
          data.start_date,
          data.end_date,
          data.due_date,
          calculated.gross,
          calculated.oil,
          calculated.net,
          id,
        )
      db()
        .prepare(
          'UPDATE receivables SET customer_id=?, amount=?, due_date=?, description=? WHERE id=?',
        )
        .run(
          data.customer_id,
          calculated.net,
          data.due_date,
          `Fechamento de óleo — ${data.start_date} a ${data.end_date}`,
          receivable.receivable_id,
        )
      const item = db().prepare(
        'INSERT INTO oil_settlement_items (settlement_id, fuel_record_id, voucher_number, liters, price_per_liter, amount) SELECT ?, id, voucher_number, liters, price_per_liter, value FROM fuel_records WHERE id = ?',
      )
      for (const fuelId of calculated.ids) {
        item.run(id, fuelId)
      }
      db()
        .prepare(
          'UPDATE receivables SET consolidated_into_id = ? WHERE trip_id IN (SELECT id FROM trips WHERE customer_id = ? AND date BETWEEN ? AND ?) AND id != ?',
        )
        .run(
          receivable.receivable_id,
          data.customer_id,
          data.start_date,
          data.end_date,
          receivable.receivable_id,
        )
    })()
    return { ok: true }
  })

  ipcMain.handle('oilCredits:listSettlements', (_event, filters: any = {}) => {
    let query =
      'SELECT os.*, c.name customer_name, s.name supplier_name FROM oil_settlements os JOIN customers c ON c.id=os.customer_id JOIN suppliers s ON s.id=os.supplier_id WHERE 1=1'
    const params: any[] = []
    if (filters.customer_id) {
      query += ' AND os.customer_id = ?'
      params.push(filters.customer_id)
    }
    if (filters.status) {
      query += ' AND os.status = ?'
      params.push(filters.status)
    }
    query += ' ORDER BY os.end_date DESC, os.id DESC'
    return db()
      .prepare(query)
      .all(...params)
  })
  createIdValidatedHandler('oilCredits:getSettlement', (id) => {
    const settlement = db()
      .prepare(
        'SELECT os.*, c.name customer_name, s.name supplier_name FROM oil_settlements os JOIN customers c ON c.id=os.customer_id JOIN suppliers s ON s.id=os.supplier_id WHERE os.id=?',
      )
      .get(id) as any
    if (!settlement) {
      return { ok: false, errors: { form: 'Fechamento não encontrado.' } }
    }
    return {
      ...settlement,
      items: db()
        .prepare('SELECT * FROM oil_settlement_items WHERE settlement_id = ? ORDER BY id')
        .all(id),
    }
  })
  createIdValidatedHandler('oilCredits:exportData', (id) => {
    const settlement = db().prepare('SELECT * FROM oil_settlements WHERE id = ?').get(id) as any
    if (!settlement) {
      return { ok: false, errors: { form: 'Fechamento não encontrado.' } }
    }
    return {
      settlement,
      items: db()
        .prepare('SELECT * FROM oil_settlement_items WHERE settlement_id = ? ORDER BY id')
        .all(id),
    }
  })
}
