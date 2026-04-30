mod db;
mod models;
mod commands;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let conn = db::init_db(app.handle())?;
      app.manage(Mutex::new(conn));

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::auth_login,
      commands::auth_change_password,
      commands::customers_list,
      commands::customers_create,
      commands::customers_update,
      commands::customers_delete,
      commands::products_list,
      commands::products_create,
      commands::products_update,
      commands::products_delete,
      commands::suppliers_list,
      commands::suppliers_create,
      commands::suppliers_update,
      commands::suppliers_delete,
      commands::trucks_list,
      commands::trucks_create,
      commands::trucks_update,
      commands::trucks_delete,
      commands::drivers_list,
      commands::drivers_create,
      commands::drivers_update,
      commands::drivers_delete,
      commands::routes_list,
      commands::routes_create,
      commands::trips_list,
      commands::trips_create,
      commands::trips_delete,
      commands::costs_list,
      commands::costs_create,
      commands::costs_delete,
      commands::costs_issue_monthly_salaries,
      commands::dashboard_summary,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
