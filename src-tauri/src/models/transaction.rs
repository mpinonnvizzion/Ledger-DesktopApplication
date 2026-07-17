use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransactionStatus {
    Uncleared,
    Cleared,
    Reconciled,
}

impl TransactionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransactionStatus::Uncleared => "uncleared",
            TransactionStatus::Cleared => "cleared",
            TransactionStatus::Reconciled => "reconciled",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "uncleared" => Some(TransactionStatus::Uncleared),
            "cleared" => Some(TransactionStatus::Cleared),
            "reconciled" => Some(TransactionStatus::Reconciled),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransactionSource {
    Manual,
    Import,
    Plaid,
}

impl TransactionSource {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransactionSource::Manual => "manual",
            TransactionSource::Import => "import",
            TransactionSource::Plaid => "plaid",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "manual" => Some(TransactionSource::Manual),
            "import" => Some(TransactionSource::Import),
            "plaid" => Some(TransactionSource::Plaid),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Income,
    Expense,
}

#[derive(Debug, Clone, Serialize)]
pub struct Transaction {
    pub id: i64,
    pub workspace_id: i64,
    pub account_id: i64,
    pub category_id: Option<i64>,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub notes: Option<String>,
    pub status: TransactionStatus,
    pub source: TransactionSource,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTransactionInput {
    pub workspace_id: i64,
    pub account_id: i64,
    pub category_id: Option<i64>,
    pub amount_minor: i64,
    pub description: String,
    pub date: String,
    pub notes: Option<String>,
    pub status: Option<TransactionStatus>,
    pub source: Option<TransactionSource>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTransactionInput {
    pub account_id: Option<i64>,
    pub category_id: Option<Option<i64>>,
    pub amount_minor: Option<i64>,
    pub description: Option<String>,
    pub date: Option<String>,
    pub notes: Option<Option<String>>,
    pub status: Option<TransactionStatus>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub workspace_id: i64,
    pub account_id: Option<i64>,
    pub category_id: Option<i64>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub search: Option<String>,
    pub amount_min: Option<i64>,
    pub amount_max: Option<i64>,
    pub direction: Option<Direction>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TransactionListResult {
    pub transactions: Vec<Transaction>,
    pub total_count: i64,
}
