use crate::models::User;
use crate::state::DbState;
use bcrypt::{hash, verify, DEFAULT_COST};
use rusqlite::params;

#[tauri::command]
pub fn auth_login(password: String, state: DbState) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, password_hash, created_at FROM users LIMIT 1")
        .map_err(|e| e.to_string())?;
    
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
        Err(_) => Ok(serde_json::json!({ "ok": false, "error": "Nenhum usuário cadastrado" })),
    }
}

#[tauri::command]
pub fn auth_change_password(
    current: String,
    next: String,
    state: DbState,
) -> Result<serde_json::Value, String> {
    let conn = state.lock().unwrap();
    let user: (i32, String) = conn
        .query_row("SELECT id, password_hash FROM users LIMIT 1", [], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| e.to_string())?;

    if !verify(current, &user.1).unwrap_or(false) {
        return Ok(serde_json::json!({ "ok": false, "error": "Senha atual incorreta" }));
    }

    let hashed = hash(next, DEFAULT_COST).map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        params![hashed, user.0],
    )
    .map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "ok": true }))
}
