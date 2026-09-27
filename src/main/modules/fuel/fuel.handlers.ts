import { ipcMain } from 'electron'
import { fuelMarkPaidSchema, fuelRecordSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'
import {
  calculateOilMeasures,
  dateIsPast,
  ensureSupplierCustomer,
  getOilAccount,
  getOilBalance,
} from '../oil-credits/oil-credit.service'

function recalcTruckOdometer(truckId: number): void {
  const database = getDb()
  const row = database
    .prepare(
      'SELECT odometer_at_service FROM fuel_records WHERE truck_id = ? ORDER BY date DESC, id DESC LIMIT 1',
    )
    .get(truckId) as { odometer_at_service: number } | undefined
  if (row) {
    database
      .prepare('UPDATE trucks SET current_odometer = ? WHERE id = ?')
      .run(row.odometer_at_service, truckId)
  }
}

export function registerFuelHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('fuel:list', (_e, filters: any = {}) => {
    let query = `
      SELECT fr.*,
        t.license_plate as truck_license_plate,
        t.model as truck_model,
        s.name as supplier_name
      FROM fuel_records fr
      JOIN trucks t ON fr.truck_id = t.id
      LEFT JOIN suppliers s ON fr.supplier_id = s.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.truck_id) {
      query += ' AND fr.truck_id = ?'
      params.push(filters.truck_id)
    }
    if (filters.startDate) {
      query += ' AND fr.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND fr.date <= ?'
      params.push(filters.endDate)
    }
    query += ' ORDER BY fr.date DESC, fr.id DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler('fuel:create', fuelRecordSchema, (data) => {
    const duplicate = db()
      .prepare('SELECT id FROM fuel_records WHERE voucher_number = ?')
      .get(data.voucher_number)
    if (duplicate) {
      return { ok: false, errors: { voucher_number: 'Este vale já foi utilizado.' } }
    }
    const measures = calculateOilMeasures(data)
    if ('error' in measures) {
      return { ok: false, errors: { form: measures.error } }
    }
    let customerId: number | null = null
    if (data.fuel_mode === 'credit') {
      const relation = ensureSupplierCustomer(db(), data.supplier_id || 0)
      if ('error' in relation) {
        return { ok: false, errors: { supplier_id: relation.error } }
      }
      customerId = relation.customer_id
      const account = getOilAccount(db(), customerId, data.supplier_id as number)
      if (!account) {
        return {
          ok: false,
          errors: { form: 'Cadastre um crédito para este cliente e fornecedor antes do consumo.' },
        }
      }
      const balance = getOilBalance(db(), account.id)
      if (
        measures.amount > balance.amount + 0.000001 ||
        measures.liters > balance.liters + 0.000001
      ) {
        return {
          ok: false,
          errors: {
            form: `Saldo insuficiente. Disponível: R$ ${balance.amount.toFixed(2)} e ${balance.liters.toFixed(2)} litros.`,
          },
        }
      }
    } else if (!data.supplier_id) {
      return {
        ok: false,
        errors: { supplier_id: 'Fornecedor é obrigatório para abastecimento normal.' },
      }
    }

    const previous = db()
      .prepare(
        `SELECT odometer_at_service FROM fuel_records
         WHERE truck_id = ? AND date <= ?
         ORDER BY date DESC, id DESC LIMIT 1`,
      )
      .get(data.truck_id, data.date) as { odometer_at_service: number } | undefined

    if (previous && data.odometer_at_service <= previous.odometer_at_service) {
      return {
        ok: false,
        errors: {
          odometer_at_service: `Hodômetro deve ser maior que o registro anterior (${previous.odometer_at_service.toFixed(0)} km)`,
        },
      }
    }

    const next = db()
      .prepare(
        'SELECT odometer_at_service FROM fuel_records WHERE truck_id = ? AND date > ? ORDER BY date ASC, id ASC LIMIT 1',
      )
      .get(data.truck_id, data.date) as { odometer_at_service: number } | undefined

    if (next && data.odometer_at_service >= next.odometer_at_service) {
      return {
        ok: false,
        errors: {
          odometer_at_service: `Hodômetro deve ser menor que o próximo registro (${next.odometer_at_service.toFixed(0)} km) para manter a ordem cronológica`,
        },
      }
    }

    const r = db().transaction(() => {
      const result = db()
        .prepare(
          'INSERT INTO fuel_records (truck_id, date, liters, value, price_per_liter, odometer_at_service, supplier_id, notes, voucher_number, fuel_mode, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          data.truck_id,
          data.date,
          measures.liters,
          measures.amount,
          measures.price_per_liter,
          data.odometer_at_service,
          data.supplier_id || null,
          data.notes || null,
          data.voucher_number,
          data.fuel_mode,
          data.fuel_mode === 'normal' ? 'open' : null,
        )
      if (data.fuel_mode === 'credit') {
        const account = getOilAccount(db(), customerId as number, data.supplier_id as number)
        db()
          .prepare(
            `INSERT INTO oil_credit_movements (account_id, movement_type, amount, liters, price_per_liter, movement_date, fuel_record_id, description)
           VALUES (?, 'consumption', ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            account.id,
            measures.amount,
            measures.liters,
            measures.price_per_liter,
            data.date,
            result.lastInsertRowid,
            `Abastecimento ${data.voucher_number}`,
          )
      }
      return result
    })()

    recalcTruckOdometer(data.truck_id)
    const account =
      customerId && data.supplier_id ? getOilAccount(db(), customerId, data.supplier_id) : null
    return {
      id: r.lastInsertRowid,
      customer_id: customerId,
      alert:
        account && dateIsPast(account.due_date)
          ? 'O crédito está vencido, mas o consumo foi autorizado.'
          : undefined,
    }
  })

  createValidatedHandler('fuel:markPaid', fuelMarkPaidSchema, (data) => {
    const result = db()
      .prepare(
        "UPDATE fuel_records SET status = 'paid', paid_date = ? WHERE id = ? AND fuel_mode = 'normal' AND status = 'open'",
      )
      .run(data.paid_date, data.id)
    return { ok: true, updated: result.changes }
  })

  createIdValidatedHandler('fuel:delete', (id) => {
    const record = db().prepare('SELECT truck_id FROM fuel_records WHERE id = ?').get(id) as any
    const used = db().prepare('SELECT 1 FROM oil_settlement_items WHERE fuel_record_id = ?').get(id)
    if (used) {
      return { ok: false, errors: { form: 'Este abastecimento já participa de um fechamento.' } }
    }
    db().prepare('DELETE FROM fuel_records WHERE id = ?').run(id)
    if (record?.truck_id) {
      recalcTruckOdometer(record.truck_id)
    }
    return { ok: true }
  })
}
