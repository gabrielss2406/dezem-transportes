use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

pub type DbState<'a> = State<'a, Mutex<Connection>>;
