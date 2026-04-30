use crate::models::Truck;
use crate::state::DbState;
use rusqlite::params;

#[tauri::command]
pub fn trucks_list(state: DbState) -> Result<Vec<Truck>, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT * FROM trucks ORDER BY license_plate")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Truck {
                id: row.get(0)?,
                license_plate: row.get(1)?,
                model: row.get(2)?,
                year: row.get(3)?,
                capacity_ton: row.get(4)?,
                current_odometer: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn trucks_update(
    id: i32,
    data: serde_json::Value,
    state: DbState,
) -> Result<serde_json::Value, String> {
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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn trucks_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM trucks WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
