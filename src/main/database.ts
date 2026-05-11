import { join } from 'path'
import bcrypt from 'bcryptjs'
import Database from 'better-sqlite3'
import { app } from 'electron'

let db: Database.Database

export function getDb(): Database.Database {
  return db
}

export function setupDatabase(): void {
  const dbPath = join(app.getPath('userData'), 'dezem.db')
  db = new Database(dbPath)

  // Performance pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    -- Auth
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      password_hash TEXT   NOT NULL,
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    -- Customers
    CREATE TABLE IF NOT EXISTS customers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      cnpj       TEXT,
      ie         TEXT,
      phone      TEXT,
      address    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Products
    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      unit       TEXT NOT NULL DEFAULT 'ton',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Supplier Types (for settings)
    CREATE TABLE IF NOT EXISTS supplier_types (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      value         TEXT NOT NULL UNIQUE,
      label         TEXT NOT NULL,
      is_deletable  INTEGER NOT NULL DEFAULT 1
    );

    -- Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      phone      TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Trucks
    CREATE TABLE IF NOT EXISTS trucks (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      license_plate    TEXT NOT NULL UNIQUE,
      model            TEXT NOT NULL,
      year             INTEGER,
      capacity_ton     REAL,
      current_odometer REAL NOT NULL DEFAULT 0,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    -- Drivers
    CREATE TABLE IF NOT EXISTS drivers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      cpf            TEXT,
      phone          TEXT,
      monthly_salary REAL NOT NULL DEFAULT 0,
      truck_id       INTEGER REFERENCES trucks(id),
      active         INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT DEFAULT (datetime('now'))
    );

    -- Routes
    CREATE TABLE IF NOT EXISTS routes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      distance_km REAL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Trips
    CREATE TABLE IF NOT EXISTS trips (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      truck_id      INTEGER NOT NULL REFERENCES trucks(id),
      driver_id     INTEGER NOT NULL REFERENCES drivers(id),
      product_id    INTEGER NOT NULL REFERENCES products(id),
      customer_id   INTEGER REFERENCES customers(id),
      route_id      INTEGER REFERENCES routes(id),
      supplier_id   INTEGER REFERENCES suppliers(id),
      weight_ton    REAL NOT NULL DEFAULT 0,
      price_charged REAL NOT NULL DEFAULT 0,
      km_driven     REAL NOT NULL DEFAULT 0,
      observation   TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- Cost Categories (for settings)
    CREATE TABLE IF NOT EXISTS cost_categories (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      value         TEXT NOT NULL UNIQUE,
      label         TEXT NOT NULL,
      is_deletable  INTEGER NOT NULL DEFAULT 1
    );

    -- Costs
    -- NOTE: The CHECK constraint was removed to allow for dynamic categories.
    -- This change only applies to new databases.
    CREATE TABLE IF NOT EXISTS costs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      category      TEXT NOT NULL,
      value         REAL NOT NULL,
      truck_id      INTEGER REFERENCES trucks(id),
      supplier_id   INTEGER REFERENCES suppliers(id),
      driver_id     INTEGER REFERENCES drivers(id),
      description   TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for performance on frequent queries
    CREATE INDEX IF NOT EXISTS idx_trips_date      ON trips(date);
    CREATE INDEX IF NOT EXISTS idx_trips_truck     ON trips(truck_id);
    CREATE INDEX IF NOT EXISTS idx_trips_driver    ON trips(driver_id);
    CREATE INDEX IF NOT EXISTS idx_costs_date      ON costs(date);
    CREATE INDEX IF NOT EXISTS idx_costs_category  ON costs(category);
  `)

  // Seed: default admin user if none exists
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c
  if (userCount === 0) {
    const hash = bcrypt.hashSync('dezem2024', 10)
    db.prepare('INSERT INTO users (name, password_hash) VALUES (?, ?)').run('Admin', hash)
  }

  // Seed: default supplier types if none exist
  const supplierTypeCount = (db.prepare('SELECT COUNT(*) as c FROM supplier_types').get() as any).c
  if (supplierTypeCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO supplier_types (value, label, is_deletable) VALUES (?, ?, ?)',
    )
    const transaction = db.transaction((types) => {
      for (const type of types) stmt.run(type.value, type.label, type.is_deletable)
    })
    transaction([
      { value: 'gas_station', label: 'Posto de Combustível', is_deletable: 0 },
      { value: 'workshop', label: 'Oficina', is_deletable: 0 },
      { value: 'quarry', label: 'Pedreira', is_deletable: 0 },
      { value: 'other', label: 'Outro', is_deletable: 0 },
    ])
  }

  // Seed: default cost categories if none exist
  const costCategoryCount = (db.prepare('SELECT COUNT(*) as c FROM cost_categories').get() as any).c
  if (costCategoryCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO cost_categories (value, label, is_deletable) VALUES (?, ?, ?)',
    )
    const transaction = db.transaction((types) => {
      for (const type of types) stmt.run(type.value, type.label, type.is_deletable)
    })
    transaction([
      { value: 'fuel', label: 'Combustível', is_deletable: 0 },
      { value: 'oil', label: 'Óleo', is_deletable: 0 },
      { value: 'maintenance', label: 'Manutenção', is_deletable: 0 },
      { value: 'salary', label: 'Salário', is_deletable: 0 },
      { value: 'toll', label: 'Pedágio', is_deletable: 0 },
      { value: 'others', label: 'Outros', is_deletable: 0 },
    ])
  }

  console.log('[DB] SQLite ready at:', dbPath)
}
