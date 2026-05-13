import { ipcMain } from 'electron'
import { getDb } from '../../database'

export function registerDashboardHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('dashboard:summary', (_e, startDate: string, endDate: string) => {
    // 1. Total Revenue
    const revenue = (
      db()
        .prepare(
          `
      SELECT COALESCE(SUM(price_charged), 0) as total FROM trips WHERE date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).total

    // 2. Total Costs (costs table + fuel stops)
    const directCosts = (
      db()
        .prepare(
          `
      SELECT COALESCE(SUM(value), 0) as total FROM costs WHERE date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).total

    const fuelCosts = (
      db()
        .prepare(
          `
      SELECT COALESCE(SUM(fs.value), 0) as total 
      FROM trip_fuel_stops fs
      JOIN trips t ON fs.trip_id = t.id
      WHERE t.date BETWEEN ? AND ?
    `,
        )
        .get(startDate, endDate) as any
    ).total

    const totalCost = directCosts + fuelCosts

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

    // 3. Profitability and CPK per Truck
    const perTruck = db()
      .prepare(
        `
      SELECT 
        t.license_plate, 
        t.model,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        COALESCE(SUM(tr.km_driven), 0) as km,
        (
          SELECT COALESCE(SUM(c.value), 0) 
          FROM costs c 
          WHERE c.truck_id = t.id AND c.date BETWEEN ? AND ?
        ) + (
          SELECT COALESCE(SUM(fs.value), 0)
          FROM trip_fuel_stops fs
          JOIN trips tr2 ON fs.trip_id = tr2.id
          WHERE tr2.truck_id = t.id AND tr2.date BETWEEN ? AND ?
        ) as cost
      FROM trucks t
      LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.date BETWEEN ? AND ?
      GROUP BY t.id
      ORDER BY revenue DESC
    `,
      )
      .all(startDate, endDate, startDate, endDate, startDate, endDate) as any[]

    const trucksWithMetrics = perTruck.map((t) => ({
      ...t,
      profit: t.revenue - t.cost,
      cpk: t.km > 0 ? t.cost / t.km : 0,
    }))

    // 4. Monthly Revenue (Last 6 months)
    const monthlyRevenue = db()
      .prepare(
        `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(price_charged) as revenue
      FROM trips
      WHERE date >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `,
      )
      .all()

    // 5. Maintenance Alerts
    // Logic: Trucks that haven't had 'maintenance' cost category in the last 10,000km
    const maintenanceAlerts = db()
      .prepare(
        `
      SELECT 
        t.license_plate,
        t.current_odometer,
        MAX(c.date) as last_maintenance_date,
        COALESCE((
          SELECT SUM(tr.km_driven)
          FROM trips tr
          WHERE tr.truck_id = t.id 
          AND tr.date > COALESCE(MAX(c.date), '1900-01-01')
        ), 0) as km_since_last_maintenance
      FROM trucks t
      LEFT JOIN costs c ON c.truck_id = t.id AND c.category = 'maintenance'
      GROUP BY t.id
    `,
      )
      .all() as any[]

    const maintenanceAlertsFormatted = maintenanceAlerts.map((m) => ({
      license_plate: m.license_plate,
      current_odometer: m.current_odometer,
      last_maintenance_date: m.last_maintenance_date,
      km_since_last_maintenance: m.km_since_last_maintenance,
    }))

    // 6. Route Profitability
    const perRoute = db()
      .prepare(
        `
      SELECT 
        r.name,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        (
          SELECT COALESCE(SUM(fs.value), 0)
          FROM trip_fuel_stops fs
          JOIN trips tr2 ON fs.trip_id = tr2.id
          WHERE tr2.route_id = r.id AND tr2.date BETWEEN ? AND ?
        ) as fuel_cost
      FROM routes r
      LEFT JOIN trips tr ON tr.route_id = r.id AND tr.date BETWEEN ? AND ?
      GROUP BY r.id
      HAVING revenue > 0
      ORDER BY revenue DESC
    `,
      )
      .all(startDate, endDate, startDate, endDate)

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
      cost: totalCost,
      profit: revenue - totalCost,
      totalTrips,
      totalKm,
      perTruck: trucksWithMetrics,
      monthlyRevenue,
      maintenanceAlerts: maintenanceAlertsFormatted,
      perRoute,
      perCategory,
    }
  })
}
