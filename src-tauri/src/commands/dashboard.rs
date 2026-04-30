use crate::models::{CategorySummary, DashboardSummary, ProductSummary, TruckSummary};
use crate::state::DbState;
use rusqlite::{params, Result};

#[tauri::command]
pub fn dashboard_summary(
    start_date: String,
    end_date: String,
    state: DbState,
) -> Result<DashboardSummary, String> {
    let conn = state.lock().unwrap();

    let revenue: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(price_charged), 0) FROM trips WHERE date BETWEEN ? AND ?",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let cost: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(value), 0) FROM costs WHERE date BETWEEN ? AND ?",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_trips: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM trips WHERE date BETWEEN ? AND ?",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_km: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(km_driven), 0) FROM trips WHERE date BETWEEN ? AND ?",
            params![start_date, end_date],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
        SELECT t.license_plate, t.model,
            COALESCE(SUM(tr.price_charged), 0) as revenue,
            COALESCE(SUM(tr.km_driven), 0) as km
        FROM trucks t
        LEFT JOIN trips tr ON tr.truck_id = t.id AND tr.date BETWEEN ? AND ?
        GROUP BY t.id
        ORDER BY revenue DESC
    ",
        )
        .map_err(|e| e.to_string())?;

    let per_truck = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(TruckSummary {
                license_plate: row.get(0)?,
                model: row.get(1)?,
                revenue: row.get(2)?,
                km: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
        SELECT p.name,
            COALESCE(SUM(t.weight_ton), 0) as tonnage,
            COUNT(t.id) as trips
        FROM products p
        LEFT JOIN trips t ON t.product_id = p.id AND t.date BETWEEN ? AND ?
        GROUP BY p.id
        ORDER BY tonnage DESC
    ",
        )
        .map_err(|e| e.to_string())?;

    let per_product = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(ProductSummary {
                name: row.get(0)?,
                tonnage: row.get(1)?,
                trips: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "
        SELECT category, COALESCE(SUM(value), 0) as total
        FROM costs WHERE date BETWEEN ? AND ?
        GROUP BY category ORDER BY total DESC
    ",
        )
        .map_err(|e| e.to_string())?;

    let per_category = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(CategorySummary {
                category: row.get(0)?,
                total: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(DashboardSummary {
        revenue,
        cost,
        profit: revenue - cost,
        total_trips,
        total_km,
        per_truck,
        per_product,
        per_category,
    })
}
