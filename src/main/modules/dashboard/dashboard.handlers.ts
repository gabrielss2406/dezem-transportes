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
    const allTrips = db()
      .prepare(
        `
  SELECT
    tr.id,
    tr.date,
    tr.truck_id,
    tr.route_id,
    tr.price_charged,
    tr.km_driven,
    r.name as route_name
  FROM trips tr
  LEFT JOIN routes r ON tr.route_id = r.id
  WHERE tr.date BETWEEN ? AND ?
`,
      )
      .all(startDate, endDate) as any[]

    const truckCosts = db()
      .prepare(
        `
  SELECT date, truck_id, value
  FROM costs
  WHERE date BETWEEN ? AND ? AND truck_id IS NOT NULL
`,
      )
      .all(startDate, endDate) as any[]

    const fuelCostsByTrip = db()
      .prepare(
        `
  SELECT fs.trip_id, SUM(fs.value) as total
  FROM trip_fuel_stops fs
  JOIN trips t ON fs.trip_id = t.id
  WHERE t.date BETWEEN ? AND ?
  GROUP BY fs.trip_id
`,
      )
      .all(startDate, endDate) as any[]

    const fuelCostPerTrip = new Map<number, number>(
      fuelCostsByTrip.map((r: any) => [r.trip_id, r.total]),
    )

    const costsByTruckAndDate = new Map<string, number>()
    for (const cost of truckCosts) {
      const key = `${cost.truck_id}-${cost.date}`
      const currentCost = Number(costsByTruckAndDate.get(key)) || 0
      costsByTruckAndDate.set(key, currentCost + (Number(cost.value) || 0))
    }

    const tripsByTruckAndDate = new Map<string, any[]>()
    const totalKmByTruckAndDate = new Map<string, number>()

    for (const trip of allTrips) {
      if (!trip.truck_id) {
        continue
      }
      const key = `${trip.truck_id}-${trip.date}`

      const trips = tripsByTruckAndDate.get(key) || []
      trips.push(trip)
      tripsByTruckAndDate.set(key, trips)

      const currentKm = totalKmByTruckAndDate.get(key) || 0
      totalKmByTruckAndDate.set(key, (Number(currentKm) || 0) + (Number(trip.km_driven) || 0))
    }

    const additionalCostPerTrip = new Map<number, number>()

    for (const [key, trips] of tripsByTruckAndDate.entries()) {
      const totalCost = costsByTruckAndDate.get(key)
      const totalKm = totalKmByTruckAndDate.get(key)

      if (totalCost && totalKm > 0) {
        for (const trip of trips) {
          const distributedCost =
            ((Number(trip.km_driven) || 0) / (Number(totalKm) || 1)) * (Number(totalCost) || 0)
          additionalCostPerTrip.set(trip.id, distributedCost)
        }
      }
    }

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
    const monthlyRevenueRaw = db()
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
      .all() as any[]

    // Fill missing months to ensure a continuous 6-month timeline
    const monthlyRevenue: Array<{ month: string; revenue: number }> = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const monthStr = `${year}-${month}`

      const found = monthlyRevenueRaw.find((r) => r.month === monthStr)
      monthlyRevenue.push({
        month: monthStr,
        revenue: Number(found?.revenue) || 0,
      })
    }

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

    const routeData = new Map<
      number,
      {
        name: string
        revenue: number
        fuel_cost: number
        cost: number
      }
    >()

    for (const trip of allTrips) {
      if (!trip.route_id) {
        continue
      }

      let data = routeData.get(trip.route_id)
      if (!data) {
        data = {
          name: trip.route_name || 'Rota Desconhecida',
          revenue: 0,
          fuel_cost: 0,
          cost: 0,
        }
        routeData.set(trip.route_id, data)
      }

      data.revenue += Number(trip.price_charged) || 0
      const fuelCost = Number(fuelCostPerTrip.get(trip.id)) || 0
      const additionalCost = Number(additionalCostPerTrip.get(trip.id)) || 0

      data.fuel_cost += fuelCost
      data.cost += fuelCost + additionalCost
    }

    const perRoute = Array.from(routeData.values()).sort((a, b) => b.revenue - a.revenue)

    const categoryTotals = new Map<string, number>()

    // 1. Costs from 'costs' table
    const directCategoryCosts = db()
      .prepare(
        `
      SELECT category, COALESCE(SUM(value), 0) as total
      FROM costs WHERE date BETWEEN ? AND ?
      GROUP BY category
    `,
      )
      .all(startDate, endDate) as any[]

    for (const c of directCategoryCosts) {
      categoryTotals.set(c.category, Number(c.total) || 0)
    }

    // 2. Costs from 'trip_fuel_stops' (Extra trip costs)
    const fuelStopCosts = db()
      .prepare(
        `
      SELECT s.type, SUM(fs.value) as total
      FROM trip_fuel_stops fs
      JOIN suppliers s ON fs.supplier_id = s.id
      JOIN trips t ON fs.trip_id = t.id
      WHERE t.date BETWEEN ? AND ?
      GROUP BY s.type
    `,
      )
      .all(startDate, endDate) as any[]

    for (const f of fuelStopCosts) {
      let cat = 'others'
      if (f.type === 'gas_station') {
        cat = 'fuel'
      } else if (f.type === 'workshop') {
        cat = 'maintenance'
      }

      const current = categoryTotals.get(cat) || 0
      categoryTotals.set(cat, current + (Number(f.total) || 0))
    }

    const categoryLabels: Record<string, string> = {
      fuel: 'Combustível',
      oil: 'Óleo',
      maintenance: 'Manutenção',
      salary: 'Salário',
      toll: 'Pedágio',
      others: 'Outros',
    }

    const perCategory = Array.from(categoryTotals.entries())
      .map(([category, total]) => ({
        category: categoryLabels[category] || category,
        total,
      }))
      .sort((a, b) => b.total - a.total)

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
