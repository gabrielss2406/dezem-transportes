use crate::models::Cost;
use crate::state::DbState;
use rusqlite::{params, Result};

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
    "
    .to_string();

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
    let rows = stmt
        .query_map(rusqlite::params_from_iter(param_refs), |row| {
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
        })
        .map_err(|e| e.to_string())?;

    let mut costs = Vec::new();
    for c in rows {
        costs.push(c.map_err(|e| e.to_string())?);
    }
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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn costs_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM costs WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn costs_issue_monthly_salaries(
    month_year: String,
    state: DbState,
) -> Result<serde_json::Value, String> {
    let mut conn = state.lock().unwrap();

    let mut stmt = conn
        .prepare("SELECT id, name, monthly_salary FROM drivers WHERE active = 1")
        .map_err(|e| e.to_string())?;
    let drivers: Vec<(i32, String, f64)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let date = format!("{}-01", month_year);
    let mut issued = 0;

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for (id, name, salary) in drivers {
        let exists: bool = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM costs WHERE category='salary' AND driver_id=? AND date LIKE ?)",
                params![id, format!("{}%", month_year)],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if !exists {
            tx.execute(
                "INSERT INTO costs (date, category, value, driver_id, description) VALUES (?, 'salary', ?, ?, ?)",
                params![&date, salary, id, format!("Salário {} — {}", name, month_year)],
            )
            .map_err(|e| e.to_string())?;
            issued += 1;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "ok": true, "issued": issued }))
}
