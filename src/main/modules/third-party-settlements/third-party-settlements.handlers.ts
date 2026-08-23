import { ipcMain } from 'electron'
import { thirdPartySettlementsMarkSettledSchema } from '../../../shared/schemas'
import { getDb } from '../../database'
import { createValidatedHandler } from '../../lib/utils'

export function registerThirdPartySettlementsHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('third-party-settlements:list', (_e, filters: any = {}) => {
    let query = `
      SELECT s.*,
        t.ticket_number as trip_ticket_number,
        t.date          as trip_date,
        cu.name         as customer_name,
        co.name         as contractor_name
      FROM third_party_settlements s
      JOIN trips t ON s.trip_id = t.id
      JOIN contractors co ON s.contractor_id = co.id
      LEFT JOIN customers cu ON t.customer_id = cu.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.contractor_id) {
      query += ' AND s.contractor_id = ?'
      params.push(filters.contractor_id)
    }
    if (filters.status) {
      query += ' AND s.status = ?'
      params.push(filters.status)
    }
    if (filters.startDate) {
      query += ' AND t.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND t.date <= ?'
      params.push(filters.endDate)
    }
    query += ' ORDER BY t.date ASC'
    return db()
      .prepare(query)
      .all(...params)
  })

  createValidatedHandler(
    'third-party-settlements:markSettled',
    thirdPartySettlementsMarkSettledSchema,
    (data) => {
      const placeholders = data.ids.map(() => '?').join(',')
      const r = db()
        .prepare(
          `UPDATE third_party_settlements SET status = 'settled', settled_date = ? WHERE status = 'pending' AND id IN (${placeholders})`,
        )
        .run(data.settled_date, ...data.ids)
      return { ok: true, updated: r.changes }
    },
  )
}
