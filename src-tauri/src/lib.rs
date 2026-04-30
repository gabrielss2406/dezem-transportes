mod commands;
mod db;
mod models;
mod state;

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
            commands::auth::auth_login,
            commands::auth::auth_change_password,
            commands::customers::customers_list,
            commands::customers::customers_create,
            commands::customers::customers_update,
            commands::customers::customers_delete,
            commands::products::products_list,
            commands::products::products_create,
            commands::products::products_update,
            commands::products::products_delete,
            commands::suppliers::suppliers_list,
            commands::suppliers::suppliers_create,
            commands::suppliers::suppliers_update,
            commands::suppliers::suppliers_delete,
            commands::trucks::trucks_list,
            commands::trucks::trucks_create,
            commands::trucks::trucks_update,
            commands::trucks::trucks_delete,
            commands::drivers::drivers_list,
            commands::drivers::drivers_create,
            commands::drivers::drivers_update,
            commands::drivers::drivers_delete,
            commands::routes::routes_list,
            commands::routes::routes_create,
            commands::trips::trips_list,
            commands::trips::trips_create,
            commands::trips::trips_delete,
            commands::costs::costs_list,
            commands::costs::costs_create,
            commands::costs::costs_delete,
            commands::costs::costs_issue_monthly_salaries,
            commands::dashboard::dashboard_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
