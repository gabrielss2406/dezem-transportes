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
    const tripRevenue = (
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

    // Standalone (avulsa) receivables — not tied to a trip, contribute directly to revenue
    const avulsaReceivables = db()
      .prepare(
        `
        SELECT r.customer_id, COALESCE(c.name, 'Sem cliente') as customer_name,
               r.amount, r.due_date
        FROM receivables r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE r.trip_id IS NULL AND r.due_date BETWEEN ? AND ?
      `,
      )
      .all(startDate, endDate) as any[]

    const avulsaTotal = avulsaReceivables.reduce((s, r) => s + (Number(r.amount) || 0), 0)

    const revenue = tripRevenue + avulsaTotal

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
          AND c.category != 'fuel'
          AND c.kind = 'operational'
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

    const operationalCost = directCosts + fuelCosts + commissionCost + fuelRecordsCost
    const totalCost = operationalCost + totalTax

    // Despesas avulsas (kind = 'expense') — não entram no custo operacional/CPK,
    // mas são mostradas à parte no Dashboard pra visibilidade financeira.
    const expenseCost = (
      db()
        .prepare(
          `
        SELECT COALESCE(SUM(c.value), 0) as total
        FROM costs c
        LEFT JOIN trucks t ON c.truck_id = t.id
        LEFT JOIN drivers d ON c.driver_id = d.id
        WHERE c.date BETWEEN ? AND ?
          AND c.kind = 'expense'
          AND (c.truck_id IS NULL OR ${INTERNAL_TRUCK})
          AND (c.driver_id IS NULL OR ${INTERNAL_DRIVER})
      `,
        )
        .get(startDate, endDate) as any
    ).total

    const expenseOpen = db()
      .prepare(
        `
        SELECT COUNT(*) as c, COALESCE(SUM(value), 0) as total
        FROM costs
        WHERE date BETWEEN ? AND ? AND kind = 'expense' AND status = 'open'
      `,
      )
      .get(startDate, endDate) as any

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

    // 3. Profitability and CPK per internal Truck.
    // CPK is distance-based: distance = last odometer reading in range - first odometer
    // reading in range. fuel_records.odometer_at_service is the only real timestamped
    // odometer history in the schema (trucks.current_odometer is a single "latest" value,
    // and trips.km_driven is a legacy field no longer captured by the trip form).
    const perTruck = db()
      .prepare(
        `
      SELECT
        t.license_plate,
        t.model,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        COUNT(tr.id) as trip_count,
        (
          SELECT fr_start.odometer_at_service
          FROM fuel_records fr_start
          WHERE fr_start.truck_id = t.id AND fr_start.date BETWEEN ? AND ?
          ORDER BY fr_start.date ASC, fr_start.id ASC
          LIMIT 1
        ) as start_odometer,
        (
          SELECT fr_end.odometer_at_service
          FROM fuel_records fr_end
          WHERE fr_end.truck_id = t.id AND fr_end.date BETWEEN ? AND ?
          ORDER BY fr_end.date DESC, fr_end.id DESC
          LIMIT 1
        ) as end_odometer,
        (
          SELECT COALESCE(SUM(fs.value), 0)
          FROM trip_fuel_stops fs
          JOIN trips tr2 ON fs.trip_id = tr2.id
          WHERE tr2.truck_id = t.id AND tr2.date BETWEEN ? AND ?
        ) as fuel_stops_cost,
        (
          SELECT COALESCE(SUM(fr.value), 0)
          FROM fuel_records fr
          WHERE fr.truck_id = t.id AND fr.date BETWEEN ? AND ?
        ) as fuel_records_cost,
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
        ) + (
          SELECT COALESCE(SUM(tr4.tax_value), 0)
          FROM trips tr4
          JOIN drivers d4 ON tr4.driver_id = d4.id
          WHERE tr4.truck_id = t.id AND tr4.has_percentage_tax = 1 AND tr4.date BETWEEN ? AND ?
            AND (d4.is_outsourced = 0 OR d4.is_outsourced IS NULL)
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

    const trucksWithMetrics = perTruck.map((t) => {
      const hasOdometerRange = t.start_odometer != null && t.end_odometer != null
      const rawDistance = hasOdometerRange ? Number(t.end_odometer) - Number(t.start_odometer) : 0
      // Negative distance shouldn't happen (fuel records enforce chronological monotonicity),
      // but guard it anyway rather than surfacing a nonsensical negative CPK.
      const km = rawDistance > 0 ? rawDistance : 0
      const fuelCost = Number(t.fuel_stops_cost) + Number(t.fuel_records_cost)
      return {
        license_plate: t.license_plate,
        model: t.model,
        revenue: t.revenue,
        trip_count: t.trip_count,
        cost: t.cost,
        fuelCost,
        profit: t.revenue - t.cost,
        km,
        // null (not 0) when distance can't be determined — 0 would misleadingly read as
        // "free to operate" instead of "not enough odometer data in this period".
        // CPK is fuel-cost-based (not total cost) — how much fuel it takes per km.
        cpk: km > 0 ? fuelCost / km : null,
        startOdometer: t.start_odometer ?? null,
        endOdometer: t.end_odometer ?? null,
      }
    })

    const totalKm = trucksWithMetrics.reduce((s, t) => s + t.km, 0)
    const totalFuelCost = trucksWithMetrics.reduce((s, t) => s + t.fuelCost, 0)

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

    const avulsaMonthlyRevenueRaw = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', due_date) as month, SUM(amount) as revenue
      FROM receivables
      WHERE trip_id IS NULL AND due_date >= date('now', '-6 months')
      GROUP BY month
    `,
      )
      .all() as any[]

    // Monthly cost/expense breakdown (last 6 months) — same components as the
    // period-total cost/expense calc above, grouped by month instead of summed.
    const directCostsMonthly = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', c.date) as month, COALESCE(SUM(c.value), 0) as total
      FROM costs c
      LEFT JOIN trucks t ON c.truck_id = t.id
      LEFT JOIN drivers d ON c.driver_id = d.id
      WHERE c.date >= date('now', '-6 months')
        AND c.category != 'fuel' AND c.kind = 'operational'
        AND (c.truck_id IS NULL OR ${INTERNAL_TRUCK})
        AND (c.driver_id IS NULL OR ${INTERNAL_DRIVER})
      GROUP BY month
    `,
      )
      .all() as any[]

    const fuelCostsMonthly = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', tr.date) as month, COALESCE(SUM(fs.value), 0) as total
      FROM trip_fuel_stops fs
      JOIN trips tr ON fs.trip_id = tr.id
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date >= date('now', '-6 months') AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      GROUP BY month
    `,
      )
      .all() as any[]

    const commissionCostMonthly = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', tr.date) as month, COALESCE(SUM(tr.commission_value), 0) as total
      FROM trips tr
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date >= date('now', '-6 months') AND tr.has_commission = 1 AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      GROUP BY month
    `,
      )
      .all() as any[]

    const fuelRecordsCostMonthly = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', fr.date) as month, COALESCE(SUM(fr.value), 0) as total
      FROM fuel_records fr
      JOIN trucks t ON fr.truck_id = t.id
      WHERE fr.date >= date('now', '-6 months') AND ${INTERNAL_TRUCK}
      GROUP BY month
    `,
      )
      .all() as any[]

    const taxMonthly = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', tr.date) as month, COALESCE(SUM(tr.tax_value), 0) as total
      FROM trips tr
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.date >= date('now', '-6 months') AND tr.has_percentage_tax = 1 AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      GROUP BY month
    `,
      )
      .all() as any[]

    const expenseCostMonthly = db()
      .prepare(
        `
      SELECT strftime('%Y-%m', c.date) as month, COALESCE(SUM(c.value), 0) as total
      FROM costs c
      LEFT JOIN trucks t ON c.truck_id = t.id
      LEFT JOIN drivers d ON c.driver_id = d.id
      WHERE c.date >= date('now', '-6 months') AND c.kind = 'expense'
        AND (c.truck_id IS NULL OR ${INTERNAL_TRUCK})
        AND (c.driver_id IS NULL OR ${INTERNAL_DRIVER})
      GROUP BY month
    `,
      )
      .all() as any[]

    const monthTotal = (rows: any[], monthStr: string) =>
      Number(rows.find((r) => r.month === monthStr)?.total) || 0

    const monthlyRevenue: Array<{
      month: string
      revenue: number
      cost: number
      expense: number
      net: number
    }> = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const monthStr = `${year}-${month}`

      const found = monthlyRevenueRaw.find((r) => r.month === monthStr)
      const avulsaFound = avulsaMonthlyRevenueRaw.find((r) => r.month === monthStr)
      const monthRevenue = (Number(found?.revenue) || 0) + (Number(avulsaFound?.revenue) || 0)

      const monthCost =
        monthTotal(directCostsMonthly, monthStr) +
        monthTotal(fuelCostsMonthly, monthStr) +
        monthTotal(commissionCostMonthly, monthStr) +
        monthTotal(fuelRecordsCostMonthly, monthStr) +
        monthTotal(taxMonthly, monthStr)
      const monthExpense = monthTotal(expenseCostMonthly, monthStr)

      monthlyRevenue.push({
        month: monthStr,
        revenue: monthRevenue,
        cost: monthCost,
        expense: monthExpense,
        net: monthRevenue - monthCost - monthExpense,
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
        AND c.kind = 'operational'
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

    if (totalTax > 0) {
      const currentTax = categoryTotals.get('tax') || 0
      categoryTotals.set('tax', currentTax + (Number(totalTax) || 0))
    }

    const categoryLabels: Record<string, string> = {
      fuel: 'Combustível',
      oil: 'Óleo',
      maintenance: 'Manutenção',
      salary: 'Salário',
      toll: 'Pedágio',
      commission: 'Comissão',
      tax: 'Imposto',
      others: 'Outros',
    }

    const perCategory = Array.from(categoryTotals.entries())
      .map(([category, total]) => ({
        category: categoryLabels[category] || category,
        total,
      }))
      .sort((a, b) => b.total - a.total)

    // 6. Revenue by Customer (Top 5) — internal trips only, plus standalone receivables
    const perCustomerRaw = db()
      .prepare(
        `
      SELECT
        tr.customer_id as customer_id,
        COALESCE(c.name, 'Sem cliente') as customer_name,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        COALESCE(SUM(tr.price_charged - COALESCE(tr.tax_value, 0)), 0) as netRevenue,
        COALESCE(SUM(tr.weight_ton + COALESCE(tr.overweight_ton, 0)), 0) as tonnage,
        COUNT(*) as trips
      FROM trips tr
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      LEFT JOIN customers c ON tr.customer_id = c.id
      WHERE tr.date BETWEEN ? AND ? AND ${INTERNAL_TRUCK} AND ${INTERNAL_DRIVER}
      GROUP BY tr.customer_id
    `,
      )
      .all(startDate, endDate) as any[]

    const customerTotals = new Map<
      string,
      { customer_name: string; revenue: number; netRevenue: number; tonnage: number; trips: number }
    >()

    for (const row of perCustomerRaw) {
      const key = String(row.customer_id ?? 'null')
      customerTotals.set(key, {
        customer_name: row.customer_name,
        revenue: Number(row.revenue) || 0,
        netRevenue: Number(row.netRevenue) || 0,
        tonnage: Number(row.tonnage) || 0,
        trips: Number(row.trips) || 0,
      })
    }

    for (const r of avulsaReceivables) {
      const key = String(r.customer_id ?? 'null')
      const current = customerTotals.get(key) || {
        customer_name: r.customer_name,
        revenue: 0,
        netRevenue: 0,
        tonnage: 0,
        trips: 0,
      }
      current.revenue += Number(r.amount) || 0
      current.netRevenue += Number(r.amount) || 0
      customerTotals.set(key, current)
    }

    const perCustomer = Array.from(customerTotals.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // 7. Revenue by Product (Top 5) — includes outsourced trips
    const perProduct = db()
      .prepare(
        `
      SELECT
        p.name as product_name,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        COALESCE(SUM(tr.weight_ton + COALESCE(tr.overweight_ton, 0)), 0) as tonnage,
        COUNT(*) as trips
      FROM trips tr
      JOIN trucks t ON tr.truck_id = t.id
      JOIN drivers d ON tr.driver_id = d.id
      JOIN products p ON tr.product_id = p.id
      WHERE tr.date BETWEEN ? AND ?
      GROUP BY tr.product_id
      ORDER BY revenue DESC
      LIMIT 5
    `,
      )
      .all(startDate, endDate) as any[]

    // Saldo Bancário / Contas a Receber / Contas a Pagar — sempre históricos (todo o
    // banco), não recortados pelo período do dashboard: são posições atuais, não do range.
    const receivablesOpenTotal = (
      db()
        .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'open'`)
        .get() as any
    ).total
    const costsOpenTotal = (
      db()
        .prepare(`SELECT COALESCE(SUM(value), 0) as total FROM costs WHERE status = 'open'`)
        .get() as any
    ).total
    const receivablesPaidTotal = (
      db()
        .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM receivables WHERE status = 'paid'`)
        .get() as any
    ).total
    const costsPaidTotal = (
      db()
        .prepare(`SELECT COALESCE(SUM(value), 0) as total FROM costs WHERE status = 'paid'`)
        .get() as any
    ).total
    const bankBalance = Number(receivablesPaidTotal) - Number(costsPaidTotal)

    return {
      revenue,
      netRevenue: revenue - totalTax,
      tax: totalTax,
      cost: totalCost,
      profit: revenue - operationalCost,
      netProfit: revenue - totalCost,
      expenseCost: Number(expenseCost) || 0,
      expenseOpenCount: Number(expenseOpen.c) || 0,
      expenseOpenValue: Number(expenseOpen.total) || 0,
      totalTrips,
      totalKm,
      fuelCost: totalFuelCost,
      perTruck: trucksWithMetrics,
      monthlyRevenue,
      maintenanceSummary,
      perCategory,
      perCustomer,
      perProduct,
      bankBalance,
      receivablesOpenTotal: Number(receivablesOpenTotal) || 0,
      costsOpenTotal: Number(costsOpenTotal) || 0,
    }
  })

  // Commission earned per driver, for payroll purposes — read-only aggregation.
  // Must never write to 'costs': commission is already folded into per-truck
  // profitability via trips.commission_value in the query above.
  ipcMain.handle(
    'dashboard:commissionByDriver',
    (_e, startDate: string, endDate: string, driverId?: number | string) => {
      let query = `
      SELECT d.id, d.name,
        COALESCE(SUM(tr.commission_value), 0) as total_commission,
        COUNT(tr.id) as trip_count
      FROM trips tr
      JOIN drivers d ON tr.driver_id = d.id
      WHERE tr.has_commission = 1 AND tr.date BETWEEN ? AND ?
    `
      const params: (string | number)[] = [startDate, endDate]
      if (driverId) {
        query += ' AND d.id = ?'
        params.push(driverId)
      }
      query += ' GROUP BY d.id ORDER BY total_commission DESC'
      return db()
        .prepare(query)
        .all(...params)
    },
  )
}
