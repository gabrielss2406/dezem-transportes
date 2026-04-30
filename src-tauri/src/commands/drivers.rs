use crate::models::Driver;
use crate::state::DbState;
use rusqlite::params;

#[tauri::command]
pub fn drivers_list(state: DbState) -> Result<Vec<Driver>, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "
        SELECT d.*, t.license_plate as truck_license_plate
        FROM drivers d
        LEFT JOIN trucks t ON d.truck_id = t.id
        ORDER BY d.name
    ",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
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
        })
        .map_err(|e| e.to_string())?;
    let mut drivers = Vec::new();
    for d in rows {
        drivers.push(d.map_err(|e| e.to_string())?);
    }
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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn drivers_update(
    id: i32,
    data: serde_json::Value,
    state: DbState,
) -> Result<serde_json::Value, String> {
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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn drivers_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM drivers WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
