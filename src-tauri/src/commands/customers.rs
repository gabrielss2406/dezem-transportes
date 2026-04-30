use crate::models::Customer;
use crate::state::DbState;
use rusqlite::params;

#[tauri::command]
pub fn customers_list(search: Option<String>, state: DbState) -> Result<Vec<Customer>, String> {
    let conn = state.lock().unwrap();
    let search_val = format!("%{}%", search.unwrap_or_default());
    let mut stmt = conn
        .prepare("SELECT * FROM customers WHERE name LIKE ? ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([search_val], |row| {
            Ok(Customer {
                id: row.get(0)?,
                name: row.get(1)?,
                cnpj: row.get(2)?,
                ie: row.get(3)?,
                phone: row.get(4)?,
                address: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

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
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    Ok(serde_json::json!({ "id": id }))
}

#[tauri::command]
pub fn customers_update(
    id: i32,
    data: serde_json::Value,
    state: DbState,
) -> Result<serde_json::Value, String> {
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
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}

#[tauri::command]
pub fn customers_delete(id: i32, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    conn.execute("DELETE FROM customers WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
