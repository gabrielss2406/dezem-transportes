use crate::models::Route;
use crate::state::DbState;
use rusqlite::params;

#[tauri::command]
pub fn routes_list(state: DbState) -> Result<Vec<Route>, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT * FROM routes ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Route {
                id: row.get(0)?,
                name: row.get(1)?,
                distance_km: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut routes = Vec::new();
    for r in rows {
        routes.push(r.map_err(|e| e.to_string())?);
    }
    Ok(routes)
}

#[tauri::command]
pub fn routes_create(data: serde_json::Value, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "INSERT INTO routes (name, distance_km) VALUES (?,?)",
        params![data["name"].as_str().unwrap_or_default(), data["distance_km"].as_f64(),],
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
}
