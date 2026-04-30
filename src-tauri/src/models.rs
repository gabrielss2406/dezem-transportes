use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub password_hash: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Customer {
    pub id: i32,
    pub name: String,
    pub cnpj: Option<String>,
    pub ie: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub unit: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Supplier {
    pub id: i32,
    pub name: String,
    pub r#type: String,
    pub phone: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Truck {
    pub id: i32,
    pub license_plate: String,
    pub model: String,
    pub year: Option<i32>,
    pub capacity_ton: Option<f64>,
    pub current_odometer: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Driver {
    pub id: i32,
    pub name: String,
    pub cpf: Option<String>,
    pub phone: Option<String>,
    pub monthly_salary: f64,
    pub truck_id: Option<i32>,
    pub truck_license_plate: Option<String>,
    pub active: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Route {
    pub id: i32,
    pub name: String,
    pub distance_km: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Trip {
    pub id: i32,
    pub date: String,
    pub truck_id: i32,
    pub truck_license_plate: Option<String>,
    pub truck_model: Option<String>,
    pub driver_id: i32,
    pub driver_name: Option<String>,
    pub product_id: i32,
    pub product_name: Option<String>,
    pub customer_id: Option<i32>,
    pub customer_name: Option<String>,
    pub route_id: Option<i32>,
    pub route_name: Option<String>,
    pub supplier_id: Option<i32>,
    pub weight_ton: f64,
    pub price_charged: f64,
    pub km_driven: f64,
    pub observation: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Cost {
    pub id: i32,
    pub date: String,
    pub category: String,
    pub value: f64,
    pub truck_id: Option<i32>,
    pub truck_license_plate: Option<String>,
    pub supplier_id: Option<i32>,
    pub supplier_name: Option<String>,
    pub driver_id: Option<i32>,
    pub driver_name: Option<String>,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub revenue: f64,
    pub cost: f64,
    pub profit: f64,
    pub total_trips: i32,
    pub total_km: f64,
    pub per_truck: Vec<TruckSummary>,
    pub per_product: Vec<ProductSummary>,
    pub per_category: Vec<CategorySummary>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TruckSummary {
    pub license_plate: String,
    pub model: String,
    pub revenue: f64,
    pub km: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProductSummary {
    pub name: String,
    pub tonnage: f64,
    pub trips: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorySummary {
    pub category: String,
    pub total: f64,
}
