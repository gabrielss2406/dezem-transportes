import { ipcMain } from 'electron'
import { tripSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import {
  createIdValidatedHandler,
  createValidatedHandler,
  createValidatedHandlerWithId,
} from '../../lib/utils'
import { getAppSettings } from '../settings/app-settings'

export function registerTripHandlers(): void {
  const db = () => getDb()

  // Effective commission rate: driver-specific override if configured, otherwise the global default.
  const getEffectiveCommissionRate = (driverId: number): number => {
    const driver = db()
      .prepare('SELECT commission_rate_override FROM drivers WHERE id = ?')
      .get(driverId) as { commission_rate_override: number | null } | undefined
    return driver?.commission_rate_override ?? getAppSettings().commissionRate
  }

  // Ticket numbers must be unique across trips. When editing, the current record is
  // excluded so a trip can keep its own ticket number unchanged.
  const isTicketNumberTaken = (ticketNumber: string, excludeId?: number): boolean => {
    const row = excludeId
      ? db()
          .prepare('SELECT id FROM trips WHERE ticket_number = ? AND id != ?')
          .get(ticketNumber, excludeId)
      : db().prepare('SELECT id FROM trips WHERE ticket_number = ?').get(ticketNumber)
    return !!row
  }

  ipcMain.handle('trips:list', (_e, filters: any = {}) => {
    let query = `
      SELECT t.*,
        tr.license_plate as truck_license_plate, tr.model as truck_model,
        d.name           as driver_name,
        p.name           as product_name,
        c.name           as customer_name,
        (SELECT COUNT(*) FROM trip_fuel_stops WHERE trip_id = t.id) as fuel_stops_count
      FROM trips t
      JOIN trucks tr ON t.truck_id = tr.id
      JOIN drivers d ON t.driver_id = d.id
      JOIN products p ON t.product_id = p.id
      LEFT JOIN customers c ON t.customer_id = c.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.startDate) {
      query += ' AND t.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND t.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.truck_id) {
      query += ' AND t.truck_id = ?'
      params.push(filters.truck_id)
    }
    if (filters.driver_id) {
      query += ' AND t.driver_id = ?'
      params.push(filters.driver_id)
    }
    if (filters.product_id) {
      query += ' AND t.product_id = ?'
      params.push(filters.product_id)
    }
    if (filters.customer_id) {
      query += ' AND t.customer_id = ?'
      params.push(filters.customer_id)
    }
    if (filters.ticket_number) {
      query += ' AND t.ticket_number LIKE ?'
      params.push(`%${filters.ticket_number}%`)
    }
    query += ' ORDER BY t.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  ipcMain.handle('trips:getFuelStops', (_e, tripId: number) => {
    const sql = `
      SELECT fs.*, s.name as supplier_name
      FROM trip_fuel_stops fs
      JOIN suppliers s ON fs.supplier_id = s.id
      WHERE fs.trip_id = ?
      ORDER BY fs.id ASC
    `
    return db().prepare(sql).all(tripId)
  })

  createValidatedHandler('trips:create', tripSchema, (data) => {
    const { fuel_stops, ...tripData } = data
    if (isTicketNumberTaken((tripData as any).ticket_number)) {
      return {
        ok: false,
        errors: { ticket_number: 'Já existe um lançamento com este número de bilhete.' },
      }
    }
    const hasTax = !!(tripData as any).has_percentage_tax
    const taxValue = hasTax ? (tripData.price_charged * getAppSettings().taxRate) / 100 : 0
    const hasCommission = !!(tripData as any).has_commission
    const commissionValue = hasCommission
      ? (tripData.price_charged * getEffectiveCommissionRate(tripData.driver_id)) / 100
      : 0
    const r = db().transaction(() => {
      const res = db()
        .prepare(
          `
        INSERT INTO trips (date, truck_id, driver_id, product_id, customer_id, supplier_id, weight_ton, overweight_ton, overweight_observation, price_charged, km_driven, observation, ticket_number, has_percentage_tax, tax_value, has_commission, commission_value)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
        )
        .run(
          tripData.date,
          tripData.truck_id,
          tripData.driver_id,
          tripData.product_id,
          tripData.customer_id || null,
          tripData.supplier_id || null,
          tripData.weight_ton,
          (tripData as any).overweight_ton || null,
          (tripData as any).overweight_observation || null,
          tripData.price_charged,
          tripData.km_driven,
          tripData.observation || null,
          (tripData as any).ticket_number,
          hasTax ? 1 : 0,
          taxValue,
          hasCommission ? 1 : 0,
          commissionValue,
        )

      const tripId = res.lastInsertRowid

      if (fuel_stops && fuel_stops.length > 0) {
        const insertStop = db().prepare(
          'INSERT INTO trip_fuel_stops (trip_id, supplier_id, value, liters, km_driven) VALUES (?, ?, ?, ?, ?)',
        )
        for (const stop of fuel_stops) {
          insertStop.run(tripId, stop.supplier_id, stop.value, stop.liters, stop.km_driven)
        }
      }

      return res
    })()
    return { id: (r as any).lastInsertRowid }
  })

  createValidatedHandlerWithId('trips:update', tripSchema, (id, data) => {
    const { fuel_stops, ...tripData } = data
    if (isTicketNumberTaken((tripData as any).ticket_number, id)) {
      return {
        ok: false,
        errors: { ticket_number: 'Já existe um lançamento com este número de bilhete.' },
      }
    }
    const hasTax = !!(tripData as any).has_percentage_tax
    const taxValue = hasTax ? (tripData.price_charged * getAppSettings().taxRate) / 100 : 0
    const hasCommission = !!(tripData as any).has_commission
    const commissionValue = hasCommission
      ? (tripData.price_charged * getEffectiveCommissionRate(tripData.driver_id)) / 100
      : 0
    db().transaction(() => {
      db()
        .prepare(
          `UPDATE trips SET date=?, truck_id=?, driver_id=?, product_id=?, customer_id=?,
            supplier_id=?, weight_ton=?, overweight_ton=?, overweight_observation=?, price_charged=?, km_driven=?, observation=?, ticket_number=?, has_percentage_tax=?, tax_value=?, has_commission=?, commission_value=?
          WHERE id=?`,
        )
        .run(
          tripData.date,
          tripData.truck_id,
          tripData.driver_id,
          tripData.product_id,
          tripData.customer_id || null,
          tripData.supplier_id || null,
          tripData.weight_ton,
          (tripData as any).overweight_ton || null,
          (tripData as any).overweight_observation || null,
          tripData.price_charged,
          tripData.km_driven,
          tripData.observation || null,
          (tripData as any).ticket_number,
          hasTax ? 1 : 0,
          taxValue,
          hasCommission ? 1 : 0,
          commissionValue,
          id,
        )

      // The trip entry form no longer manages fuel stops (handled by the Cost Records
      // module), so it never sends `fuel_stops`. Only touch existing stops when a
      // caller explicitly provides the field, to avoid wiping historical records.
      if (fuel_stops !== undefined) {
        db().prepare('DELETE FROM trip_fuel_stops WHERE trip_id = ?').run(id)
        if (fuel_stops.length > 0) {
          const insertStop = db().prepare(
            'INSERT INTO trip_fuel_stops (trip_id, supplier_id, value, liters, km_driven) VALUES (?, ?, ?, ?, ?)',
          )
          for (const stop of fuel_stops) {
            insertStop.run(id, stop.supplier_id, stop.value, stop.liters, stop.km_driven)
          }
        }
      }
    })()
    return { ok: true }
  })

  createIdValidatedHandler('trips:delete', (id) => {
    db().prepare('DELETE FROM trips WHERE id = ?').run(id)
    return { ok: true }
  })
}
