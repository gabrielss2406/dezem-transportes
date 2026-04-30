use crate::models::Trip;
use crate::state::DbState;
use rusqlite::params;

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
    "
    .to_string();

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
    let rows = stmt
        .query_map(rusqlite::params_from_iter(param_refs), |row| {
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
        })
        .map_err(|e| e.to_string())?;

    let mut trips = Vec::new();
    for t in rows {
        trips.push(t.map_err(|e| e.to_string())?);
    }
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
    )
    .map_err(|e| e.to_string())?;

    let id = tx.last_insert_rowid();

    tx.execute(
        "UPDATE trucks SET current_odometer = current_odometer + ? WHERE id = ?",
        params![
            data["km_driven"].as_f64().unwrap_or(0.0),
            data["truck_id"].as_i64().unwrap_or(0)
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
pub fn trips_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM trips WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
