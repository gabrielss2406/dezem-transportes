import { ipcMain } from 'electron'
import { getDb } from '../../database'

export function registerDashboardHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('dashboard:summary', (_e, startDate: string, endDate: string) => {
    const revenue = (
      db()
        .prepare(
          `
      SELECT COALESCE(SUM(price_charged), 0) as total FROM trips WHERE date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).total

    const cost = (
      db()
        .prepare(
          `
      SELECT COALESCE(SUM(value), 0) as total FROM costs WHERE date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).total

    const totalTrips = (
      db()
        .prepare(
          `
      SELECT COUNT(*) as c FROM trips WHERE date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).c

    const totalKm = (
      db()
        .prepare(
          `
      SELECT COALESCE(SUM(km_driven), 0) as total FROM trips WHERE date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).total

    const perTruck = db()
      .prepare(
        `
      SELECT t.license_plate, t.model,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        COALESCE(SUM(tr.km_driven), 0) as km
      FROM trucks t
      LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.date BETWEEN ? AND ?
      GROUP BY t.id
      ORDER BY revenue DESC
    `,
      )
      .all(startDate, endDate)

    const perProduct = db()
      .prepare(
        `
      SELECT p.name,
        COALESCE(SUM(t.weight_ton), 0) as tonnage,
        COUNT(t.id) as trips
      FROM products p
      LEFT JOIN trips t ON t.product_id = p.id AND t.date BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY tonnage DESC
    `,
      )
      .all(startDate, endDate)

    const perCategory = db()
      .prepare(
        `
      SELECT category, COALESCE(SUM(value), 0) as total
      FROM costs WHERE date BETWEEN ? AND ?
      GROUP BY category ORDER BY total DESC
    `,
      )
      .all(startDate, endDate)

    return {
      revenue,
      cost,
      profit: revenue - cost,
      totalTrips,
      totalKm,
      perTruck,
      perProduct,
      perCategory,
    }
  })
}
