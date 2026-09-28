import { ipcMain } from 'electron'
import { fuelRecordSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createIdValidatedHandler, createValidatedHandler } from '../../lib/utils'
import { consumeOilCredits, releaseOilCredits } from '../oil-credits/oil-credits.handlers'

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
    if (data.credit_mode === 'credit') {
      if (!data.credit_customer_id) {
        return { ok: false, errors: { credit_customer_id: 'Selecione o cliente do crédito.' } }
      }
      if (!data.voucher_number) {
        return { ok: false, errors: { voucher_number: 'Informe o número do vale.' } }
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

    const result = db().transaction(() => {
      const r = db()
        .prepare(
          `INSERT INTO fuel_records
            (truck_id, date, liters, value, gross_value, credit_value, credit_customer_id, voucher_number, odometer_at_service, supplier_id, notes)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        )
        .run(
          data.truck_id,
          data.date,
          data.liters || null,
          data.value,
          data.value,
          data.credit_mode === 'credit' ? data.credit_customer_id : null,
          data.credit_mode === 'credit' ? data.voucher_number : null,
          data.odometer_at_service,
          data.supplier_id || null,
          data.notes || null,
        )
      const fuelRecordId = Number(r.lastInsertRowid)
      const credit =
        data.credit_mode === 'credit'
          ? consumeOilCredits(db(), {
              customerId: data.credit_customer_id as number,
              fuelRecordId,
              usageDate: data.date,
              grossAmount: data.value,
              voucherNumber: data.voucher_number as string,
              allowExpired: data.allow_expired_credit === true,
            })
          : null
      return { fuelRecordId, credit }
    })()

    recalcTruckOdometer(data.truck_id)
    return { id: result.fuelRecordId, credit: result.credit }
  })

  createIdValidatedHandler('fuel:delete', (id) => {
    const record = db().prepare('SELECT truck_id FROM fuel_records WHERE id = ?').get(id) as any
    db().transaction(() => {
      releaseOilCredits(db(), id)
      db().prepare('DELETE FROM fuel_records WHERE id = ?').run(id)
    })()
    if (record?.truck_id) {
      recalcTruckOdometer(record.truck_id)
    }
    return { ok: true }
  })
}
