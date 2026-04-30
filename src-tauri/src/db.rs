use rusqlite::{params, Connection, Result};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;
use bcrypt::{hash, DEFAULT_COST};

pub fn init_db(app: &AppHandle) -> Result<Connection, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let db_path = app_dir.join("dezem.db");
    
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    conn.pragma_update(None, "journal_mode", "WAL").map_err(|e| e.to_string())?;
    conn.pragma_update(None, "foreign_keys", "ON").map_err(|e| e.to_string())?;

    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            password_hash TEXT   NOT NULL,
            created_at    TEXT    DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS customers (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            cnpj       TEXT,
            ie         TEXT,
            phone      TEXT,
            address    TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS products (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            unit       TEXT NOT NULL DEFAULT 'ton',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            type       TEXT NOT NULL CHECK(type IN ('gas_station','workshop','quarry','other')),
            phone      TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS trucks (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            license_plate    TEXT NOT NULL UNIQUE,
            model            TEXT NOT NULL,
            year             INTEGER,
            capacity_ton     REAL,
            current_odometer REAL NOT NULL DEFAULT 0,
            created_at       TEXT DEFAULT (datetime('now'))
        );

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

        CREATE TABLE IF NOT EXISTS routes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            distance_km REAL,
            created_at  TEXT DEFAULT (datetime('now'))
        );

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

        CREATE TABLE IF NOT EXISTS costs (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            date          TEXT NOT NULL,
            category      TEXT NOT NULL CHECK(category IN ('fuel','oil','maintenance','salary','toll','others')),
            value         REAL NOT NULL,
            truck_id      INTEGER REFERENCES trucks(id),
            supplier_id   INTEGER REFERENCES suppliers(id),
            driver_id     INTEGER REFERENCES drivers(id),
            description   TEXT,
            created_at    TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_trips_date      ON trips(date);
        CREATE INDEX IF NOT EXISTS idx_trips_truck     ON trips(truck_id);
        CREATE INDEX IF NOT EXISTS idx_trips_driver    ON trips(driver_id);
        CREATE INDEX IF NOT EXISTS idx_costs_date      ON costs(date);
        CREATE INDEX IF NOT EXISTS idx_costs_category  ON costs(category);
    ").map_err(|e| e.to_string())?;

    // Seed
    let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0)).map_err(|e| e.to_string())?;
    if user_count == 0 {
        let hashed = hash("dezem2024", DEFAULT_COST).map_err(|e| e.to_string())?;
        conn.execute("INSERT INTO users (name, password_hash) VALUES (?, ?)", params!["Admin", hashed]).map_err(|e| e.to_string())?;
    }

    Ok(conn)
}
