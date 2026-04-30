use crate::models::*;
use rusqlite::{params, Connection, Result};
use std::sync::Mutex;
use tauri::State;
use bcrypt::{hash, verify, DEFAULT_COST};

pub type DbState<'a> = State<'a, Mutex<Connection>>;

// ── AUTH ────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn auth_login(password: String, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id, name, password_hash, created_at FROM users LIMIT 1").map_err(|e| e.to_string())?;
    let user = stmt.query_row([], |row| {
        Ok(User {
            id: row.get(0)?,
            name: row.get(1)?,
            password_hash: row.get(2)?,
            created_at: row.get(3)?,
        })
    });

    match user {
        Ok(user) => {
            let ok = verify(password, &user.password_hash).unwrap_or(false);
            if ok {
                Ok(serde_json::json!({ "ok": true, "name": user.name }))
            } else {
                Ok(serde_json::json!({ "ok": false, "error": "Senha incorreta" }))
            }
        }
        Err(_) => Ok(serde_json::json!({ "ok": false, "error": "Nenhum usuário cadastrado" }))
    }
}

#[tauri::command]
pub fn auth_change_password(current: String, next: String, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    let user: (i32, String) = conn.query_row("SELECT id, password_hash FROM users LIMIT 1", [], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).map_err(|e| e.to_string())?;

    if !verify(current, &user.1).unwrap_or(false) {
        return Ok(serde_json::json!({ "ok": false, "error": "Senha atual incorreta" }));
    }

    let hashed = hash(next, DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", params![hashed, user.0]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── CUSTOMERS ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn customers_list(search: Option<String>, state: DbState) -> Result<Vec<Customer>, String> {
    let conn = state.lock().unwrap();
    let search_val = format!("%{}%", search.unwrap_or_default());
    let mut stmt = conn.prepare("SELECT * FROM customers WHERE name LIKE ? ORDER BY name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([search_val], |row| {
        Ok(Customer {
            id: row.get(0)?,
            name: row.get(1)?,
            cnpj: row.get(2)?,
            ie: row.get(3)?,
            phone: row.get(4)?,
            address: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut customers = Vec::new();
    for customer in rows {
        customers.push(customer.map_err(|e| e.to_string())?);
    }
    Ok(customers)
}

#[tauri::command]
pub fn customers_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO customers (name, cnpj, ie, phone, address) VALUES (?,?,?,?,?)",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["cnpj"].as_str(),
            data["ie"].as_str(),
            data["phone"].as_str(),
            data["address"].as_str(),
        ],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
pub fn customers_update(id: i32, data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "UPDATE customers SET name=?, cnpj=?, ie=?, phone=?, address=? WHERE id=?",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["cnpj"].as_str(),
            data["ie"].as_str(),
            data["phone"].as_str(),
            data["address"].as_str(),
            id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn customers_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM customers WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── PRODUCTS ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn products_list(search: Option<String>, state: DbState) -> Result<Vec<Product>, String> {
    let conn = state.lock().unwrap();
    let search_val = format!("%{}%", search.unwrap_or_default());
    let mut stmt = conn.prepare("SELECT * FROM products WHERE name LIKE ? ORDER BY name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([search_val], |row| {
        Ok(Product {
            id: row.get(0)?,
            name: row.get(1)?,
            unit: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut products = Vec::new();
    for product in rows {
        products.push(product.map_err(|e| e.to_string())?);
    }
    Ok(products)
}

#[tauri::command]
pub fn products_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO products (name, unit) VALUES (?,?)",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["unit"].as_str().unwrap_or("ton"),
        ],
    ).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
pub fn products_update(id: i32, data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("UPDATE products SET name=?, unit=? WHERE id=?", params![data["name"].as_str(), data["unit"].as_str(), id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn products_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM products WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── SUPPLIERS ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn suppliers_list(search: Option<String>, state: DbState) -> Result<Vec<Supplier>, String> {
    let conn = state.lock().unwrap();
    let search_val = format!("%{}%", search.unwrap_or_default());
    let mut stmt = conn.prepare("SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([search_val], |row| {
        Ok(Supplier {
            id: row.get(0)?,
            name: row.get(1)?,
            r#type: row.get(2)?,
            phone: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut suppliers = Vec::new();
    for s in rows { suppliers.push(s.map_err(|e| e.to_string())?); }
    Ok(suppliers)
}

#[tauri::command]
pub fn suppliers_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO suppliers (name, type, phone) VALUES (?,?,?)",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["type"].as_str().unwrap_or("other"),
            data["phone"].as_str(),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn suppliers_update(id: i32, data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "UPDATE suppliers SET name=?, type=?, phone=? WHERE id=?",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["type"].as_str().unwrap_or("other"),
            data["phone"].as_str(),
            id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn suppliers_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM suppliers WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── TRUCKS ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn trucks_list(state: DbState) -> Result<Vec<Truck>, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM trucks ORDER BY license_plate").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Truck {
            id: row.get(0)?,
            license_plate: row.get(1)?,
            model: row.get(2)?,
            year: row.get(3)?,
            capacity_ton: row.get(4)?,
            current_odometer: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut trucks = Vec::new();
    for truck in rows {
        trucks.push(truck.map_err(|e| e.to_string())?);
    }
    Ok(trucks)
}

#[tauri::command]
pub fn trucks_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO trucks (license_plate, model, year, capacity_ton, current_odometer) VALUES (?,?,?,?,?)",
        params![
            data["license_plate"].as_str(),
            data["model"].as_str(),
            data["year"].as_i64(),
            data["capacity_ton"].as_f64(),
            data["current_odometer"].as_f64().unwrap_or(0.0),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn trucks_update(id: i32, data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "UPDATE trucks SET license_plate=?, model=?, year=?, capacity_ton=? WHERE id=?",
        params![
            data["license_plate"].as_str(),
            data["model"].as_str(),
            data["year"].as_i64(),
            data["capacity_ton"].as_f64(),
            id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn trucks_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM trucks WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── DRIVERS ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn drivers_list(state: DbState) -> Result<Vec<Driver>, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn.prepare("
        SELECT d.*, t.license_plate as truck_license_plate
        FROM drivers d
        LEFT JOIN trucks t ON d.truck_id = t.id
        ORDER BY d.name
    ").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Driver {
            id: row.get(0)?,
            name: row.get(1)?,
            cpf: row.get(2)?,
            phone: row.get(3)?,
            monthly_salary: row.get(4)?,
            truck_id: row.get(5)?,
            active: row.get(6)?,
            created_at: row.get(7)?,
            truck_license_plate: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut drivers = Vec::new();
    for d in rows { drivers.push(d.map_err(|e| e.to_string())?); }
    Ok(drivers)
}

#[tauri::command]
pub fn drivers_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO drivers (name, cpf, phone, monthly_salary, truck_id) VALUES (?,?,?,?,?)",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["cpf"].as_str(),
            data["phone"].as_str(),
            data["monthly_salary"].as_f64().unwrap_or(0.0),
            data["truck_id"].as_i64(),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn drivers_update(id: i32, data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "UPDATE drivers SET name=?, cpf=?, phone=?, monthly_salary=?, truck_id=? WHERE id=?",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["cpf"].as_str(),
            data["phone"].as_str(),
            data["monthly_salary"].as_f64().unwrap_or(0.0),
            data["truck_id"].as_i64(),
            id
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn drivers_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM drivers WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── ROUTES ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn routes_list(state: DbState) -> Result<Vec<Route>, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM routes ORDER BY name").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Route {
            id: row.get(0)?,
            name: row.get(1)?,
            distance_km: row.get(2)?,
            created_at: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut routes = Vec::new();
    for r in rows { routes.push(r.map_err(|e| e.to_string())?); }
    Ok(routes)
}

#[tauri::command]
pub fn routes_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO routes (name, distance_km) VALUES (?,?)",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["distance_km"].as_f64(),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

// ── TRIPS ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn trips_list(filters: serde_json::Value, state: DbState) -> Result<Vec<Trip>, String> {
    let conn = state.lock().unwrap();
    let mut query = "
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
    ".to_string();
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(start) = filters["startDate"].as_str() {
        query += " AND t.date >= ?";
        params.push(Box::new(start.to_string()));
    }
    if let Some(end) = filters["endDate"].as_str() {
        query += " AND t.date <= ?";
        params.push(Box::new(end.to_string()));
    }
    if let Some(truck_id) = filters["truck_id"].as_i64() {
        query += " AND t.truck_id = ?";
        params.push(Box::new(truck_id));
    }
    if let Some(driver_id) = filters["driver_id"].as_i64() {
        query += " AND t.driver_id = ?";
        params.push(Box::new(driver_id));
    }
    query += " ORDER BY t.date DESC";

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(rusqlite::params_from_iter(param_refs), |row| {
        Ok(Trip {
            id: row.get(0)?,
            date: row.get(1)?,
            truck_id: row.get(2)?,
            driver_id: row.get(3)?,
            product_id: row.get(4)?,
            customer_id: row.get(5)?,
            route_id: row.get(6)?,
            supplier_id: row.get(7)?,
            weight_ton: row.get(8)?,
            price_charged: row.get(9)?,
            km_driven: row.get(10)?,
            observation: row.get(11)?,
            created_at: row.get(12)?,
            truck_license_plate: row.get(13)?,
            truck_model: row.get(14)?,
            driver_name: row.get(15)?,
            product_name: row.get(16)?,
            customer_name: row.get(17)?,
            route_name: row.get(18)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut trips = Vec::new();
    for t in rows { trips.push(t.map_err(|e| e.to_string())?); }
    Ok(trips)
}

#[tauri::command]
pub fn trips_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let mut conn = state.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    tx.execute(
        "INSERT INTO trips (date, truck_id, driver_id, product_id, customer_id, route_id, supplier_id, weight_ton, price_charged, km_driven, observation)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        params![
            data["date"].as_str().unwrap_or_default(),
            data["truck_id"].as_i64().unwrap_or(0),
            data["driver_id"].as_i64().unwrap_or(0),
            data["product_id"].as_i64().unwrap_or(0),
            data["customer_id"].as_i64(),
            data["route_id"].as_i64(),
            data["supplier_id"].as_i64(),
            data["weight_ton"].as_f64().unwrap_or(0.0),
            data["price_charged"].as_f64().unwrap_or(0.0),
            data["km_driven"].as_f64().unwrap_or(0.0),
            data["observation"].as_str(),
        ],
    ).map_err(|e| e.to_string())?;
    
    let id = tx.last_insert_rowid();
    
    tx.execute(
        "UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?",
        params![data["km_driven"].as_f64().unwrap_or(0.0), data["truck_id"].as_i64().unwrap_or(0)],
    ).map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
pub fn trips_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM trips WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

// ── COSTS ───────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn costs_list(filters: serde_json::Value, state: DbState) -> Result<Vec<Cost>, String> {
    let conn = state.lock().unwrap();
    let mut query = "
        SELECT co.*,
            t.license_plate as truck_license_plate,
            s.name          as supplier_name,
            d.name          as driver_name
        FROM costs co
        LEFT JOIN trucks t ON co.truck_id = t.id
        LEFT JOIN suppliers s ON co.supplier_id = s.id
        LEFT JOIN drivers d ON co.driver_id = d.id
        WHERE 1=1
    ".to_string();
    
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(start) = filters["startDate"].as_str() {
        query += " AND co.date >= ?";
        params.push(Box::new(start.to_string()));
    }
    if let Some(end) = filters["endDate"].as_str() {
        query += " AND co.date <= ?";
        params.push(Box::new(end.to_string()));
    }
    if let Some(category) = filters["category"].as_str() {
        query += " AND co.category = ?";
        params.push(Box::new(category.to_string()));
    }
    if let Some(truck_id) = filters["truck_id"].as_i64() {
        query += " AND co.truck_id = ?";
        params.push(Box::new(truck_id));
    }
    query += " ORDER BY co.date DESC";

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(rusqlite::params_from_iter(param_refs), |row| {
        Ok(Cost {
            id: row.get(0)?,
            date: row.get(1)?,
            category: row.get(2)?,
            value: row.get(3)?,
            truck_id: row.get(4)?,
            supplier_id: row.get(5)?,
            driver_id: row.get(6)?,
            description: row.get(7)?,
            created_at: row.get(8)?,
            truck_license_plate: row.get(9)?,
            supplier_name: row.get(10)?,
            driver_name: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut costs = Vec::new();
    for c in rows { costs.push(c.map_err(|e| e.to_string())?); }
    Ok(costs)
}

#[tauri::command]
pub fn costs_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO costs (date, category, value, truck_id, supplier_id, driver_id, description) VALUES (?,?,?,?,?,?,?)",
        params![
            data["date"].as_str().unwrap_or_default(),
            data["category"].as_str().unwrap_or("others"),
            data["value"].as_f64().unwrap_or(0.0),
            data["truck_id"].as_i64(),
            data["supplier_id"].as_i64(),
            data["driver_id"].as_i64(),
            data["description"].as_str(),
        ],
    ).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn costs_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM costs WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn costs_issue_monthly_salaries(month_year: String, state: DbState) -> Result<serde_json::Value, String> {
    let mut conn = state.lock().unwrap();
    
    let mut stmt = conn.prepare("SELECT id, name, monthly_salary FROM drivers WHERE active = 1").map_err(|e| e.to_string())?;
    let drivers: Vec<(i32, String, f64)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let date = format!("{}-01", month_year);
    let mut issued = 0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (id, name, salary) in drivers {
        let exists: bool = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM costs WHERE category='salary' AND driver_id=? AND date LIKE ?)",
            params![id, format!("{}%", month_year)],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        if !exists {
            tx.execute(
                "INSERT INTO costs (date, category, value, driver_id, description) VALUES (?, 'salary', ?, ?, ?)",
                params![&date, salary, id, format!("Salário {} — {}", name, month_year)],
            ).map_err(|e| e.to_string())?;
            issued += 1;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "ok": true, "issued": issued }))
}

// ── DASHBOARD ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn dashboard_summary(start_date: String, end_date: String, state: DbState) -> Result<DashboardSummary, String> {
    let conn = state.lock().unwrap();
    
    let revenue: f64 = conn.query_row(
        "SELECT COALESCE(SUM(price_charged), 0) FROM trips WHERE date BETWEEN ? AND ?",
        params![start_date, end_date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let cost: f64 = conn.query_row(
        "SELECT COALESCE(SUM(value), 0) FROM costs WHERE date BETWEEN ? AND ?",
        params![start_date, end_date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let total_trips: i32 = conn.query_row(
        "SELECT COUNT(*) FROM trips WHERE date BETWEEN ? AND ?",
        params![start_date, end_date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let total_km: f64 = conn.query_row(
        "SELECT COALESCE(SUM(km_driven), 0) FROM trips WHERE date BETWEEN ? AND ?",
        params![start_date, end_date],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("
        SELECT t.license_plate, t.model,
            COALESCE(SUM(tr.price_charged), 0) as revenue,
            COALESCE(SUM(tr.km_driven), 0) as km
        FROM trucks t
        LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.date BETWEEN ? AND ?
        GROUP BY t.id
        ORDER BY revenue DESC
    ").map_err(|e| e.to_string())?;
    
    let per_truck = stmt.query_map(params![start_date, end_date], |row| {
        Ok(TruckSummary {
            license_plate: row.get(0)?,
            model: row.get(1)?,
            revenue: row.get(2)?,
            km: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("
        SELECT p.name,
            COALESCE(SUM(t.weight_ton), 0) as tonnage,
            COUNT(t.id) as trips
        FROM products p
        LEFT JOIN trips t ON t.product_id = p.id AND t.date BETWEEN ? AND ?
        GROUP BY p.id
        ORDER BY tonnage DESC
    ").map_err(|e| e.to_string())?;
    
    let per_product = stmt.query_map(params![start_date, end_date], |row| {
        Ok(ProductSummary {
            name: row.get(0)?,
            tonnage: row.get(1)?,
            trips: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("
        SELECT category, COALESCE(SUM(value), 0) as total
        FROM costs WHERE date BETWEEN ? AND ?
        GROUP BY category ORDER BY total DESC
    ").map_err(|e| e.to_string())?;
    
    let per_category = stmt.query_map(params![start_date, end_date], |row| {
        Ok(CategorySummary {
            category: row.get(0)?,
            total: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(DashboardSummary {
        revenue,
        cost,
        profit: revenue - cost,
        total_trips,
        total_km,
        per_truck,
        per_product,
        per_category,
    })
}
