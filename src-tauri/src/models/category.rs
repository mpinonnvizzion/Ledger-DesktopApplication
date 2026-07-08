use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CategoryType {
    Income,
    Expense,
}

impl CategoryType {
    pub fn as_str(&self) -> &'static str {
        match self {
            CategoryType::Income => "income",
            CategoryType::Expense => "expense",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "income" => Some(CategoryType::Income),
            "expense" => Some(CategoryType::Expense),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Category {
    pub id: i64,
    pub workspace_id: i64,
    pub name: String,
    pub category_type: CategoryType,
    pub parent_id: Option<i64>,
    pub is_system: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCategoryInput {
    pub workspace_id: i64,
    pub name: String,
    pub category_type: CategoryType,
    pub parent_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryInput {
    pub name: Option<String>,
    pub parent_id: Option<i64>,
}
