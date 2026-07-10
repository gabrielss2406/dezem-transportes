import { ipcMain } from 'electron'
import { getDb } from '../../database'
import { getMaintenanceStatus } from '../maintenance/maintenance.handlers'

export function registerDashboardHandlers(): void {
  const db = () => getDb()

  ipcMain.handle('dashboard:summary', (_e, startDate: string, endDate: string) => {
    // All financial queries filter out trips/costs linked to outsourced trucks or drivers.
    const INTERNAL_TRUCK = '(t.is_outsourced = 0 OR t.is_outsourced IS NULL)'
    const INTERNAL_DRIVER = '(d.is_outsourced = 0 OR d.is_outsourced IS NULL)'

    // 1. Total Revenue — trips with internal trucks only
    const revenue = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(tr.price_charged), 0) as total
        FROM trips tr
        JOIN trucks t ON tr.truck_id = t.id
        JOIN drivers d ON tr.driver_id = d.id
        WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      `,
        )
        .get(startDate, endDate) as any
    ).total

    const allTrips = db()
      .prepare(
        `
      SELECT tr.id, tr.date, tr.truck_id, tr.price_charged, tr.km_driven
      FROM trips tr
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
    `,
      )
      .all(startDate, endDate) as any[]

    // Costs linked to internal trucks only
    const truckCosts = db()
      .prepare(
        `
      SELECT c.date, c.truck_id, c.value
      FROM costs c
      JOIN trucks t ON c.truck_id = t.id
      WHERE c.date BETWEEN ? AND ? AND c.truck_id IS NOT NULL AND ${INTERNAL_TRUCK}
    `,
      )
      .all(startDate, endDate) as any[]

    // Fuel stops for internal-truck trips only
    const fuelCostsByTrip = db()
      .prepare(
        `
      SELECT fs.trip_id, SUM(fs.value) as total
      FROM trip_fuel_stops fs
      JOIN trips tr ON fs.trip_id = tr.id
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
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

    // 2. Total Costs — exclude outsourced trucks and outsourced driver salaries
    const directCosts = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(c.value), 0) as total
        FROM costs c
        LEFT JOIN trucks t ON c.truck_id = t.id
        LEFT JOIN drivers d ON c.driver_id = d.id
        WHERE c.date BETWEEN ? AND ?
          AND (c.truck_id IS NULL OR ${INTERNAL_TRUCK})
          AND (c.driver_id IS NULL OR ${INTERNAL_DRIVER})
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
        JOIN trips tr ON fs.trip_id = tr.id
        JOIN trucks t ON tr.truck_id = t.id
        JOIN drivers d ON tr.driver_id = d.id
        WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      `,
        )
        .get(startDate, endDate) as any
    ).total

    const commissionCost = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(tr.commission_value), 0) as total
        FROM trips tr
        JOIN trucks t ON tr.truck_id = t.id
        JOIN drivers d ON tr.driver_id = d.id
        WHERE tr.date BETWEEN ? AND ? AND tr.has_commission = 1 AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      `,
        )
        .get(startDate, endDate) as any
    ).total

    const fuelRecordsCost = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(fr.value), 0) as total
        FROM fuel_records fr
        JOIN trucks t ON fr.truck_id = t.id
        WHERE fr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK}
      `,
        )
        .get(startDate, endDate) as any
    ).total

    const totalTax = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(tr.tax_value), 0) as total
        FROM trips tr
        JOIN trucks t ON tr.truck_id = t.id
        JOIN drivers d ON tr.driver_id = d.id
        WHERE tr.date BETWEEN ? AND ? AND tr.has_percentage_tax = 1 AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      `,
        )
        .get(startDate, endDate) as any
    ).total

    const totalCost = directCosts + fuelCosts + commissionCost + fuelRecordsCost

    const totalTrips = (
      db()
        .prepare(
          `
        SELECT COUNT(*) as c
        FROM trips tr
        JOIN trucks t ON tr.truck_id = t.id
        JOIN drivers d ON tr.driver_id = d.id
        WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      `,
        )
        .get(startDate, endDate) as any
    ).c

    const totalKm = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(tr.km_driven), 0) as total
        FROM trips tr
        JOIN trucks t ON tr.truck_id = t.id
        JOIN drivers d ON tr.driver_id = d.id
        WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      `,
        )
        .get(startDate, endDate) as any
    ).total

    // 3. Profitability and CPK per internal Truck
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
        ) + (
          SELECT COALESCE(SUM(tr3.commission_value), 0)
          FROM trips tr3
          JOIN drivers d3 ON tr3.driver_id = d3.id
          WHERE tr3.truck_id = t.id AND tr3.has_commission = 1 AND tr3.date BETWEEN ? AND ?
            AND (d3.is_outsourced = 0 OR d3.is_outsourced IS NULL)
        ) + (
          SELECT COALESCE(SUM(fr.value), 0)
          FROM fuel_records fr
          WHERE fr.truck_id = t.id AND fr.date BETWEEN ? AND ?
        ) as cost
      FROM trucks t
      LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.date BETWEEN ? AND ?
      WHERE ${INTERNAL_TRUCK}
      GROUP BY t.id
      ORDER BY revenue DESC
    `,
      )
      .all(
        startDate,
        endDate,
        startDate,
        endDate,
        startDate,
        endDate,
        startDate,
        endDate,
        startDate,
        endDate,
      ) as any[]

    const trucksWithMetrics = perTruck.map((t) => ({
      ...t,
      profit: t.revenue - t.cost,
      cpk: t.km > 0 ? t.cost / t.km : 0,
    }))

    // 4. Monthly Revenue (Last 6 months) — internal trucks only
    const monthlyRevenueRaw = db()
      .prepare(
        `
      SELECT
        strftime('%Y-%m', tr.date) as month,
        SUM(tr.price_charged) as revenue
      FROM trips tr
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date >= date('now', '-6 months') AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      GROUP BY month
      ORDER BY month ASC
    `,
      )
      .all() as any[]

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

    // 5. Maintenance Alerts — using real maintenance module
    const maintenanceStatusData = getMaintenanceStatus(db())

    const alertsList: any[] = []
    let overdueCount = 0
    let dueSoonCount = 0
    let neverCount = 0
    let okCount = 0

    for (const truck of maintenanceStatusData) {
      for (const type of truck.types) {
        if (type.status === 'overdue') {
          overdueCount++
          alertsList.push({
            truck_id: truck.truck_id,
            truck_license_plate: truck.truck_license_plate,
            truck_model: truck.truck_model,
            type_name: type.type_name,
            km_since_last: type.km_since_last ?? 0,
            km_remaining: type.km_remaining ?? 0,
            status: 'overdue',
          })
        } else if (type.status === 'due_soon') {
          dueSoonCount++
          alertsList.push({
            truck_id: truck.truck_id,
            truck_license_plate: truck.truck_license_plate,
            truck_model: truck.truck_model,
            type_name: type.type_name,
            km_since_last: type.km_since_last ?? 0,
            km_remaining: type.km_remaining ?? 0,
            status: 'due_soon',
          })
        } else if (type.status === 'never') {
          neverCount++
        } else if (type.status === 'ok') {
          okCount++
        }
      }
    }

    alertsList.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') {
        return -1
      }
      if (a.status !== 'overdue' && b.status === 'overdue') {
        return 1
      }
      if (a.status === 'due_soon' && b.status === 'due_soon') {
        return (a.km_remaining ?? 0) - (b.km_remaining ?? 0)
      }
      return 0
    })

    const maintenanceSummary = {
      overdueCount,
      dueSoonCount,
      neverCount,
      okCount,
      alerts: alertsList.slice(0, 8),
    }

    const categoryTotals = new Map<string, number>()

    // Cost categories from 'costs' table — exclude outsourced
    const directCategoryCosts = db()
      .prepare(
        `
      SELECT c.category, COALESCE(SUM(c.value), 0) as total
      FROM costs c
      LEFT JOIN trucks t ON c.truck_id = t.id
      LEFT JOIN drivers d ON c.driver_id = d.id
      WHERE c.date BETWEEN ? AND ?
        AND (c.truck_id IS NULL OR ${INTERNAL_TRUCK})
        AND (c.driver_id IS NULL OR ${INTERNAL_DRIVER})
      GROUP BY c.category
    `,
      )
      .all(startDate, endDate) as any[]

    for (const c of directCategoryCosts) {
      categoryTotals.set(c.category, Number(c.total) || 0)
    }

    // Fuel stop costs from 'trip_fuel_stops' — internal trips only
    const fuelStopCosts = db()
      .prepare(
        `
      SELECT s.type, SUM(fs.value) as total
      FROM trip_fuel_stops fs
      JOIN suppliers s ON fs.supplier_id = s.id
      JOIN trips tr ON fs.trip_id = tr.id
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
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

    if (fuelRecordsCost > 0) {
      const currentFuel = categoryTotals.get('fuel') || 0
      categoryTotals.set('fuel', currentFuel + fuelRecordsCost)
    }

    if (commissionCost > 0) {
      const currentCommission = categoryTotals.get('commission') || 0
      categoryTotals.set('commission', currentCommission + (Number(commissionCost) || 0))
    }

    const categoryLabels: Record<string, string> = {
      fuel: 'Combustível',
      oil: 'Óleo',
      maintenance: 'Manutenção',
      salary: 'Salário',
      toll: 'Pedágio',
      commission: 'Comissão',
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
      netRevenue: revenue - totalTax,
      tax: totalTax,
      cost: totalCost,
      profit: revenue - totalCost,
      netProfit: revenue - totalTax - totalCost,
      totalTrips,
      totalKm,
      perTruck: trucksWithMetrics,
      monthlyRevenue,
      maintenanceSummary,
      perCategory,
    }
  })
}
