use crate::models::Supplier;
use crate::state::DbState;
use rusqlite::params;

#[tauri::command]
pub fn suppliers_list(search: Option<String>, state: DbState) -> Result<Vec<Supplier>, String> {
    let conn = state.lock().unwrap();
    let search_val = format!("%{}%", search.unwrap_or_default());
    let mut stmt = conn
        .prepare("SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([search_val], |row| {
            Ok(Supplier {
                id: row.get(0)?,
                name: row.get(1)?,
                r#type: row.get(2)?,
                phone: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut suppliers = Vec::new();
    for s in rows {
        suppliers.push(s.map_err(|e| e.to_string())?);
    }
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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}

#[tauri::command]
pub fn suppliers_update(
    id: i32,
    data: serde_json::Value,
    state: DbState,
) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "UPDATE suppliers SET name=?, type=?, phone=? WHERE id=?",
        params![
            data["name"].as_str().unwrap_or_default(),
            data["type"].as_str().unwrap_or("other"),
            data["phone"].as_str(),
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn suppliers_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM suppliers WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
