use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct Budget {
    pub id: i64,
    pub workspace_id: i64,
    pub category_id: i64,
    pub amount_minor: i64,
    pub month: i64,
    pub year: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateBudgetInput {
    pub workspace_id: i64,
    pub category_id: i64,
    pub amount_minor: i64,
    pub month: i64,
    pub year: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategorySpending {
    pub category_id: i64,
    pub spent_minor: i64,
}
