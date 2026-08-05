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
      customId   INTEGER UNIQUE,
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
      customId   INTEGER UNIQUE,
      name       TEXT NOT NULL,
      unit_value REAL DEFAULT NULL,
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
      customId   INTEGER UNIQUE,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL,
      phone      TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Contractors (external companies providing outsourced drivers/trucks)
    CREATE TABLE IF NOT EXISTS contractors (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      cnpj       TEXT,
      phone      TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Trucks
    CREATE TABLE IF NOT EXISTS trucks (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      customId         INTEGER UNIQUE,
      license_plate    TEXT NOT NULL UNIQUE,
      model            TEXT,
      year             INTEGER,
      capacity_ton     REAL,
      current_odometer REAL NOT NULL DEFAULT 0,
      is_outsourced    INTEGER NOT NULL DEFAULT 0,
      contractor_id    INTEGER REFERENCES contractors(id),
      created_at       TEXT DEFAULT (datetime('now'))
    );

    -- Drivers
    CREATE TABLE IF NOT EXISTS drivers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      customId       INTEGER UNIQUE,
      name           TEXT NOT NULL,
      cpf            TEXT,
      phone          TEXT,
      monthly_salary REAL NOT NULL DEFAULT 0,
      truck_id       INTEGER REFERENCES trucks(id),
      active         INTEGER NOT NULL DEFAULT 1,
      is_outsourced  INTEGER NOT NULL DEFAULT 0,
      contractor_id  INTEGER REFERENCES contractors(id),
      created_at     TEXT DEFAULT (datetime('now'))
    );

    -- Trips
    CREATE TABLE IF NOT EXISTS trips (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      truck_id      INTEGER NOT NULL REFERENCES trucks(id),
      driver_id     INTEGER NOT NULL REFERENCES drivers(id),
      product_id    INTEGER NOT NULL REFERENCES products(id),
      customer_id   INTEGER REFERENCES customers(id),
      supplier_id   INTEGER REFERENCES suppliers(id),
      weight_ton    REAL NOT NULL DEFAULT 0,
      price_charged REAL NOT NULL DEFAULT 0,
      km_driven     REAL NOT NULL DEFAULT 0,
      observation   TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- Receivables (Contas a Receber) — 1:1 mirror of trips, plus standalone (avulsa) entries
    CREATE TABLE IF NOT EXISTS receivables (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id      INTEGER UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
      customer_id  INTEGER REFERENCES customers(id),
      amount       REAL NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid')),
      due_date     TEXT DEFAULT NULL,
      paid_date    TEXT DEFAULT NULL,
      description  TEXT DEFAULT NULL,
      created_at   TEXT DEFAULT (datetime('now'))
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

    -- Trip Fuel Stops
    CREATE TABLE IF NOT EXISTS trip_fuel_stops (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id       INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      supplier_id   INTEGER NOT NULL REFERENCES suppliers(id),
      value         REAL    NOT NULL DEFAULT 0,
      liters        REAL    NOT NULL DEFAULT 0,
      km_driven     REAL    NOT NULL DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    -- Fuel Records (standalone refueling records, source of odometer truth)
    CREATE TABLE IF NOT EXISTS fuel_records (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      truck_id            INTEGER NOT NULL REFERENCES trucks(id),
      date                TEXT NOT NULL,
      liters              REAL,
      value               REAL NOT NULL DEFAULT 0,
      odometer_at_service REAL NOT NULL,
      supplier_id         INTEGER REFERENCES suppliers(id),
      notes               TEXT,
      created_at          TEXT DEFAULT (datetime('now'))
    );

    -- Customer Prices
    CREATE TABLE IF NOT EXISTS customer_prices (
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      price       REAL    NOT NULL,
      PRIMARY KEY (customer_id, product_id)
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Maintenance Types (oil change, tire rotation, etc.)
    CREATE TABLE IF NOT EXISTS maintenance_types (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      description  TEXT,
      interval_km  REAL NOT NULL DEFAULT 1000,
      is_active    INTEGER NOT NULL DEFAULT 1,
      is_deletable INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- Maintenance Records (history per truck)
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      truck_id            INTEGER NOT NULL REFERENCES trucks(id),
      maintenance_type_id INTEGER NOT NULL REFERENCES maintenance_types(id),
      date                TEXT NOT NULL,
      odometer_at_service REAL NOT NULL,
      notes               TEXT,
      created_at          TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for performance on frequent queries
    CREATE INDEX IF NOT EXISTS idx_trips_date      ON trips(date);
    CREATE INDEX IF NOT EXISTS idx_trips_truck     ON trips(truck_id);
    CREATE INDEX IF NOT EXISTS idx_trips_driver    ON trips(driver_id);
    CREATE INDEX IF NOT EXISTS idx_costs_date      ON costs(date);
    CREATE INDEX IF NOT EXISTS idx_costs_category  ON costs(category);
    CREATE INDEX IF NOT EXISTS idx_trip_fuel_stops_trip_id  ON trip_fuel_stops(trip_id);
    CREATE INDEX IF NOT EXISTS idx_customer_prices_customer_id ON customer_prices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_customer_prices_product_id ON customer_prices(product_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_records_truck ON maintenance_records(truck_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_records_type  ON maintenance_records(maintenance_type_id);
    CREATE INDEX IF NOT EXISTS idx_fuel_records_truck ON fuel_records(truck_id);
    CREATE INDEX IF NOT EXISTS idx_fuel_records_date  ON fuel_records(date);
    CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id);
    CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
  `)

  // Backfill: create an 'open' receivable for any pre-existing trip that doesn't have one yet.
  // Plain SQL, naturally idempotent — safe to run on every startup.
  db.exec(`
    INSERT INTO receivables (trip_id, customer_id, amount, status, created_at)
    SELECT id, customer_id, price_charged, 'open', created_at FROM trips
    WHERE id NOT IN (SELECT trip_id FROM receivables)
  `)

  // Seed: default admin user if none exists
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c
  if (userCount === 0) {
    const hash = bcrypt.hashSync('dezem2024', 10)
    db.prepare('INSERT INTO users (name, password_hash) VALUES (?, ?)').run('Admin', hash)
  }

  // Migration: Add overweight fields to trips if missing
  const tripInfo = db.pragma('table_info(trips)') as { name: string }[]
  if (!tripInfo.some((col) => col.name === 'overweight_ton')) {
    db.exec('ALTER TABLE trips ADD COLUMN overweight_ton REAL DEFAULT NULL')
  }
  if (!tripInfo.some((col) => col.name === 'overweight_observation')) {
    db.exec('ALTER TABLE trips ADD COLUMN overweight_observation TEXT DEFAULT NULL')
  }
  if (!tripInfo.some((col) => col.name === 'ticket_number')) {
    db.exec('ALTER TABLE trips ADD COLUMN ticket_number TEXT')
  }
  // Always ensure the unique index exists, even on databases where the column was
  // added before this index was introduced (previously this only ran once, alongside
  // the ALTER TABLE above, silently leaving older databases without the constraint).
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_ticket_number ON trips(ticket_number)')
  } catch (error) {
    // Duplicate ticket_number values may already exist from before this constraint
    // was enforced — don't crash startup; the app-level check in trips.handlers.ts
    // still blocks new duplicates going forward.
    console.error('Could not create unique index on trips.ticket_number:', error)
  }

  // Migration: Add tax fields to trips if missing
  if (!tripInfo.some((col) => col.name === 'has_percentage_tax')) {
    db.exec('ALTER TABLE trips ADD COLUMN has_percentage_tax INTEGER NOT NULL DEFAULT 0')
  }
  if (!tripInfo.some((col) => col.name === 'tax_value')) {
    db.exec('ALTER TABLE trips ADD COLUMN tax_value REAL NOT NULL DEFAULT 0')
    // Backfill: freeze the tax value for already-taxed trips using the rate configured today,
    // so existing trips don't suddenly show "no tax" until edited.
    const settingsRow = db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get('app_settings') as { value: string } | undefined
    let currentTaxRate = 0
    if (settingsRow) {
      try {
        currentTaxRate = JSON.parse(settingsRow.value).taxRate || 0
      } catch {
        currentTaxRate = 0
      }
    }
    if (currentTaxRate > 0) {
      db.prepare(
        'UPDATE trips SET tax_value = price_charged * ? / 100 WHERE has_percentage_tax = 1',
      ).run(currentTaxRate)
    }
  }

  // Migration: Add commission fields to trips if missing
  if (!tripInfo.some((col) => col.name === 'has_commission')) {
    db.exec('ALTER TABLE trips ADD COLUMN has_commission INTEGER NOT NULL DEFAULT 0')
  }
  if (!tripInfo.some((col) => col.name === 'commission_value')) {
    db.exec('ALTER TABLE trips ADD COLUMN commission_value REAL NOT NULL DEFAULT 0')
  }

  // Migration: Add unit_value to products if missing
  const productInfo = db.pragma('table_info(products)') as { name: string }[]
  if (!productInfo.some((col) => col.name === 'unit_value')) {
    db.exec('ALTER TABLE products ADD COLUMN unit_value REAL DEFAULT NULL')
  }

  // Migration: Add is_deletable to supplier_types if it doesn't exist
  const supplierTypeInfo = db.pragma('table_info(supplier_types)') as { name: string }[]
  if (!supplierTypeInfo.some((col) => col.name === 'is_deletable')) {
    db.exec('ALTER TABLE supplier_types ADD COLUMN is_deletable INTEGER NOT NULL DEFAULT 1')
    db.prepare(
      `UPDATE supplier_types SET is_deletable = 0 WHERE value IN ('gas_station', 'workshop', 'quarry', 'other')`,
    ).run()
  }

  // Migration: Add is_outsourced and contractor_id to trucks if missing
  const truckInfo = db.pragma('table_info(trucks)') as { name: string }[]
  if (!truckInfo.some((col) => col.name === 'is_outsourced')) {
    db.exec('ALTER TABLE trucks ADD COLUMN is_outsourced INTEGER NOT NULL DEFAULT 0')
  }
  if (!truckInfo.some((col) => col.name === 'contractor_id')) {
    db.exec('ALTER TABLE trucks ADD COLUMN contractor_id INTEGER REFERENCES contractors(id)')
  }

  // Migrations for customId - MUST run before trucks table recreation below
  const tablesWithCustomId = ['customers', 'products', 'suppliers', 'trucks', 'drivers']
  for (const tableName of tablesWithCustomId) {
    const tableInfo = db.pragma(`table_info(${tableName})`) as { name: string }[]
    if (!tableInfo.some((col) => col.name === 'customId')) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN customId INTEGER`)
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_${tableName}_customId ON ${tableName}(customId)`,
      )
    }
  }

  // Migration: Make model column nullable in trucks table
  const modelColumn = (truckInfo as any[]).find((col) => col.name === 'model')
  if (modelColumn && modelColumn.notnull === 1) {
    try {
      // SQLite requires recreating the table to change a column constraint
      // Temporarily disable foreign keys to avoid constraint violations during migration
      const fkState = db.pragma('foreign_keys', { simple: true })
      db.pragma('foreign_keys = OFF')

      db.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE trucks_new AS SELECT * FROM trucks;
        DROP TABLE trucks;
        CREATE TABLE trucks (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          customId         INTEGER UNIQUE,
          license_plate    TEXT NOT NULL UNIQUE,
          model            TEXT,
          year             INTEGER,
          capacity_ton     REAL,
          current_odometer REAL NOT NULL DEFAULT 0,
          is_outsourced    INTEGER NOT NULL DEFAULT 0,
          contractor_id    INTEGER REFERENCES contractors(id),
          created_at       TEXT DEFAULT (datetime('now'))
        );
        INSERT INTO trucks SELECT
          id, customId, license_plate, model, year, capacity_ton,
          current_odometer, COALESCE(is_outsourced, 0), contractor_id, created_at
        FROM trucks_new;
        DROP TABLE trucks_new;
        COMMIT;
      `)

      // Restore original foreign_keys state
      if (fkState) {
        db.pragma('foreign_keys = ON')
      }
    } catch (error) {
      // Ensure foreign_keys is restored even on error
      db.pragma('foreign_keys = ON')
      throw error
    }
  }

  // Migration: Add description column to receivables if missing (label for standalone/avulsa entries)
  const receivableInfo = db.pragma('table_info(receivables)') as { name: string }[]
  if (!receivableInfo.some((col) => col.name === 'description')) {
    db.exec('ALTER TABLE receivables ADD COLUMN description TEXT DEFAULT NULL')
  }

  // Migration: Make trip_id nullable in receivables table, to allow standalone (avulsa) entries
  // not tied to a trip.
  const receivableTripIdColumn = (receivableInfo as any[]).find((col) => col.name === 'trip_id')
  if (receivableTripIdColumn && receivableTripIdColumn.notnull === 1) {
    try {
      const fkState = db.pragma('foreign_keys', { simple: true })
      db.pragma('foreign_keys = OFF')

      db.exec(`
        BEGIN TRANSACTION;
        CREATE TABLE receivables_new AS SELECT * FROM receivables;
        DROP TABLE receivables;
        CREATE TABLE receivables (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id      INTEGER UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
          customer_id  INTEGER REFERENCES customers(id),
          amount       REAL NOT NULL DEFAULT 0,
          status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid')),
          due_date     TEXT DEFAULT NULL,
          paid_date    TEXT DEFAULT NULL,
          description  TEXT DEFAULT NULL,
          created_at   TEXT DEFAULT (datetime('now'))
        );
        INSERT INTO receivables SELECT
          id, trip_id, customer_id, amount, status, due_date, paid_date, description, created_at
        FROM receivables_new;
        DROP TABLE receivables_new;
        COMMIT;
      `)

      if (fkState) {
        db.pragma('foreign_keys = ON')
      }
    } catch (error) {
      db.pragma('foreign_keys = ON')
      throw error
    }
  }

  // Migration: Add is_outsourced and contractor_id to drivers if missing
  const driverInfo = db.pragma('table_info(drivers)') as { name: string }[]
  if (!driverInfo.some((col) => col.name === 'is_outsourced')) {
    db.exec('ALTER TABLE drivers ADD COLUMN is_outsourced INTEGER NOT NULL DEFAULT 0')
  }
  if (!driverInfo.some((col) => col.name === 'contractor_id')) {
    db.exec('ALTER TABLE drivers ADD COLUMN contractor_id INTEGER REFERENCES contractors(id)')
  }

  // Migration: Add commission_rate_override to drivers if missing
  // NULL means the driver uses the global default commission rate.
  if (!driverInfo.some((col) => col.name === 'commission_rate_override')) {
    db.exec('ALTER TABLE drivers ADD COLUMN commission_rate_override REAL DEFAULT NULL')
  }

  // Migration: Add installment fields to costs if missing
  const costInfo = db.pragma('table_info(costs)') as { name: string }[]
  if (!costInfo.some((col) => col.name === 'installment_group_id')) {
    db.exec('ALTER TABLE costs ADD COLUMN installment_group_id TEXT DEFAULT NULL')
  }
  if (!costInfo.some((col) => col.name === 'installment_number')) {
    db.exec('ALTER TABLE costs ADD COLUMN installment_number INTEGER DEFAULT NULL')
  }
  if (!costInfo.some((col) => col.name === 'installment_total')) {
    db.exec('ALTER TABLE costs ADD COLUMN installment_total INTEGER DEFAULT NULL')
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_costs_installment_group ON costs(installment_group_id)')

  // Seed: default supplier types if none exist
  const supplierTypeCount = (db.prepare('SELECT COUNT(*) as c FROM supplier_types').get() as any).c
  if (supplierTypeCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO supplier_types (value, label, is_deletable) VALUES (?, ?, ?)',
    )
    const transaction = db.transaction((types) => {
      for (const type of types) {
        stmt.run(type.value, type.label, type.is_deletable)
      }
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
      for (const type of types) {
        stmt.run(type.value, type.label, type.is_deletable)
      }
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

  // Seed: default maintenance types if none exist
  const maintenanceTypeCount = (
    db.prepare('SELECT COUNT(*) as c FROM maintenance_types').get() as any
  ).c
  if (maintenanceTypeCount === 0) {
    const stmt = db.prepare(
      'INSERT INTO maintenance_types (name, description, interval_km, is_deletable) VALUES (?, ?, ?, ?)',
    )
    const transaction = db.transaction((types) => {
      for (const type of types) {
        stmt.run(type.name, type.description, type.interval_km, type.is_deletable)
      }
    })
    transaction([
      {
        name: 'Troca de Óleo',
        description: 'Troca de óleo do motor',
        interval_km: 1000,
        is_deletable: 0,
      },
      {
        name: 'Rodízio de Pneus',
        description: 'Rodízio e verificação dos pneus',
        interval_km: 5000,
        is_deletable: 0,
      },
    ])
  }

  console.log('[DB] SQLite ready at:', dbPath)
}
