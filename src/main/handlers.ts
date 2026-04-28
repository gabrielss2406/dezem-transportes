import bcrypt from 'bcryptjs'
import { ipcMain } from 'electron'
import { getDb } from './database'

export function registerHandlers(): void {
  const db = () => getDb()

  // ── AUTH ────────────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', (_e, password: string) => {
    const user = db().prepare('SELECT * FROM users LIMIT 1').get() as any
    if (!user) return { ok: false, error: 'Nenhum usuário cadastrado' }
    const ok = bcrypt.compareSync(password, user.password_hash)
    return ok ? { ok: true, name: user.name } : { ok: false, error: 'Senha incorreta' }
  })

  ipcMain.handle('auth:changePassword', (_e, currentPassword: string, newPassword: string) => {
    const user = db().prepare('SELECT * FROM users LIMIT 1').get() as any
    if (!bcrypt.compareSync(currentPassword, user.password_hash))
      return { ok: false, error: 'Senha atual incorreta' }
    const hash = bcrypt.hashSync(newPassword, 10)
    db().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id)
    return { ok: true }
  })

  // ── CUSTOMERS ───────────────────────────────────────────────────────────────
  ipcMain.handle('customers:list', (_e, search = '') => {
    return db()
      .prepare(`SELECT * FROM customers WHERE name LIKE ? ORDER BY name`)
      .all(`%${search}%`)
  })

  ipcMain.handle('customers:create', (_e, data: any) => {
    const r = db()
      .prepare(`INSERT INTO customers (name, cnpj, ie, phone, address) VALUES (?,?,?,?,?)`)
      .run(data.name, data.cnpj, data.ie, data.phone, data.address)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('customers:update', (_e, id: number, data: any) => {
    db()
      .prepare(`UPDATE customers SET name=?, cnpj=?, ie=?, phone=?, address=? WHERE id=?`)
      .run(data.name, data.cnpj, data.ie, data.phone, data.address, id)
    return { ok: true }
  })

  ipcMain.handle('customers:delete', (_e, id: number) => {
    db().prepare('DELETE FROM customers WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── PRODUCTS ────────────────────────────────────────────────────────────────
  ipcMain.handle('products:list', (_e, search = '') => {
    return db().prepare(`SELECT * FROM products WHERE name LIKE ? ORDER BY name`).all(`%${search}%`)
  })

  ipcMain.handle('products:create', (_e, data: any) => {
    const r = db()
      .prepare(`INSERT INTO products (name, unit) VALUES (?,?)`)
      .run(data.name, data.unit || 'ton')
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('products:update', (_e, id: number, data: any) => {
    db().prepare(`UPDATE products SET name=?, unit=? WHERE id=?`).run(data.name, data.unit, id)
    return { ok: true }
  })

  ipcMain.handle('products:delete', (_e, id: number) => {
    db().prepare('DELETE FROM products WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── SUPPLIERS ───────────────────────────────────────────────────────────────
  ipcMain.handle('suppliers:list', (_e, search = '') => {
    return db()
      .prepare(`SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name`)
      .all(`%${search}%`)
  })

  ipcMain.handle('suppliers:create', (_e, data: any) => {
    const r = db()
      .prepare(`INSERT INTO suppliers (name, type, phone) VALUES (?,?,?)`)
      .run(data.name, data.type, data.phone)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('suppliers:update', (_e, id: number, data: any) => {
    db()
      .prepare(`UPDATE suppliers SET name=?, type=?, phone=? WHERE id=?`)
      .run(data.name, data.type, data.phone, id)
    return { ok: true }
  })

  ipcMain.handle('suppliers:delete', (_e, id: number) => {
    db().prepare('DELETE FROM suppliers WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── TRUCKS ──────────────────────────────────────────────────────────────────
  ipcMain.handle('trucks:list', () => {
    return db().prepare('SELECT * FROM trucks ORDER BY license_plate').all()
  })

  ipcMain.handle('trucks:create', (_e, data: any) => {
    const r = db()
      .prepare(
        `INSERT INTO trucks (license_plate, model, year, capacity_ton, current_odometer) VALUES (?,?,?,?,?)`,
      )
      .run(data.license_plate, data.model, data.year, data.capacity_ton, data.current_odometer || 0)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('trucks:update', (_e, id: number, data: any) => {
    db()
      .prepare(`UPDATE trucks SET license_plate=?, model=?, year=?, capacity_ton=? WHERE id=?`)
      .run(data.license_plate, data.model, data.year, data.capacity_ton, id)
    return { ok: true }
  })

  ipcMain.handle('trucks:delete', (_e, id: number) => {
    db().prepare('DELETE FROM trucks WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── DRIVERS ─────────────────────────────────────────────────────────────────
  ipcMain.handle('drivers:list', () => {
    return db()
      .prepare(`
      SELECT d.*, t.license_plate as truck_license_plate
      FROM drivers d
      LEFT JOIN trucks t ON d.truck_id = t.id
      ORDER BY d.name
    `)
      .all()
  })

  ipcMain.handle('drivers:create', (_e, data: any) => {
    const r = db()
      .prepare(
        `INSERT INTO drivers (name, cpf, phone, monthly_salary, truck_id) VALUES (?,?,?,?,?)`,
      )
      .run(data.name, data.cpf, data.phone, data.monthly_salary, data.truck_id || null)
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('drivers:update', (_e, id: number, data: any) => {
    db()
      .prepare(`UPDATE drivers SET name=?, cpf=?, phone=?, monthly_salary=?, truck_id=? WHERE id=?`)
      .run(data.name, data.cpf, data.phone, data.monthly_salary, data.truck_id || null, id)
    return { ok: true }
  })

  ipcMain.handle('drivers:delete', (_e, id: number) => {
    db().prepare('DELETE FROM drivers WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── ROUTES ──────────────────────────────────────────────────────────────────
  ipcMain.handle('routes:list', () => db().prepare('SELECT * FROM routes ORDER BY name').all())

  ipcMain.handle('routes:create', (_e, data: any) => {
    const r = db()
      .prepare('INSERT INTO routes (name, distance_km) VALUES (?,?)')
      .run(data.name, data.distance_km)
    return { id: r.lastInsertRowid }
  })

  // ── TRIPS ───────────────────────────────────────────────────────────────────
  ipcMain.handle('trips:list', (_e, filters: any = {}) => {
    let query = `
      SELECT t.*,
        tr.license_plate as truck_license_plate, tr.model as truck_model,
        d.name           as driver_name,
        p.name           as product_name,
        c.name           as customer_name,
        r.name           as route_name
      FROM trips t
      JOIN trucks tr ON t.truck_id = tr.id
      JOIN drivers d ON t.driver_id = d.id
      JOIN products p ON t.product_id = p.id
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN routes r ON t.route_id = r.id
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
    query += ' ORDER BY t.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  ipcMain.handle('trips:create', (_e, data: any) => {
    const r = db().transaction(() => {
      const res = db()
        .prepare(`
        INSERT INTO trips (date, truck_id, driver_id, product_id, customer_id, route_id, supplier_id, weight_ton, price_charged, km_driven, observation)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `)
        .run(
          data.date,
          data.truck_id,
          data.driver_id,
          data.product_id,
          data.customer_id || null,
          data.route_id || null,
          data.supplier_id || null,
          data.weight_ton,
          data.price_charged,
          data.km_driven,
          data.observation || null,
        )
      // Update truck odometer automatically
      db()
        .prepare('UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?')
        .run(data.km_driven, data.truck_id)
      return res
    })()
    return { id: (r as any).lastInsertRowid }
  })

  ipcMain.handle('trips:delete', (_e, id: number) => {
    db().prepare('DELETE FROM trips WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── COSTS ───────────────────────────────────────────────────────────────────
  ipcMain.handle('costs:list', (_e, filters: any = {}) => {
    let query = `
      SELECT co.*,
        t.license_plate as truck_license_plate,
        s.name          as supplier_name,
        d.name          as driver_name
      FROM costs co
      LEFT JOIN trucks t ON co.truck_id = t.id
      LEFT JOIN suppliers s ON co.supplier_id = s.id
      LEFT JOIN drivers d ON co.driver_id = d.id
      WHERE 1=1
    `
    const params: any[] = []
    if (filters.startDate) {
      query += ' AND co.date >= ?'
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      query += ' AND co.date <= ?'
      params.push(filters.endDate)
    }
    if (filters.category) {
      query += ' AND co.category = ?'
      params.push(filters.category)
    }
    if (filters.truck_id) {
      query += ' AND co.truck_id = ?'
      params.push(filters.truck_id)
    }
    query += ' ORDER BY co.date DESC'
    return db()
      .prepare(query)
      .all(...params)
  })

  ipcMain.handle('costs:create', (_e, data: any) => {
    const r = db()
      .prepare(`
      INSERT INTO costs (date, category, value, truck_id, supplier_id, driver_id, description)
      VALUES (?,?,?,?,?,?,?)
    `)
      .run(
        data.date,
        data.category,
        data.value,
        data.truck_id || null,
        data.supplier_id || null,
        data.driver_id || null,
        data.description || null,
      )
    return { id: r.lastInsertRowid }
  })

  ipcMain.handle('costs:delete', (_e, id: number) => {
    db().prepare('DELETE FROM costs WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('costs:issueMonthlySalaries', (_e, monthYear: string) => {
    // monthYear format: 'YYYY-MM'
    const drivers = db().prepare(`SELECT * FROM drivers WHERE active = 1`).all() as any[]
    const date = `${monthYear}-01`
    let issued = 0
    const insert = db().prepare(`
      INSERT INTO costs (date, category, value, driver_id, description)
      VALUES (?, 'salary', ?, ?, ?)
    `)
    const transaction = db().transaction(() => {
      for (const d of drivers) {
        // Check if already issued
        const existing = db()
          .prepare(`
          SELECT id FROM costs WHERE category='salary' AND driver_id=? AND date LIKE ?
        `)
          .get(d.id, `${monthYear}%`)
        if (!existing) {
          insert.run(date, d.monthly_salary, d.id, `Salário ${d.name} — ${monthYear}`)
          issued++
        }
      }
    })
    transaction()
    return { ok: true, issued }
  })

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  ipcMain.handle('dashboard:summary', (_e, startDate: string, endDate: string) => {
    const revenue = (
      db()
        .prepare(`
      SELECT COALESCE(SUM(price_charged), 0) as total FROM trips WHERE date BETWEEN ? AND ?
    `)
        .get(startDate, endDate) as any
    ).total

    const cost = (
      db()
        .prepare(`
      SELECT COALESCE(SUM(value), 0) as total FROM costs WHERE date BETWEEN ? AND ?
    `)
        .get(startDate, endDate) as any
    ).total

    const totalTrips = (
      db()
        .prepare(`
      SELECT COUNT(*) as c FROM trips WHERE date BETWEEN ? AND ?
    `)
        .get(startDate, endDate) as any
    ).c

    const totalKm = (
      db()
        .prepare(`
      SELECT COALESCE(SUM(km_driven), 0) as total FROM trips WHERE date BETWEEN ? AND ?
    `)
        .get(startDate, endDate) as any
    ).total

    const perTruck = db()
      .prepare(`
      SELECT t.license_plate, t.model,
        COALESCE(SUM(tr.price_charged), 0) as revenue,
        COALESCE(SUM(tr.km_driven), 0) as km
      FROM trucks t
      LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.date BETWEEN ? AND ?
      GROUP BY t.id
      ORDER BY revenue DESC
    `)
      .all(startDate, endDate)

    const perProduct = db()
      .prepare(`
      SELECT p.name,
        COALESCE(SUM(t.weight_ton), 0) as tonnage,
        COUNT(t.id) as trips
      FROM products p
      LEFT JOIN trips t ON t.product_id = p.id AND t.date BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY tonnage DESC
    `)
      .all(startDate, endDate)

    const perCategory = db()
      .prepare(`
      SELECT category, COALESCE(SUM(value), 0) as total
      FROM costs WHERE date BETWEEN ? AND ?
      GROUP BY category ORDER BY total DESC
    `)
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
