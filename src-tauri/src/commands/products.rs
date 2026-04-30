use crate::models::Product;
use crate::state::DbState;
use rusqlite::params;

#[tauri::command]
pub fn products_list(search: Option<String>, state: DbState) -> Result<Vec<Product>, String> {
    let conn = state.lock().unwrap();
    let search_val = format!("%{}%", search.unwrap_or_default());
    let mut stmt = conn
        .prepare("SELECT * FROM products WHERE name LIKE ? ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([search_val], |row| {
            Ok(Product {
                id: row.get(0)?,
                name: row.get(1)?,
                unit: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;

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
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
pub fn products_update(
    id: i32,
    data: serde_json::Value,
    state: DbState,
) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute(
        "UPDATE products SET name=?, unit=? WHERE id=?",
        params![data["name"].as_str(), data["unit"].as_str(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn products_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM products WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
